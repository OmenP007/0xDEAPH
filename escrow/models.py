import secrets
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


# ─── Utilisateur ──────────────────────────────────────────────────────────────

class User(AbstractUser):
    id = models.BigAutoField(primary_key=True)

    ROLE_USERS = [
        ("member", "Membre"),
        ("deaph",  "Admin"),
        ("client", "Client"),
        ("seller", "Vendeur"),
        ("developer", "Développeur"),
    ]

    role = models.CharField(
        max_length=10,
        choices=ROLE_USERS,
        default="member",
    )

    def is_kyc_approved(self) -> bool:
        """Indique si l'utilisateur a un profil KYC validé."""
        return hasattr(self, "kyc") and self.kyc.status == "APPROVED"

    def __str__(self):
        return self.username


# ─── Offre & Lien de Paiement (Paylink Initié par le Vendeur) ─────────────────

class Offer(models.Model):
    seller         = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="offers",
        help_text="Vendeur ayant créé l'offre"
    )
    code           = models.CharField(
        max_length=24,
        unique=True,
        db_index=True,
        help_text="Identifiant public unique et opaque (ex: OFF-A1B2-C3D4)"
    )
    title          = models.CharField(max_length=180, help_text="Titre du produit ou service")
    description    = models.TextField(blank=True, default="", help_text="Description détaillée de l'offre")
    amount         = models.DecimalField(max_digits=12, decimal_places=2, help_text="Prix en FCFA")
    currency       = models.CharField(max_length=5, default="XOF", help_text="Devise (XOF / FCFA)")
    delivery_terms = models.TextField(blank=True, default="Livraison sous 48h contre validation de réception ou code OTP.")
    is_active      = models.BooleanField(default=True, help_text="Indique si le lien de paiement est actif")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    @staticmethod
    def generate_code() -> str:
        """Génère une référence opaque unique et lisible, ex: OFF-82A1-9F2B"""
        part1 = secrets.token_hex(2).upper()
        part2 = secrets.token_hex(2).upper()
        return f"OFF-{part1}-{part2}"

    def save(self, *args, **kwargs):
        if not self.code:
            code = self.generate_code()
            while Offer.objects.filter(code=code).exists():
                code = self.generate_code()
            self.code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.code}] {self.title} — {self.amount} {self.currency} ({self.seller.username})"


# ─── Paiement séquestre ───────────────────────────────────────────────────────

class Paiement(models.Model):
    STATUS = [
        ("CREATED",  "Initié, En attente de paiement"),
        ("BLOCKED",  "Fonds bloqués sous séquestre"),
        ("DISPUTED", "En litige"),
        ("RELEASED", "Fonds libérés"),
        ("REFUNDED", "Remboursée"),
    ]

    INITIATOR_ROLES = [
        ("seller", "Vendeur"),
        ("buyer",  "Acheteur"),
    ]

    # Transitions autorisées : état actuel → états suivants possibles
    ALLOWED_TRANSITIONS: dict[str, list[str]] = {
        "CREATED":  ["BLOCKED"],
        "BLOCKED":  ["RELEASED", "REFUNDED", "DISPUTED"],
        "DISPUTED": ["RELEASED", "REFUNDED"],
        "RELEASED": [],
        "REFUNDED": [],
    }

    # Commission par défaut : 1.00% (0.01)
    DEFAULT_COMMISSION_RATE = Decimal("0.0100")
    # Délai de séquestre par défaut avant libération automatique : 3 jours
    AUTO_RELEASE_DELAY_DAYS = 3

    # Offre source si initié par un paylink
    offer            = models.ForeignKey(
        Offer,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="Offre source si initié via un Paylink vendeur."
    )
    # Instantané immuable des conditions convenues
    item_title       = models.CharField(max_length=180, blank=True, default="", help_text="Instantané immuable du produit/service.")
    item_description = models.TextField(blank=True, default="", help_text="Instantané immuable de la description.")
    initiator_role   = models.CharField(max_length=10, choices=INITIATOR_ROLES, default="buyer", help_text="Qui a initié la transaction.")
    delivery_otp     = models.CharField(max_length=6, blank=True, default="", help_text="Code OTP secret à 6 chiffres pour valider la livraison.")

    buyer            = models.ForeignKey(User, on_delete=models.PROTECT, related_name="purchase")
    seller           = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sales")
    amount           = models.DecimalField(max_digits=12, decimal_places=2, help_text="Montant brut payé par l'acheteur en FCFA.")
    currency         = models.CharField(max_length=5, default="XOF", help_text="Devise de la transaction (XOF / FCFA).")
    commission_rate  = models.DecimalField(max_digits=5, decimal_places=4, default=DEFAULT_COMMISSION_RATE, help_text="Taux de commission (ex: 0.0100 = 1%).")
    fee_amount       = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), help_text="Commission 0xSeq de 1% en FCFA.")
    net_amount       = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), help_text="Montant net reversé au vendeur en FCFA.")
    escrow_id        = models.CharField(max_length=255, blank=True)
    status           = models.CharField(max_length=10, choices=STATUS, default="CREATED")
    auto_release_at  = models.DateTimeField(null=True, blank=True, help_text="Date limite de libération automatique (3 jours après BLOCKED).")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    @staticmethod
    def generate_delivery_otp() -> str:
        """Génère un code secret à 6 chiffres aléatoire et cryptographiquement sûr."""
        return f"{secrets.randbelow(900000) + 100000}"

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])

    def calculate_fees(self):
        """Calcule automatiquement la commission de 1% et le net vendeur."""
        if self.amount is not None:
            amount = Decimal(str(self.amount))
            comm_rate = Decimal(str(self.commission_rate)) if self.commission_rate else self.DEFAULT_COMMISSION_RATE
            fee = (amount * comm_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            self.amount = amount
            self.fee_amount = fee
            self.net_amount = amount - fee

    def save(self, *args, **kwargs):
        self.calculate_fees()
        # Copie automatique du snapshot de l'offre si renseignée
        if self.offer:
            if not self.item_title:
                self.item_title = self.offer.title
            if not self.item_description:
                self.item_description = self.offer.description

        # Génération du code OTP de livraison s'il n'existe pas encore
        if not self.delivery_otp:
            self.delivery_otp = self.generate_delivery_otp()

        # Dès que le paiement passe à BLOCKED, on arme le timer de 3 jours d'auto-release
        if self.status == "BLOCKED" and not self.auto_release_at:
            self.auto_release_at = timezone.now() + timedelta(days=self.AUTO_RELEASE_DELAY_DAYS)
        # Si un litige est ouvert, on suspend l'auto-release
        elif self.status == "DISPUTED":
            self.auto_release_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.buyer} -> {self.seller} : {self.amount} {self.currency} ({self.status}) [Commission: {self.fee_amount} {self.currency}]"


# ─── Litiges (Disputes) ───────────────────────────────────────────────────────

class Dispute(models.Model):
    STATUS_CHOICES = [
        ("OPEN", "Litige ouvert"),
        ("UNDER_REVIEW", "En cours d'examen"),
        ("RESOLVED_RELEASE", "Résolu - Fonds libérés au vendeur"),
        ("RESOLVED_REFUND", "Résolu - Acheteur remboursé"),
    ]

    paiement         = models.OneToOneField(Paiement, on_delete=models.CASCADE, related_name="dispute")
    opened_by        = models.ForeignKey(User, on_delete=models.PROTECT, related_name="opened_disputes")
    reason           = models.CharField(max_length=200, help_text="Motif du litige (ex: Colis non reçu, Produit non conforme).")
    details          = models.TextField(help_text="Description détaillée du problème.")
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    resolution_notes = models.TextField(blank=True, default="")
    created_at       = models.DateTimeField(auto_now_add=True)
    resolved_at      = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Litige #{self.pk} sur Paiement #{self.paiement_id} ({self.status})"


# ─── Module KYC (Know Your Customer) ──────────────────────────────────────────

class KYCVerification(models.Model):
    ID_TYPES = [
        ("cni", "Carte Nationale d'Identité"),
        ("passport", "Passeport"),
        ("driving_license", "Permis de conduire"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "En attente de vérification"),
        ("APPROVED", "Approuvé"),
        ("REJECTED", "Rejeté"),
    ]

    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name="kyc")
    id_type          = models.CharField(max_length=20, choices=ID_TYPES)
    id_number        = models.CharField(max_length=100)
    full_name        = models.CharField(max_length=255)
    document_url     = models.CharField(max_length=500, blank=True, help_text="Lien ou identifiant de la pièce d'identité.")
    status           = models.CharField(max_length=15, choices=STATUS_CHOICES, default="PENDING")
    rejection_reason = models.TextField(blank=True, default="")
    submitted_at     = models.DateTimeField(auto_now_add=True)
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    reviewed_by      = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_kycs")

    def __str__(self):
        return f"KYC {self.user.username} ({self.get_id_type_display()}) — {self.status}"


# ─── Clé API pour intégrations externes ──────────────────────────────────────

class APIKey(models.Model):
    SCOPE_CHOICES = [
        ("payments:read",   "Lire les paiements"),
        ("payments:create", "Créer des paiements"),
        ("payments:refund", "Rembourser des paiements"),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    name       = models.CharField(max_length=100, help_text="Nom lisible pour identifier cette clé.")
    prefix     = models.CharField(max_length=20, editable=False)
    key_hash   = models.CharField(max_length=64, unique=True, editable=False)
    scopes     = models.JSONField(default=list, help_text="Liste de scopes accordés à cette clé.")
    is_active  = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used  = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def generate_secret() -> str:
        """Génère un secret aléatoire haute entropie (format 0xs_live_<token>)."""
        return f"0xs_live_{secrets.token_urlsafe(48)}"

    def __str__(self):
        return f"{self.user.username} — {self.name} ({self.prefix}…)"


# ─── Idempotence et Journal des Événements Webhooks ──────────────────────────

class WebhookEventLog(models.Model):
    STATUS_CHOICES = [
        ("PROCESSED", "Traité avec succès"),
        ("DUPLICATE", "Doublon ignoré"),
        ("FAILED", "Échec de traitement"),
    ]

    event_id    = models.CharField(max_length=150, unique=True, db_index=True, help_text="Identifiant unique de l'événement webhook")
    event_type  = models.CharField(max_length=100, help_text="Type d'événement (ex: payment.success)")
    payload     = models.JSONField(default=dict, help_text="Contenu brut du webhook reçu")
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PROCESSED")
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal Webhook"
        verbose_name_plural = "Journaux Webhooks"

    def __str__(self):
        return f"Webhook [{self.event_type}] {self.event_id} — {self.status}"

