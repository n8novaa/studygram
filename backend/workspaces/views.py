from rest_framework import permissions, viewsets

from .models import Workspace, WorkspaceMembership
from .permissions import (
    IsWorkspaceEditor,
    IsWorkspaceMember,
    IsWorkspaceOwner,
)
from .serializers import WorkspaceSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            Workspace.objects
            .filter(memberships__user=user)
            .select_related('owner')
            .prefetch_related('memberships__user')
            .distinct()
        )

    def get_permissions(self):
        if self.action in ('retrieve', 'list'):
            permission_classes = [
                permissions.IsAuthenticated,
                IsWorkspaceMember,
            ]

        elif self.action in ('update', 'partial_update'):
            permission_classes = [
                permissions.IsAuthenticated,
                IsWorkspaceEditor,
            ]

        elif self.action == 'destroy':
            permission_classes = [
                permissions.IsAuthenticated,
                IsWorkspaceOwner,
            ]

        else:
            permission_classes = [
                permissions.IsAuthenticated,
            ]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        workspace = serializer.save(
            owner=self.request.user
        )

        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceMembership.Role.ADMIN,
        )