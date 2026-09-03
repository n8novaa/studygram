from rest_framework.permissions import BasePermission

from .models import Workspace, WorkspaceMembership


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


class IsWorkspaceAdmin(BasePermission):
    """
    User must be an admin of the workspace.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = (
            view.kwargs.get("workspace_id")
            or view.kwargs.get("pk")
            or view.kwargs.get("workspace_pk")
        )

        if not workspace_id:
            return False

        # Workspace owner has admin privileges.
        if Workspace.objects.filter(
            id=workspace_id,
            owner=request.user,
        ).exists():
            return True

        # Workspace admins also have admin privileges.
        return WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=WorkspaceMembership.Role.ADMIN,
        ).exists()