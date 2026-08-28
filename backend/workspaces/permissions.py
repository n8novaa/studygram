from rest_framework.permissions import BasePermission

from .models import WorkspaceMembership


class IsWorkspaceMember(BasePermission):
    """
    User must be a member of the workspace.
    """

    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(user=request.user).exists()


class IsWorkspaceEditor(BasePermission):
    """
    Owner and admins can modify the workspace.
    """

    def has_object_permission(self, request, view, obj):
        if obj.owner_id == request.user.id:
            return True

        return obj.memberships.filter(
            user=request.user,
            role=WorkspaceMembership.Role.ADMIN,
        ).exists()


class IsWorkspaceOwner(BasePermission):
    """
    Only the workspace owner can delete it.
    """

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id