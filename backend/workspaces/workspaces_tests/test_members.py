
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceMemberListTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="workspace_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="workspace_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="workspace_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="workspace_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Member Test Workspace",
            description="Workspace for member tests",
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

        self.url = reverse(
            "workspace-members",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def test_owner_can_list_members(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            3,
        )

        usernames = {
            member["user"]
            for member in response.data
        }

        self.assertEqual(
            usernames,
            {
                "workspace_owner",
                "workspace_admin",
                "workspace_member",
            },
        )

    def test_admin_can_list_members(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            3,
        )

    def test_member_cannot_list_members(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_outsider_cannot_list_members(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_list_members(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_members_are_returned_with_roles(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        members = {
            member["user"]: member["role"]
            for member in response.data
        }

        self.assertEqual(
            members["workspace_owner"],
            WorkspaceMembership.Role.ADMIN,
        )

        self.assertEqual(
            members["workspace_admin"],
            WorkspaceMembership.Role.ADMIN,
        )

        self.assertEqual(
            members["workspace_member"],
            WorkspaceMembership.Role.MEMBER,
        )

