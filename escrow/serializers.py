from rest_framework import serializers

from .models import Paiement, User


class PaiementSerializer(serializers.ModelSerializer):
    seller = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="seller")
    )

    class Meta:
        model = Paiement
        fields = ("id", "buyer", "seller", "amount", "status", "escrow_id", "created_at")
        read_only_fields = ("id", "buyer", "status", "escrow_id", "created_at")

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à zéro.")
        return amount

    def validate_seller(self, seller):
        if seller == self.context["request"].user:
            raise serializers.ValidationError("Tu ne peux pas être ton propre vendeur.")
        return seller