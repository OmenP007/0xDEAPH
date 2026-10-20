from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Paiement


User = get_user_model()


class PaiementApiTests(APITestCase):
	def setUp(self):
		self.buyer = User.objects.create_user(
			username="buyer", password="test-password", role="client"
		)
		self.seller = User.objects.create_user(
			username="seller", password="test-password", role="seller"
		)

	def test_create_uses_logged_in_buyer_and_default_status(self):
		self.client.force_authenticate(user=self.buyer)

		response = self.client.post(
			"/api/payments/",
			{
				"buyer": self.seller.pk,
				"seller": self.seller.pk,
				"amount": "25.00",
				"status": "RELEASED",
				"escrow_id": "client-supplied-id",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		payment = Paiement.objects.get()
		self.assertEqual(payment.buyer, self.buyer)
		self.assertEqual(payment.status, "CREATED")
		self.assertEqual(payment.escrow_id, "")

	def test_list_only_shows_payments_involving_logged_in_user(self):
		other_buyer = User.objects.create_user(
			username="other-buyer", password="test-password", role="client"
		)
		other_seller = User.objects.create_user(
			username="other-seller", password="test-password", role="seller"
		)
		visible_payment = Paiement.objects.create(
			buyer=self.buyer, seller=self.seller, amount="25.00"
		)
		Paiement.objects.create(
			buyer=other_buyer, seller=other_seller, amount="40.00"
		)
		self.client.force_authenticate(user=self.buyer)

		response = self.client.get("/api/payments/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["id"], visible_payment.pk)

	def test_seller_cannot_create_payment(self):
		another_seller = User.objects.create_user(
			username="another-seller", password="test-password", role="seller"
		)
		self.client.force_authenticate(user=self.seller)

		response = self.client.post(
			"/api/payments/",
			{"seller": another_seller.pk, "amount": "25.00"},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(Paiement.objects.count(), 0)
