from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceChannelMessageReaction,
    WorkspaceMembership,
)


class WorkspaceChannelMessageListCreateTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="message_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="message_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="message_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="message_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Message Test Workspace",
            description="Workspace for channel message tests",
            owner=self.owner,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="general",
            description="General discussion",
            created_by=self.owner,
        )

        self.message_url = reverse(
            "workspace-channel-message-list-create",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "channel_pk": self.channel.pk,
            },
        )

    def test_member_can_list_channel_messages(self):
        WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Hello everyone",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.get(
            self.message_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )

        self.assertEqual(
            response.data["results"][0]["body"],
            "Hello everyone",
        )

        self.assertIsNone(
            response.data["results"][0]["reply_to"],
        )


    def test_admin_can_list_channel_messages(self):
        WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.get(
            self.message_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )


    def test_owner_can_list_channel_messages(self):
        WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.get(
            self.message_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )


    def test_member_can_send_channel_message(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "Hello everyone",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        message = WorkspaceChannelMessage.objects.get(
            channel=self.channel,
        )

        self.assertEqual(
            message.body,
            "Hello everyone",
        )

        self.assertEqual(
            message.user,
            self.member,
        )


    def test_admin_can_send_channel_message(self):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "Admin message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        message = WorkspaceChannelMessage.objects.get(
            channel=self.channel,
        )

        self.assertEqual(
            message.user,
            self.admin,
        )


    def test_owner_can_send_channel_message(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "Owner message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        message = WorkspaceChannelMessage.objects.get(
            channel=self.channel,
        )

        self.assertEqual(
            message.user,
            self.owner,
        )


    def test_non_member_cannot_list_channel_messages(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.get(
            self.message_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    def test_non_member_cannot_send_channel_message(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "Outsider message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                channel=self.channel,
            ).exists()
        )


    def test_unauthenticated_user_cannot_list_channel_messages(self):
        response = self.client.get(
            self.message_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


    def test_unauthenticated_user_cannot_send_channel_message(self):
        response = self.client.post(
            self.message_url,
            {
                "body": "Anonymous message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


    def test_channel_message_body_cannot_be_empty(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "   ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                channel=self.channel,
            ).exists()
        )

    def test_member_can_reply_to_channel_message(self):
        original_message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.admin,
            body="Original message",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "This is my reply",
                "reply_to": original_message.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        reply = WorkspaceChannelMessage.objects.get(
            channel=self.channel,
            body="This is my reply",
        )

        self.assertEqual(
            reply.user,
            self.member,
        )

        self.assertEqual(
            reply.reply_to,
            original_message,
        )

        self.assertEqual(
            response.data["reply_to"],
            original_message.pk,
        )

    def test_cannot_reply_to_message_from_another_channel(self):
        other_channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="other",
            description="Another channel",
            created_by=self.owner,
        )

        original_message = WorkspaceChannelMessage.objects.create(
            channel=other_channel,
            user=self.admin,
            body="Message from another channel",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.message_url,
            {
                "body": "Invalid reply",
                "reply_to": original_message.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                channel=self.channel,
                body="Invalid reply",
            ).exists()
        )

class WorkspaceChannelMessageDeletionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="deletion_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="deletion_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="deletion_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="deletion_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Message Deletion Workspace",
            description="Workspace for message deletion tests",
            owner=self.owner,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="general",
            description="General discussion",
            created_by=self.owner,
        )

    def get_message_url(self, message):
        return reverse(
            "workspace-channel-message-detail",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "channel_pk": self.channel.pk,
                "message_pk": message.pk,
            },
        )

    def test_message_author_can_delete_own_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="My message",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )


    def test_member_cannot_delete_another_members_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.owner,
            body="Owner message",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )




    def test_non_member_cannot_delete_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )


    def test_unauthenticated_user_cannot_delete_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertTrue(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )

    def test_author_can_edit_own_message(self):
        self.client.force_authenticate(
            user=self.member,
        )

        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Original message",
        )

        response = self.client.patch(
            self.get_message_url(message),
            {
                "body": "Updated message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        message.refresh_from_db()

        self.assertEqual(
            message.body,
            "Updated message",
        )


    def test_member_cannot_edit_another_members_message(self):
        self.client.force_authenticate(
            user=self.member,
        )

        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.admin,
            body="Original message",
        )

        response = self.client.patch(
            self.get_message_url(message),
            {
                "body": "Trying to edit someone else's message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        message.refresh_from_db()

        self.assertEqual(
            message.body,
            "Original message",
        )

    def test_admin_can_delete_another_members_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )


    def test_owner_can_delete_another_members_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.member,
            body="Member message",
        )

        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )


    def test_member_cannot_delete_another_members_message(self):
        message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.owner,
            body="Owner message",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.delete(
            self.get_message_url(message),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceChannelMessage.objects.filter(
                pk=message.pk,
            ).exists()
        )

class WorkspaceChannelMessageReactionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="reaction_owner",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="reaction_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="reaction_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Reaction Test Workspace",
            description="Workspace for reaction tests",
            owner=self.owner,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="general",
            description="General discussion",
            created_by=self.owner,
        )

        self.message = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.owner,
            body="Test message",
        )

        self.reaction_url = reverse(
            "workspace-channel-message-reaction",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "channel_pk": self.channel.pk,
                "message_pk": self.message.pk,
            },
        )

    def test_member_can_add_reaction(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.reaction_url,
            {
                "emoji": "👍",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        reaction = WorkspaceChannelMessageReaction.objects.get(
            message=self.message,
            user=self.member,
        )

        self.assertEqual(
            reaction.emoji,
            "👍",
        )

    def test_member_can_change_reaction(self):
        WorkspaceChannelMessageReaction.objects.create(
            message=self.message,
            user=self.member,
            emoji="👍",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.reaction_url,
            {
                "emoji": "❤️",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        reactions = WorkspaceChannelMessageReaction.objects.filter(
            message=self.message,
            user=self.member,
        )

        self.assertEqual(
            reactions.count(),
            1,
        )

        self.assertEqual(
            reactions.first().emoji,
            "❤️",
        )

    def test_member_can_remove_reaction(self):
        reaction = WorkspaceChannelMessageReaction.objects.create(
            message=self.message,
            user=self.member,
            emoji="👍",
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.delete(
            self.reaction_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceChannelMessageReaction.objects.filter(
                pk=reaction.pk,
            ).exists()
        )

    def test_outsider_cannot_react(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.post(
            self.reaction_url,
            {
                "emoji": "👍",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceChannelMessageReaction.objects.filter(
                message=self.message,
                user=self.outsider,
            ).exists()
        )

    def test_unauthenticated_user_cannot_react(self):
        response = self.client.post(
            self.reaction_url,
            {
                "emoji": "👍",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_reaction_requires_emoji(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.reaction_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )