from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import PermissionDenied

from ..models import Workspace, WorkspaceChannel
from ..permissions import IsWorkspaceAdmin, is_workspace_member
from ..serializers import (
    WorkspaceChannelSerializer,
)


class WorkspaceChannelListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = WorkspaceChannelSerializer

    def get_workspace(self):
        return get_object_or_404(
            Workspace,
            pk=self.kwargs['workspace_pk'],
        )

    def get_permissions(self):
        if self.request.method == 'POST':
            return [
                permissions.IsAuthenticated(),
                IsWorkspaceAdmin(),
            ]

        return [
            permissions.IsAuthenticated(),
        ]

    def get_queryset(self):
        workspace = self.get_workspace()

        if not is_workspace_member(
            self.request.user,
            workspace.id,
        ):
            raise PermissionDenied(
                'You must be a workspace member.'
            )

        return (
            WorkspaceChannel.objects
            .filter(workspace=workspace)
            .select_related('created_by')
            .order_by('created')
        )

    def perform_create(self, serializer):
        workspace = self.get_workspace()

        if WorkspaceChannel.objects.filter(
            workspace=workspace,
            name=serializer.validated_data["name"],
        ).exists():
            raise serializers.ValidationError(
                {
                    "name": (
                        "A channel with this name "
                        "already exists in this workspace."
                    )
                }
            )

        serializer.save(
            workspace=workspace,
            created_by=self.request.user,
        )

class WorkspaceChannelDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    lookup_url_kwarg = 'channel_pk'
    serializer_class = WorkspaceChannelSerializer

    def get_workspace(self):
        return get_object_or_404(
            Workspace,
            pk=self.kwargs['workspace_pk'],
        )

    def get_queryset(self):
        workspace = self.get_workspace()

        if not is_workspace_member(
            self.request.user,
            workspace.id,
        ):
            raise PermissionDenied(
                'You must be a workspace member.'
            )

        return (
            WorkspaceChannel.objects
            .filter(workspace=workspace)
            .select_related('created_by')
        )

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [
                permissions.IsAuthenticated(),
                IsWorkspaceAdmin(),
            ]

        return [
            permissions.IsAuthenticated(),
        ]

    def perform_update(self, serializer):
        workspace = self.get_workspace()
        new_name = serializer.validated_data.get(
            "name",
            serializer.instance.name,
        )

        if WorkspaceChannel.objects.filter(
            workspace=workspace,
            name=new_name,
        ).exclude(
            pk=serializer.instance.pk,
        ).exists():
            raise serializers.ValidationError(
                {
                    "name": (
                        "A channel with this name "
                        "already exists in this workspace."
                    )
                }
            )

        serializer.save()

