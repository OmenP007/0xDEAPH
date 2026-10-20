from pathlib import Path

from django.db.models import Q
from django.http import FileResponse, Http404
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Paiement
from .serializers import PaiementSerializer

DOCS_DIRECTORY = Path(__file__).resolve().parent / "docs"
DOCS_FILES = {"index.html", "future_update.html"}


def serve_documentation(request, filename):
	if filename not in DOCS_FILES:
		raise Http404

	return FileResponse(
		(DOCS_DIRECTORY / filename).open("rb"),
		content_type="text/html; charset=utf-8",
	)


class PaiementListCreateView(ListCreateAPIView):
	serializer_class = PaiementSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return Paiement.objects.filter(
			Q(buyer=self.request.user) | Q(seller=self.request.user)
		).select_related("buyer", "seller")

	def perform_create(self, serializer):
		if self.request.user.role != "client":
			raise PermissionDenied("Seul un client peut initier un paiement.")
		serializer.save(buyer=self.request.user)
