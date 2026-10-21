import hashlib

from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import APIKey, Dispute, KYCVerification, Paiement, User


# ─── Inscription & Auth Développeur ───────────────────────────────────────────

class DeveloperTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Authentification JWT réservée aux développeurs.
    Refuse les comptes qui ne disposent pas du rôle developer (ou admin).
    """

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        if self.user.role not in ("developer", "deaph") and not self.user.is_staff:
            raise serializers.ValidationError(
                {"detail": "Accès refusé : Ce compte n'est pas un compte développeur."}
            )
        data["role"] = self.user.role
        data["username"] = self.user.username
        return data


class DeveloperRegistrationSerializer(serializers.ModelSerializer):
    """Inscription dédiée aux développeurs (attribue automatiquement le rôle developer)."""
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label="Confirmation du mot de passe")

    class Meta:
        model  = User
        fields = ("username", "email", "password", "password2")

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data["role"] = "developer"
        return User.objects.create_user(**validated_data)


# ─── Inscription ──────────────────────────────────────────────────────────────

class UserRegistrationSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label="Confirmation du mot de passe")

    class Meta:
        model  = User
        fields = ("username", "email", "role", "password", "password2")

    def validate_role(self, role: str) -> str:
        # Les rôles admin/staff ne peuvent pas être choisis à l'inscription.
        if role in ("deaph",):
            raise serializers.ValidationError("Ce rôle ne peut pas être attribué à l'inscription.")
        return role

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(**validated_data)


# ─── Paiement ─────────────────────────────────────────────────────────────────

class PaiementSerializer(serializers.ModelSerializer):
    seller = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="seller")
    )

    class Meta:
        model  = Paiement
        fields = (
            "id",
            "buyer",
            "seller",
            "amount",
            "currency",
            "commission_rate",
            "fee_amount",
            "net_amount",
            "status",
            "escrow_id",
            "auto_release_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "buyer",
            "currency",
            "commission_rate",
            "fee_amount",
            "net_amount",
            "status",
            "escrow_id",
            "auto_release_at",
            "created_at",
            "updated_at",
        )

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à zéro.")
        # Montant maximum : 100 000 000 FCFA (100 millions)
        if amount > 100_000_000:
            raise serializers.ValidationError(
                "Le montant dépasse la limite autorisée par transaction (100 000 000 FCFA)."
            )
        return amount

    def validate_seller(self, seller: User) -> User:
        request = self.context.get("request")
        if request and seller == request.user:
            raise serializers.ValidationError("Tu ne peux pas être ton propre vendeur.")
        return seller


class PaiementStatusSerializer(serializers.ModelSerializer):
    """Serializer dédié au changement de statut d'un paiement."""

    class Meta:
        model  = Paiement
        fields = ("id", "status", "escrow_id", "updated_at")
        read_only_fields = ("id", "escrow_id", "updated_at")

    def validate_status(self, new_status: str) -> str:
        paiement: Paiement = self.instance
        if paiement and not paiement.can_transition_to(new_status):
            raise serializers.ValidationError(
                f"Transition {paiement.status} → {new_status} non autorisée."
            )
        return new_status


# ─── Clé API ──────────────────────────────────────────────────────────────────

class APIKeyCreateSerializer(serializers.ModelSerializer):
    """
    Utilisé uniquement à la création — affiche le secret en clair une seule fois.
    """
    secret = serializers.CharField(read_only=True)

    class Meta:
        model  = APIKey
        fields = ("id", "name", "scopes", "expires_at", "secret", "created_at")
        read_only_fields = ("id", "secret", "created_at")

    def validate_scopes(self, scopes: list) -> list:
        valid = {choice[0] for choice in APIKey.SCOPE_CHOICES}
        invalid = set(scopes) - valid
        if invalid:
            raise serializers.ValidationError(f"Scopes invalides : {', '.join(invalid)}")
        return scopes

    def create(self, validated_data: dict) -> APIKey:
        raw_key  = APIKey.generate_secret()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix   = raw_key[:20]

        api_key = APIKey.objects.create(
            **validated_data,
            prefix=prefix,
            key_hash=key_hash,
        )
        # On attache le secret brut pour qu'il soit retourné une seule fois.
        api_key.secret = raw_key  # type: ignore[attr-defined]
        return api_key


class APIKeySerializer(serializers.ModelSerializer):
    """Lecture seule — ne retourne jamais le secret."""

    class Meta:
        model  = APIKey
        fields = ("id", "name", "prefix", "scopes", "is_active", "expires_at", "last_used", "created_at")
        read_only_fields = fields


# ─── Litiges (Disputes) ───────────────────────────────────────────────────────

class DisputeSerializer(serializers.ModelSerializer):
    opened_by_username = serializers.CharField(source="opened_by.username", read_only=True)

    class Meta:
        model  = Dispute
        fields = (
            "id",
            "paiement",
            "opened_by",
            "opened_by_username",
            "reason",
            "details",
            "status",
            "resolution_notes",
            "created_at",
            "resolved_at",
        )
        read_only_fields = (
            "id",
            "paiement",
            "opened_by",
            "opened_by_username",
            "status",
            "resolution_notes",
            "created_at",
            "resolved_at",
        )


class DisputeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Dispute
        fields = ("reason", "details")


class DisputeResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["release", "refund"])
    resolution_notes = serializers.CharField(required=False, allow_blank=True, default="")


# ─── Module KYC (Know Your Customer) ──────────────────────────────────────────

class KYCVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = KYCVerification
        fields = (
            "id",
            "id_type",
            "id_number",
            "full_name",
            "document_url",
            "status",
            "rejection_reason",
            "submitted_at",
            "reviewed_at",
        )
        read_only_fields = (
            "id",
            "status",
            "rejection_reason",
            "submitted_at",
            "reviewed_at",
        )

    def validate_document_url(self, value: str) -> str:
        if value:
            val = value.strip().lower()
            if any(forbidden in val for forbidden in ["javascript:", "data:", "file:", "vbscript:"]):
                raise serializers.ValidationError("Protocole non sécurisé ou interdit.")
            if not (val.startswith("https://") or val.startswith("http://") or val.startswith("/media/")):
                raise serializers.ValidationError(
                    "L'URL du document doit débuter par https:// ou /media/."
                )
        return value



class KYCReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")

