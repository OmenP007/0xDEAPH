import hashlib

from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import APIKey, Dispute, KYCVerification, Offer, Paiement, User


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
        # Le rôle developer est réservé à /api/developer/register/
        if role in ("deaph", "developer"):
            raise serializers.ValidationError("Ce rôle ne peut pas être attribué à l'inscription.")
        return role

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(**validated_data)


# ─── Offres & Liens de Paiement (Paylinks) ────────────────────────────────────

class OfferSerializer(serializers.ModelSerializer):
    seller_username     = serializers.CharField(source="seller.username", read_only=True)
    seller_kyc_approved = serializers.SerializerMethodField()
    seller_kyc_status   = serializers.SerializerMethodField()
    pay_url             = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = (
            "id",
            "code",
            "title",
            "description",
            "amount",
            "currency",
            "delivery_terms",
            "is_active",
            "seller",
            "seller_username",
            "seller_kyc_approved",
            "seller_kyc_status",
            "pay_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "code",
            "seller",
            "seller_username",
            "seller_kyc_approved",
            "seller_kyc_status",
            "pay_url",
            "created_at",
            "updated_at",
        )

    def get_seller_kyc_approved(self, obj: Offer) -> bool:
        return obj.seller.is_kyc_approved()

    def get_seller_kyc_status(self, obj: Offer) -> str:
        if hasattr(obj.seller, "kyc"):
            return obj.seller.kyc.status
        return "UNVERIFIED"

    def get_pay_url(self, obj: Offer) -> str:
        request = self.context.get("request")
        path = f"/pay/{obj.code}"
        if request:
            return request.build_absolute_uri(path)
        return path

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à zéro.")
        if amount > 100_000_000:
            raise serializers.ValidationError("Le montant dépasse la limite autorisée (100 000 000 FCFA).")
        return amount


class OfferPublicSerializer(serializers.ModelSerializer):
    """Vue publique d'une offre pour un acheteur ouvrant un lien (WhatsApp / Réseaux sociaux)."""
    seller_username     = serializers.CharField(source="seller.username", read_only=True)
    seller_kyc_approved = serializers.SerializerMethodField()
    seller_kyc_status   = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = (
            "code",
            "title",
            "description",
            "amount",
            "currency",
            "delivery_terms",
            "is_active",
            "seller_username",
            "seller_kyc_approved",
            "seller_kyc_status",
            "created_at",
        )

    def get_seller_kyc_approved(self, obj: Offer) -> bool:
        return obj.seller.is_kyc_approved()

    def get_seller_kyc_status(self, obj: Offer) -> str:
        if hasattr(obj.seller, "kyc"):
            return obj.seller.kyc.status
        return "UNVERIFIED"


class OfferCheckoutSerializer(serializers.Serializer):
    """Données optionnelles transmises par l'acheteur lors du règlement du Paylink."""
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Instructions de livraison éventuelles."
    )


class ConfirmDeliverySerializer(serializers.Serializer):
    """Validation de la livraison physique par code OTP à 6 chiffres."""
    otp = serializers.CharField(
        max_length=6,
        min_length=6,
        required=False,
        allow_blank=True,
        help_text="Code OTP secret à 6 chiffres fourni par l'acheteur au livreur/vendeur."
    )


# ─── Paiement ─────────────────────────────────────────────────────────────────

class PaiementSerializer(serializers.ModelSerializer):
    seller = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=["seller", "member", "client"])
    )

    class Meta:
        model  = Paiement
        fields = (
            "id",
            "offer",
            "item_title",
            "item_description",
            "initiator_role",
            "delivery_otp",
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
            "offer",
            "delivery_otp",
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

    def to_representation(self, instance):
        """
        Masque le delivery_otp pour tout le monde sauf l'acheteur.
        Le code OTP ne doit être visible que par l'acheteur qui doit le transmettre
        au livreur/vendeur pour validation de livraison. Le laisser accessible
        au vendeur via l'API briserait entièrement la mécanique de sécurité OTP.
        """
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or request.user != instance.buyer:
            data.pop("delivery_otp", None)
        return data

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
            # http:// interdit : les documents KYC doivent transiter en HTTPS uniquement
            if not (val.startswith("https://") or val.startswith("/media/")):
                raise serializers.ValidationError(
                    "L'URL du document doit débuter par https:// ou /media/."
                )
        return value



class KYCReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")

