from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import PaiementListCreateView, serve_documentation


urlpatterns = [
	path("api/payments/", PaiementListCreateView.as_view(), name="payment-list-create"),
	path("api/token/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
	path("api/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
	path(
		"docs/index.html",
		serve_documentation,
		{"filename": "index.html"},
		name="documentation",
	),
	path(
		"docs/future_update.html",
		serve_documentation,
		{"filename": "future_update.html"},
		name="update",
	),
]