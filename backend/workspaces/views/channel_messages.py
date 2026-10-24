from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.core import signing
from django.utils import timezone

from ..models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceChannelMessageReaction,
    WorkspaceChannelReadPosition,
)
from ..permissions import is_workspace_member
from ..serializers import WorkspaceChannelMessageSerializer
from ..consumers import TICKET_SALT


class WorkspaceChannelReadPositionSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(min_value=1)


class WorkspaceChannelReadPositionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_pk, channel_pk):
        workspace = get_object_or_404(Workspace, pk=workspace_pk)
        if not is_workspace_member(request.user, workspace.pk):
            raise PermissionDenied('You must be a workspace member.')
        channel = get_object_or_404(
            WorkspaceChannel, pk=channel_pk, workspace=workspace
        )
        payload = WorkspaceChannelReadPositionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        message_id = payload.validated_data['message_id']
        message = get_object_or_404(
            WorkspaceChannelMessage, pk=message_id, channel=channel
        )
        position, _ = WorkspaceChannelReadPosition.objects.get_or_create(
            user=request.user, channel=channel
        )
        # Monotonic update: concurrent visibility reports cannot move the
        # position backwards, and the stored integer survives message deletion.
        WorkspaceChannelReadPosition.objects.filter(
            pk=position.pk,
            last_viewed_message_id__lt=message.pk,
        ).update(last_viewed_message_id=message.pk, updated_at=timezone.now())
        position.refresh_from_db(fields=['last_viewed_message_id'])
        return Response({'last_viewed_message_id': position.last_viewed_message_id})


class WorkspaceChannelWebSocketTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_pk, channel_pk):
        workspace = get_object_or_404(Workspace, pk=workspace_pk)
        if not is_workspace_member(request.user, workspace.pk):
            raise PermissionDenied('You must be a workspace member.')

        channel = get_object_or_404(
            WorkspaceChannel,
            pk=channel_pk,
            workspace=workspace,
        )
        ticket = signing.dumps({
            'user_id': request.user.pk,
            'workspace_id': workspace.pk,
            'channel_id': channel.pk,
        }, salt=TICKET_SALT)
        response = Response({'ticket': ticket})
        response['Cache-Control'] = 'no-store'
        return response


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
            .select_related('user__profile', 'channel')
            .prefetch_related('reactions__user__profile')
            .order_by('created')
        )

    def perform_create(self, serializer):
        channel = self.get_channel()

        reply_to = serializer.validated_data.get('reply_to')

        if reply_to and reply_to.channel_id != channel.id:
            raise serializers.ValidationError(
                {
                    'reply_to': (
                        'You can only reply to a message '
                        'in the same channel.'
                    )
                }
            )

        serializer.save(
            channel=channel,
            user=self.request.user,
        )

class WorkspaceChannelMessageDetailView(
    generics.RetrieveUpdateDestroyAPIView
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

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied(
                'You can only edit your own messages.'
            )

        serializer.save()

    def perform_destroy(self, instance):
        if instance.user == self.request.user:
            instance.delete()
            return

        if (
            instance.channel.workspace.owner_id == self.request.user.id
            or instance.channel.workspace.memberships.filter(
                user=self.request.user,
                role='admin',
            ).exists()
        ):
            instance.delete()
            return

        raise PermissionDenied(
            'You can only delete your own messages.'
        )

class WorkspaceChannelMessageReactionView(
    generics.CreateAPIView,
    generics.DestroyAPIView,
):
    permission_classes = [permissions.IsAuthenticated]

    def get_message(self):
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

        channel = get_object_or_404(
            WorkspaceChannel,
            pk=self.kwargs['channel_pk'],
            workspace=workspace,
        )

        return get_object_or_404(
            WorkspaceChannelMessage,
            pk=self.kwargs['message_pk'],
            channel=channel,
        )

    def create(self, request, *args, **kwargs):
        message = self.get_message()

        emoji = request.data.get('emoji')

        if not emoji or not isinstance(emoji, str):
            raise serializers.ValidationError(
                {'emoji': 'An emoji is required.'}
            )

        emoji = emoji.strip()

        if not emoji:
            raise serializers.ValidationError(
                {'emoji': 'An emoji is required.'}
            )

        if len(emoji) > 32:
            raise serializers.ValidationError(
                {'emoji': 'Emoji reactions must be 32 characters or fewer.'}
            )

        reaction, created = (
            WorkspaceChannelMessageReaction.objects.update_or_create(
                message=message,
                user=request.user,
                defaults={'emoji': emoji},
            )
        )

        return Response(
            {
                'id': reaction.id,
                'message': message.id,
                'user': request.user.username,
                'emoji': reaction.emoji,
            },
            status=201 if created else 200,
        )

    def destroy(self, request, *args, **kwargs):
        message = self.get_message()

        reaction = get_object_or_404(
            WorkspaceChannelMessageReaction,
            message=message,
            user=request.user,
        )

        reaction.delete()

        return Response(status=204)
