"""
Permissions personnalisées pour l'API 0xSeq.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsClient(BasePermission):
    """Seuls les utilisateurs avec le rôle 'client' passent."""
    message = "Seul un client peut effectuer cette action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "client")


class IsSeller(BasePermission):
    """Seuls les utilisateurs avec le rôle 'seller' passent."""
    message = "Seul un vendeur peut effectuer cette action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "seller")


class IsDeveloper(BasePermission):
    """Seuls les utilisateurs avec le rôle 'developer' (ou admin) passent."""
    message = "Accès réservé aux développeurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "developer" or request.user.role == "deaph" or request.user.is_staff)
        )


class IsAdmin(BasePermission):
    """Seuls les utilisateurs avec le rôle 'deaph' (admin) ou is_staff passent."""
    message = "Action réservée aux administrateurs."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "deaph" or request.user.is_staff)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Lecture autorisée pour les propriétaires (buyer ou seller).
    Modification/suppression réservée aux administrateurs.
    """
    message = "Vous n'avez pas accès à cette ressource."

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.role == "deaph":
            return True
        # L'objet doit exposer buyer ou seller, ou appartenir directement à l'utilisateur.
        if hasattr(obj, "buyer") and hasattr(obj, "seller"):
            return obj.buyer == request.user or obj.seller == request.user
        if hasattr(obj, "user"):
            return obj.user == request.user
        return False
