import hashlib
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    APIKey,
    Dispute,
    KYCVerification,
    Offer,
    Paiement,
    PlatformSettings,
    User,
    WalletTransaction,
)


# ─── Inscription & Auth Développeur ───────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    """Profil public de l'utilisateur connecté."""

    is_kyc_approved = serializers.SerializerMethodField()
    kyc_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "full_name",
            "phone",
            "is_staff",
            "is_kyc_approved",
            "kyc_status",
        )
        read_only_fields = ("id", "username", "role", "is_staff", "is_kyc_approved", "kyc_status")

    def get_is_kyc_approved(self, obj: User) -> bool:
        return obj.is_kyc_approved()

    def get_kyc_status(self, obj: User) -> str:
        return obj.kyc.status if hasattr(obj, "kyc") else "UNVERIFIED"


class PasswordChangeSerializer(serializers.Serializer):
    """Changement de mot de passe de l'utilisateur connecté."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value: str) -> str:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password2": "Les mots de passe ne correspondent pas."}
            )
        if attrs["new_password"] == attrs["old_password"]:
            raise serializers.ValidationError(
                {"new_password": "Le nouveau mot de passe doit être différent de l'actuel."}
            )
        return attrs

    def save(self, **kwargs) -> User:
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Authentification JWT standard. Accepte username OU email et renvoie le
    profil complet pour éviter au frontend de deviner le rôle depuis le JWT.
    """

    def validate(self, attrs: dict) -> dict:
        identifier = str(attrs.get(self.username_field, "")).strip()
        if identifier and "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).only("username").first()
            if user:
                attrs[self.username_field] = user.username

        data = super().validate(attrs)
        user = self.user
        data.update({
            "role": user.role,
            "username": user.username,
            "email": user.email,
            "user_id": user.pk,
            "user": UserProfileSerializer(user).data,
        })
        return data

    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["is_kyc_approved"] = user.is_kyc_approved()
        return token


class DeveloperTokenObtainPairSerializer(EmailOrUsernameTokenObtainPairSerializer):
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
        queryset=User.objects.filter(role__in=["seller", "member", "client"]),
        required=False,
    )
    seller_username = serializers.CharField(write_only=True, required=False, allow_blank=False)
    buyer_username   = serializers.CharField(source="buyer.username", read_only=True)
    buyer_name       = serializers.CharField(read_only=True)
    seller_name      = serializers.CharField(read_only=True)
    reference        = serializers.CharField(read_only=True)
    offer_code       = serializers.CharField(source="offer.code", read_only=True, allow_null=True)
    role_current_user = serializers.SerializerMethodField()
    dispute_reason   = serializers.CharField(read_only=True)

    class Meta:
        model  = Paiement
        fields = (
            "id",
            "reference",
            "offer",
            "offer_code",
            "item_title",
            "item_description",
            "delivery_terms",
            "initiator_role",
            "delivery_otp",
            "buyer",
            "buyer_username",
            "buyer_name",
            "seller",
            "seller_username",
            "seller_name",
            "amount",
            "currency",
            "commission_rate",
            "fee_amount",
            "net_amount",
            "status",
            "escrow_id",
            "provider_reference",
            "checkout_url",
            "role_current_user",
            "blocked_at",
            "auto_release_at",
            "dispute_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reference",
            "offer",
            "offer_code",
            "delivery_otp",
            "buyer",
            "buyer_username",
            "buyer_name",
            "seller_name",
            "currency",
            "commission_rate",
            "fee_amount",
            "net_amount",
            "status",
            "escrow_id",
            "provider_reference",
            "checkout_url",
            "role_current_user",
            "blocked_at",
            "auto_release_at",
            "dispute_reason",
            "created_at",
            "updated_at",
        )

    def get_role_current_user(self, obj: Paiement) -> str | None:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if obj.buyer_id == request.user.pk:
            return "buyer"
        if obj.seller_id == request.user.pk:
            return "seller"
        return None

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
        # seller_username est write_only à la création mais utile en lecture.
        data["seller_username"] = instance.seller.username
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

    def validate(self, attrs: dict) -> dict:
        seller_username = attrs.pop("seller_username", None)
        if seller_username:
            seller = User.objects.filter(
                username=seller_username,
                role__in=["seller", "member", "client"],
            ).first()
            if seller is None:
                raise serializers.ValidationError(
                    {"seller_username": "Aucun vendeur ne correspond à ce nom d'utilisateur."}
                )
            if "seller" in attrs and attrs["seller"] != seller:
                raise serializers.ValidationError(
                    {"seller_username": "Le nom d'utilisateur ne correspond pas au vendeur indiqué."}
                )
            attrs["seller"] = seller

        if "seller" not in attrs:
            raise serializers.ValidationError(
                {"seller_username": "Veuillez renseigner le nom d'utilisateur du vendeur."}
            )
        attrs["seller"] = self.validate_seller(attrs["seller"])
        return attrs


class PaiementStatusSerializer(serializers.ModelSerializer):
    """Serializer dédié au changement de statut d'un paiement."""

    class Meta:
        model  = Paiement
        fields = ("id", "status", "escrow_id", "provider_reference", "updated_at")
        read_only_fields = ("id", "escrow_id", "provider_reference", "updated_at")

    def validate_status(self, new_status: str) -> str:
        paiement: Paiement = self.instance
        if paiement and not paiement.can_transition_to(new_status):
            raise serializers.ValidationError(
                f"Transition {paiement.status} → {new_status} non autorisée."
            )
        return new_status


class GeniusPayRefundSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
    )
    reason = serializers.CharField(required=False, allow_blank=True, max_length=200)


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
    paiement_reference = serializers.CharField(source="paiement.reference", read_only=True)
    paiement_title     = serializers.CharField(source="paiement.item_title", read_only=True)
    paiement_amount    = serializers.DecimalField(
        source="paiement.amount", max_digits=12, decimal_places=2, read_only=True
    )
    paiement_status    = serializers.CharField(source="paiement.status", read_only=True)
    buyer_username     = serializers.CharField(source="paiement.buyer.username", read_only=True)
    seller_username    = serializers.CharField(source="paiement.seller.username", read_only=True)

    class Meta:
        model  = Dispute
        fields = (
            "id",
            "paiement",
            "paiement_reference",
            "paiement_title",
            "paiement_amount",
            "paiement_status",
            "buyer_username",
            "seller_username",
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
            "paiement_reference",
            "paiement_title",
            "paiement_amount",
            "paiement_status",
            "buyer_username",
            "seller_username",
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
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email    = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model  = KYCVerification
        fields = (
            "id",
            "user",
            "user_username",
            "user_email",
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
            "user",
            "user_username",
            "user_email",
            "status",
            "rejection_reason",
            "submitted_at",
            "reviewed_at",
        )

    def to_internal_value(self, data):
        # Compatibilité avec les anciens clients qui envoyaient CNI / PASSPORT / PERMIS.
        if hasattr(data, "copy"):
            data = data.copy()
            aliases = {
                "CNI": "cni",
                "PASSPORT": "passport",
                "PERMIS": "driving_license",
                "PERMIS_DE_CONDUIRE": "driving_license",
                "DRIVING_LICENSE": "driving_license",
            }
            raw_type = data.get("id_type")
            if isinstance(raw_type, str):
                data["id_type"] = aliases.get(raw_type.strip().upper(), raw_type.strip().lower())
        return super().to_internal_value(data)

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


# ─── Portefeuille interne ────────────────────────────────────────────────────

class WalletTransactionSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WalletTransaction
        fields = (
            "id",
            "reference",
            "type",
            "type_label",
            "amount",
            "fee",
            "method",
            "method_label",
            "phone",
            "beneficiary_name",
            "status",
            "status_label",
            "provider_reference",
            "failure_reason",
            "created_at",
            "completed_at",
        )
        read_only_fields = fields


class WalletMovementCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("1000.00"))
    method = serializers.ChoiceField(choices=[c[0] for c in WalletTransaction.METHOD_CHOICES])
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    beneficiary_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        if attrs["method"] in ("WAVE", "ORANGE_MONEY", "MTN_MOMO") and not attrs.get("phone"):
            raise serializers.ValidationError(
                {"phone": "Le numéro Mobile Money est requis pour ce moyen de paiement."}
            )
        return attrs


# ─── Configuration plateforme ────────────────────────────────────────────────

class PlatformSettingsSerializer(serializers.ModelSerializer):
    commission_rate_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.00"), max_value=Decimal("100.00")
    )

    class Meta:
        model = PlatformSettings
        fields = (
            "auto_release_delay_days",
            "commission_rate_percent",
            "min_escrow_amount",
            "maintenance_mode",
            "announcement",
            "updated_at",
        )
        read_only_fields = ("updated_at",)

    def validate_auto_release_delay_days(self, value: int) -> int:
        if value < 1 or value > 30:
            raise serializers.ValidationError("Le délai doit être compris entre 1 et 30 jours.")
        return value

    def validate_announcement(self, value):
        if value in (None, {}):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("L'annonce doit être un objet JSON.")
        return value
