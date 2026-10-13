import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import WorkspaceChannelMessage, WorkspaceChannelMessageReaction
from .serializers import WorkspaceChannelMessageSerializer

logger = logging.getLogger(__name__)


def _send_event(channel_id, payload):
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(
            f'workspace_channel_{channel_id}',
            {'type': 'realtime.event', 'payload': payload},
        )
    except Exception:
        # A broker outage must not turn a successfully persisted REST write
        # into an apparent failure. Reconnecting clients sync via REST.
        logger.exception('Unable to broadcast channel %s event.', channel_id)


def _broadcast_current_message(message_id, channel_id, event_type):
    def send_after_commit():
        message = (
            WorkspaceChannelMessage.objects
            .filter(pk=message_id, channel_id=channel_id)
            .select_related('user', 'channel')
            .prefetch_related('reactions__user')
            .first()
        )
        if message is not None:
            _send_event(channel_id, {
                'type': event_type,
                'message': WorkspaceChannelMessageSerializer(message).data,
            })

    transaction.on_commit(send_after_commit)


@receiver(post_save, sender=WorkspaceChannelMessage)
def broadcast_message_save(sender, instance, created, **kwargs):
    _broadcast_current_message(
        instance.pk,
        instance.channel_id,
        'message.created' if created else 'message.updated',
    )


@receiver(post_delete, sender=WorkspaceChannelMessage)
def broadcast_message_delete(sender, instance, **kwargs):
    channel_id = instance.channel_id
    message_id = instance.pk
    transaction.on_commit(lambda: _send_event(channel_id, {
        'type': 'message.deleted',
        'message_id': message_id,
    }))


def _broadcast_reaction_change(message_id):
    channel_id = WorkspaceChannelMessage.objects.filter(
        pk=message_id,
    ).values_list('channel_id', flat=True).first()
    if channel_id is not None:
        _broadcast_current_message(message_id, channel_id, 'message.updated')


@receiver(post_save, sender=WorkspaceChannelMessageReaction)
def broadcast_reaction_save(sender, instance, **kwargs):
    _broadcast_reaction_change(instance.message_id)


@receiver(post_delete, sender=WorkspaceChannelMessageReaction)
def broadcast_reaction_delete(sender, instance, **kwargs):
    _broadcast_reaction_change(instance.message_id)
