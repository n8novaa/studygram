import asyncio
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core import signing

from .models import WorkspaceChannel


TICKET_SALT = 'workspaces.channel.websocket-ticket'
TICKET_MAX_AGE_SECONDS = 60


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
        self.membership_watch_task = asyncio.create_task(self.watch_membership())

    async def disconnect(self, close_code):
        watch_task = getattr(self, 'membership_watch_task', None)
        if watch_task:
            watch_task.cancel()
        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def watch_membership(self):
        try:
            while True:
                await asyncio.sleep(30)
                if not await user_is_channel_member(
                    self.user_id,
                    self.workspace_id,
                    self.channel_id,
                ):
                    await self.close(code=4403)
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
