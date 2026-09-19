from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from ..models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
)
from ..permissions import is_workspace_member
from ..serializers import WorkspaceChannelMessageSerializer


class WorkspaceChannelMessageListCreateView(
    generics.ListCreateAPIView
):
    lookup_url_kwarg = 'message_pk'
    serializer_class = WorkspaceChannelMessageSerializer

    def get_permissions(self):
        return [
            permissions.IsAuthenticated(),
        ]

    def get_channel(self):
        workspace = get_object_or_404(
            Workspace,
            pk=self.kwargs['workspace_pk'],
        )

        if not is_workspace_member(
            self.request.user,
            workspace.id,
        ):
            raise PermissionDenied(
                'You must be a workspace member.'
            )

        return get_object_or_404(
            WorkspaceChannel,
            pk=self.kwargs['channel_pk'],
            workspace=workspace,
        )

    def get_queryset(self):
        channel = self.get_channel()

        return (
            WorkspaceChannelMessage.objects
            .filter(channel=channel)
            .select_related('user', 'channel')
            .order_by('created')
        )

    def perform_create(self, serializer):
        channel = self.get_channel()

        serializer.save(
            channel=channel,
            user=self.request.user,
        )

class WorkspaceChannelMessageDetailView(
    generics.DestroyAPIView
):
    lookup_url_kwarg = 'message_pk'
    serializer_class = WorkspaceChannelMessageSerializer

    def get_channel(self):
        workspace = get_object_or_404(
            Workspace,
            pk=self.kwargs['workspace_pk'],
        )

        if not is_workspace_member(
            self.request.user,
            workspace.id,
        ):
            raise PermissionDenied(
                'You must be a workspace member.'
            )

        return get_object_or_404(
            WorkspaceChannel,
            pk=self.kwargs['channel_pk'],
            workspace=workspace,
        )

    def get_queryset(self):
        channel = self.get_channel()

        return WorkspaceChannelMessage.objects.filter(
            channel=channel,
        )

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied(
                'You can only delete your own messages.'
            )

        instance.delete()