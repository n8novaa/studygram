from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsHostOrReadOnly(BasePermission):
    """Allow edits on a room only to its host."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.host == request.user


class IsAuthorOrReadOnly(BasePermission):
    """Allow edits on a message only to its author."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.user == request.user
