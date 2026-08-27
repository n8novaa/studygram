from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspacePermissionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            password='testpassword123',
        )

        self.admin = User.objects.create_user(
            username='admin',
            password='testpassword123',
        )

        self.member = User.objects.create_user(
            username='member',
            password='testpassword123',
        )

        self.outsider = User.objects.create_user(
            username='outsider',
            password='testpassword123',
        )

        self.workspace = Workspace.objects.create(
            name='Test Workspace',
            description='Workspace for permission tests',
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

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_owner_can_view_workspace(self):
        self.authenticate(self.owner)

        response = self.client.get(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_view_workspace(self):
        self.authenticate(self.admin)

        response = self.client.get(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_can_view_workspace(self):
        self.authenticate(self.member)

        response = self.client.get(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_outsider_cannot_view_workspace(self):
        self.authenticate(self.outsider)

        response = self.client.get(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_update_workspace(self):
        self.authenticate(self.owner)

        response = self.client.patch(
            f'/api/workspaces/{self.workspace.id}/',
            {'name': 'Updated Workspace'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_update_workspace(self):
        self.authenticate(self.admin)

        response = self.client.patch(
            f'/api/workspaces/{self.workspace.id}/',
            {'name': 'Updated by Admin'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_cannot_update_workspace(self):
        self.authenticate(self.member)

        response = self.client.patch(
            f'/api/workspaces/{self.workspace.id}/',
            {'name': 'Unauthorized Update'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_workspace(self):
        self.authenticate(self.owner)

        response = self.client.delete(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_cannot_delete_workspace(self):
        self.authenticate(self.admin)

        response = self.client.delete(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_delete_workspace(self):
        self.authenticate(self.member)

        response = self.client.delete(
            f'/api/workspaces/{self.workspace.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)