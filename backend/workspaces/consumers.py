import asyncio
from datetime import timedelta
from urllib.parse import parse_qs
from uuid import uuid4

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core import signing
from django.utils import timezone

from .models import WorkspaceChannel, WorkspacePresenceConnection


TICKET_SALT = 'workspaces.channel.websocket-ticket'
TICKET_MAX_AGE_SECONDS = 60
PRESENCE_TTL_SECONDS = 90
PRESENCE_HEARTBEAT_SECONDS = 30


@database_sync_to_async
def validate_ticket(ticket, workspace_id, channel_id):
    try:
        payload = signing.loads(
            ticket,
            salt=TICKET_SALT,
            max_age=TICKET_MAX_AGE_SECONDS,
        )
        user_id = int(payload['user_id'])
        if payload['workspace_id'] != workspace_id or payload['channel_id'] != channel_id:
            return None
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        return None

    return WorkspaceChannel.objects.filter(
        pk=channel_id,
        workspace_id=workspace_id,
        workspace__memberships__user_id=user_id,
        workspace__memberships__user__is_active=True,
    ).values_list('workspace__memberships__user_id', flat=True).first()


@database_sync_to_async
def user_is_channel_member(user_id, workspace_id, channel_id):
    return WorkspaceChannel.objects.filter(
        pk=channel_id,
        workspace_id=workspace_id,
        workspace__memberships__user_id=user_id,
        workspace__memberships__user__is_active=True,
    ).exists()


@database_sync_to_async
def register_presence_connection(workspace_id, user_id, connection_id):
    now = timezone.now()
    expires_before = now - timedelta(seconds=PRESENCE_TTL_SECONDS)
    expired_connections = WorkspacePresenceConnection.objects.filter(
        workspace_id=workspace_id,
        last_seen__lt=expires_before,
    )
    expired_user_ids = list(
        expired_connections.values_list('user_id', flat=True).distinct()
    )
    expired_connections.delete()
    WorkspacePresenceConnection.objects.create(
        connection_id=connection_id,
        workspace_id=workspace_id,
        user_id=user_id,
    )
    online_user_ids = list(
        WorkspacePresenceConnection.objects.filter(
            workspace_id=workspace_id,
            last_seen__gte=expires_before,
            user__is_active=True,
            user__workspace_memberships__workspace_id=workspace_id,
        )
        .order_by()
        .values_list('user_id', flat=True)
        .distinct()
    )
    users_still_online = set(
        WorkspacePresenceConnection.objects.filter(
            workspace_id=workspace_id,
            user_id__in=expired_user_ids,
            last_seen__gte=expires_before,
            user__is_active=True,
            user__workspace_memberships__workspace_id=workspace_id,
        ).values_list('user_id', flat=True).distinct()
    )
    stale_offline_user_ids = [
        expired_user_id
        for expired_user_id in expired_user_ids
        if expired_user_id not in users_still_online
    ]
    return online_user_ids, stale_offline_user_ids


@database_sync_to_async
def refresh_presence_connection(workspace_id, connection_id):
    now = timezone.now()
    expires_before = now - timedelta(seconds=PRESENCE_TTL_SECONDS)
    expired_connections = WorkspacePresenceConnection.objects.filter(
        workspace_id=workspace_id,
        last_seen__lt=expires_before,
    )
    expired_user_ids = list(
        expired_connections.values_list('user_id', flat=True).distinct()
    )
    expired_connections.delete()
    exists = WorkspacePresenceConnection.objects.filter(
        connection_id=connection_id,
    ).update(last_seen=now) > 0
    users_still_online = set(
        WorkspacePresenceConnection.objects.filter(
            workspace_id=workspace_id,
            user_id__in=expired_user_ids,
            last_seen__gte=expires_before,
            user__is_active=True,
            user__workspace_memberships__workspace_id=workspace_id,
        ).values_list('user_id', flat=True).distinct()
    )
    stale_offline_user_ids = [
        expired_user_id
        for expired_user_id in expired_user_ids
        if expired_user_id not in users_still_online
    ]
    return exists, stale_offline_user_ids


@database_sync_to_async
def remove_presence_connection(workspace_id, user_id, connection_id):
    WorkspacePresenceConnection.objects.filter(
        connection_id=connection_id,
    ).delete()
    expires_before = timezone.now() - timedelta(seconds=PRESENCE_TTL_SECONDS)
    return WorkspacePresenceConnection.objects.filter(
        workspace_id=workspace_id,
        user_id=user_id,
        last_seen__gte=expires_before,
        user__is_active=True,
        user__workspace_memberships__workspace_id=workspace_id,
    ).exists()


class WorkspaceChannelConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.workspace_id = self.scope['url_route']['kwargs']['workspace_id']
        self.channel_id = self.scope['url_route']['kwargs']['channel_id']
        query = parse_qs(self.scope.get('query_string', b'').decode('ascii', errors='ignore'))
        ticket = query.get('ticket', [None])[0]

        if not ticket:
            await self.close(code=4401)
            return

        self.user_id = await validate_ticket(
            ticket,
            self.workspace_id,
            self.channel_id,
        )
        if self.user_id is None:
            await self.close(code=4401)
            return

        self.group_name = f'workspace_channel_{self.channel_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        if query.get('presence', [''])[0] == '1':
            self.presence_group_name = f'workspace_presence_{self.workspace_id}'
            self.presence_connection_id = uuid4()
            await self.channel_layer.group_add(
                self.presence_group_name,
                self.channel_name,
            )
            try:
                online_user_ids, stale_offline_user_ids = await register_presence_connection(
                    self.workspace_id,
                    self.user_id,
                    self.presence_connection_id,
                )
            except Exception:
                await self.close(code=1011)
                return

            await self.send_json({
                'type': 'presence.snapshot',
                'user_ids': online_user_ids,
            })
            for stale_user_id in stale_offline_user_ids:
                await self.channel_layer.group_send(
                    self.presence_group_name,
                    {
                        'type': 'presence.event',
                        'user_id': stale_user_id,
                        'online': False,
                    },
                )
            await self.channel_layer.group_send(
                self.presence_group_name,
                {
                    'type': 'presence.event',
                    'user_id': self.user_id,
                    'online': True,
                },
            )

        self.membership_watch_task = asyncio.create_task(self.watch_membership())

    async def disconnect(self, close_code):
        watch_task = getattr(self, 'membership_watch_task', None)
        if watch_task:
            watch_task.cancel()

        connection_id = getattr(self, 'presence_connection_id', None)
        if connection_id:
            try:
                still_online = await remove_presence_connection(
                    self.workspace_id,
                    self.user_id,
                    connection_id,
                )
            except Exception:
                # Expiring the lease will eventually correct presence if the
                # database is unavailable during an unclean disconnect.
                still_online = True

            presence_group = getattr(self, 'presence_group_name', None)
            if presence_group:
                await self.channel_layer.group_discard(
                    presence_group,
                    self.channel_name,
                )
                if not still_online:
                    await self.channel_layer.group_send(
                        presence_group,
                        {
                            'type': 'presence.event',
                            'user_id': self.user_id,
                            'online': False,
                        },
                    )

        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def watch_membership(self):
        try:
            while True:
                await asyncio.sleep(PRESENCE_HEARTBEAT_SECONDS)
                try:
                    is_member = await user_is_channel_member(
                        self.user_id,
                        self.workspace_id,
                        self.channel_id,
                    )
                except Exception:
                    await self.close(code=1011)
                    return
                if not is_member:
                    await self.close(code=4403)
                    return

                connection_id = getattr(self, 'presence_connection_id', None)
                if connection_id:
                    try:
                        connection_exists, stale_offline_user_ids = await refresh_presence_connection(
                            self.workspace_id,
                            connection_id,
                        )
                    except Exception:
                        await self.close(code=1011)
                        return
                    for stale_user_id in stale_offline_user_ids:
                        await self.channel_layer.group_send(
                            self.presence_group_name,
                            {
                                'type': 'presence.event',
                                'user_id': stale_user_id,
                                'online': False,
                            },
                        )
                    if not connection_exists:
                        await self.close(code=1011)
                        return
        except asyncio.CancelledError:
            pass

    async def receive_json(self, content, **kwargs):
        # Writes remain on the authenticated REST API; WebSockets are broadcast-only.
        await self.close(code=1008)

    async def realtime_event(self, event):
        if not await user_is_channel_member(
            self.user_id,
            self.workspace_id,
            self.channel_id,
        ):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.close(code=4403)
            return

        await self.send_json(event['payload'])

    async def presence_event(self, event):
        if not await user_is_channel_member(
            self.user_id,
            self.workspace_id,
            self.channel_id,
        ):
            presence_group = getattr(self, 'presence_group_name', None)
            if presence_group:
                await self.channel_layer.group_discard(
                    presence_group,
                    self.channel_name,
                )
            await self.close(code=4403)
            return

        await self.send_json({
            'type': 'presence.changed',
            'user_id': event['user_id'],
            'online': event['online'],
        })
