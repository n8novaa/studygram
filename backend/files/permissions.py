from rest_framework.permissions import BasePermission
from workspaces.models import WorkspaceMembership


class IsWorkspaceFileMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = view.kwargs.get("workspace_pk")

        return WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
        ).exists()


class IsWorkspaceFileAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = view.kwargs.get("workspace_pk")

        return WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=WorkspaceMembership.Role.ADMIN,
        ).exists()