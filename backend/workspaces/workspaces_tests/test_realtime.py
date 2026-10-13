from urllib.parse import urlencode

from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.core import signing
from django.test import TransactionTestCase

from workspaces.models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceMembership,
)
from workspaces.consumers import TICKET_SALT
from workspaces.routing import websocket_urlpatterns


class WorkspaceChannelConsumerTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user('realtime_member', password='testpass123')
        self.workspace = Workspace.objects.create(
            name='Realtime Workspace', description='', owner=self.user,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceMembership.Role.MEMBER,
        )
        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name='general',
            created_by=self.user,
        )
        self.ticket = signing.dumps({
            'user_id': self.user.pk,
            'workspace_id': self.workspace.pk,
            'channel_id': self.channel.pk,
        }, salt=TICKET_SALT)

    async def test_member_receives_new_message_over_websocket(self):
        path = (
            f'/ws/workspaces/{self.workspace.pk}/channels/{self.channel.pk}/messages/?'
            f'{urlencode({"ticket": self.ticket})}'
        )
        communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), path)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await database_sync_to_async(WorkspaceChannelMessage.objects.create)(
            channel_id=self.channel.pk,
            user_id=self.user.pk,
            body='Live message',
        )
        event = await communicator.receive_json_from(timeout=2)

        self.assertEqual(event['type'], 'message.created')
        self.assertEqual(event['message']['body'], 'Live message')
        await communicator.disconnect()

    async def test_invalid_ticket_is_rejected(self):
        path = f'/ws/workspaces/{self.workspace.pk}/channels/{self.channel.pk}/messages/?ticket=invalid'
        communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), path)

        connected, close_code = await communicator.connect()

        self.assertFalse(connected)
        self.assertEqual(close_code, 4401)

    async def test_websocket_does_not_accept_client_message_writes(self):
        path = (
            f'/ws/workspaces/{self.workspace.pk}/channels/{self.channel.pk}/messages/?'
            f'{urlencode({"ticket": self.ticket})}'
        )
        communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), path)
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.send_json_to({'body': 'write over websocket'})

        close_event = await communicator.receive_output(timeout=2)
        self.assertEqual(close_event['type'], 'websocket.close')
        self.assertEqual(close_event['code'], 1008)
        await communicator.wait()
