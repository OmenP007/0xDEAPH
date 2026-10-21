from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import APIKey, Dispute, KYCVerification, Paiement, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Profil", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Profil", {"fields": ("role",)}),)
    list_display = ("username", "email", "role", "is_active", "date_joined")
    list_filter  = ("role", "is_active", "is_staff")


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display   = ("id", "buyer", "seller", "amount", "fee_amount", "net_amount", "status", "escrow_id", "auto_release_at", "created_at")
    list_filter    = ("status", "created_at")
    search_fields  = ("buyer__username", "seller__username", "escrow_id")
    readonly_fields = ("commission_rate", "fee_amount", "net_amount", "escrow_id", "created_at", "updated_at")

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
