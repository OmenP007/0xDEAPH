from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Paiement, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
	fieldsets = UserAdmin.fieldsets + (("Profil", {"fields": ("role",)}),)
	add_fieldsets = UserAdmin.add_fieldsets + (("Profil", {"fields": ("role",)}),)


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
	list_display = ("id", "buyer", "seller", "amount", "status", "created_at")
	list_filter = ("status", "created_at")
	search_fields = ("buyer__username", "seller__username", "escrow_id")
