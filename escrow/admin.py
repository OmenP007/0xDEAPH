from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    APIKey,
    Dispute,
    KYCVerification,
    Paiement,
    PlatformSettings,
    User,
    WalletTransaction,
    WebhookEventLog,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Profil", {"fields": ("role", "full_name", "phone")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Profil", {"fields": ("role", "full_name", "phone")}),)
    list_display = ("username", "email", "role", "is_active", "date_joined")
    list_filter  = ("role", "is_active", "is_staff")


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display   = ("id", "buyer", "seller", "amount", "fee_amount", "net_amount", "status", "provider_reference", "auto_release_at", "created_at")
    list_filter    = ("status", "created_at")
    search_fields  = ("buyer__username", "seller__username", "provider_reference")
    readonly_fields = ("commission_rate", "fee_amount", "net_amount", "provider_reference", "checkout_url", "created_at", "updated_at")

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display  = ("id", "paiement", "opened_by", "reason", "status", "created_at", "resolved_at")
    list_filter   = ("status", "created_at")
    search_fields = ("paiement__id", "opened_by__username", "reason")


@admin.register(KYCVerification)
class KYCVerificationAdmin(admin.ModelAdmin):
    list_display  = ("user", "id_type", "id_number", "full_name", "status", "submitted_at", "reviewed_at")
    list_filter   = ("status", "id_type")
    search_fields = ("user__username", "full_name", "id_number")


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display   = ("user", "name", "prefix", "is_active", "expires_at", "last_used", "created_at")
    list_filter    = ("is_active",)
    search_fields  = ("user__username", "name", "prefix")
    readonly_fields = ("prefix", "key_hash", "last_used", "created_at")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "type", "amount", "method", "status", "created_at", "completed_at")
    list_filter = ("type", "method", "status")
    search_fields = ("reference", "user__username", "phone", "provider_reference")
    readonly_fields = ("reference", "created_at", "completed_at")


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("auto_release_delay_days", "commission_rate_percent", "min_escrow_amount", "maintenance_mode", "updated_at")

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WebhookEventLog)
class WebhookEventLogAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event_type", "status", "created_at")
    list_filter = ("status", "event_type")
    search_fields = ("event_id", "event_type")
    readonly_fields = ("event_id", "event_type", "payload", "status", "created_at")
