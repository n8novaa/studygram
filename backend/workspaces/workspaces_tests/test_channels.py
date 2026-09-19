from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceMembership,
)


class WorkspaceChannelListCreateTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="channel_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="channel_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="channel_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="channel_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Channel Test Workspace",
            description="Workspace for channel tests",
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

        self.channel_url = reverse(
            "workspace-channel-list-create",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def test_member_can_list_channels(self):
        WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="general",
            description="General discussion",
            created_by=self.owner,
        )

        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.get(
            self.channel_url,
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
            response.data["results"][0]["name"],
            "general",
        )

    def test_admin_can_list_channels(self):
        WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="resources",
            description="Study resources",
            created_by=self.admin,
        )

        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.get(
            self.channel_url,
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
            response.data["results"][0]["name"],
            "resources",
        )

    def test_owner_can_list_channels(self):
        WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="announcements",
            description="Workspace announcements",
            created_by=self.owner,
        )

        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.get(
            self.channel_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )

    def test_non_member_cannot_list_channels(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.get(
            self.channel_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
            ).count(),
            0,
        )

    def test_unauthenticated_user_cannot_list_channels(self):
        response = self.client.get(
            self.channel_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_admin_can_create_channel(self):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "general",
                "description": "General discussion",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        channel = WorkspaceChannel.objects.get(
            workspace=self.workspace,
            name="general",
        )

        self.assertEqual(
            channel.description,
            "General discussion",
        )

        self.assertEqual(
            channel.created_by,
            self.admin,
        )

        self.assertEqual(
            channel.workspace,
            self.workspace,
        )

    def test_owner_can_create_channel(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "announcements",
                "description": "Workspace announcements",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
                name="announcements",
                created_by=self.owner,
            ).exists()
        )

    def test_member_cannot_create_channel(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "member-channel",
                "description": "Should not be created",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
                name="member-channel",
            ).exists()
        )

    def test_non_member_cannot_create_channel(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "outsider-channel",
                "description": "Should not be created",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
                name="outsider-channel",
            ).exists()
        )

    def test_unauthenticated_user_cannot_create_channel(self):
        response = self.client.post(
            self.channel_url,
            {
                "name": "anonymous-channel",
                "description": "Should not be created",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_channel_name_cannot_be_empty(self):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "   ",
                "description": "Invalid channel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
            ).exists()
        )

    def test_duplicate_channel_name_is_rejected(self):
        WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name="general",
            description="Existing channel",
            created_by=self.owner,
        )

        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.channel_url,
            {
                "name": "general",
                "description": "Duplicate channel",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            WorkspaceChannel.objects.filter(
                workspace=self.workspace,
                name="general",
            ).count(),
            1,
        )