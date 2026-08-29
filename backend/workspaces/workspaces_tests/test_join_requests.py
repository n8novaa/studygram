from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceJoinRequest,
    WorkspaceMembership,
)


class WorkspaceJoinRequestTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            password='OwnerPass123!',
        )

        self.member = User.objects.create_user(
            username='member',
            password='MemberPass123!',
        )

        self.public_workspace = Workspace.objects.create(
            name='Public Workspace',
            description='Public test workspace',
            owner=self.owner,
            visibility=Workspace.Visibility.PUBLIC,
        )

        self.private_workspace = Workspace.objects.create(
            name='Private Workspace',
            description='Private test workspace',
            owner=self.owner,
            visibility=Workspace.Visibility.PRIVATE,
        )

        WorkspaceMembership.objects.create(
            workspace=self.public_workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.private_workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_user_can_join_public_workspace(self):
        self.authenticate(self.member)

        response = self.client.post(
            f'/api/workspaces/{self.public_workspace.id}/join/'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.public_workspace,
                user=self.member,
                role=WorkspaceMembership.Role.MEMBER,
            ).exists()
        )

    def test_user_gets_pending_request_for_private_workspace(self):
        self.authenticate(self.member)

        response = self.client.post(
            f'/api/workspaces/{self.private_workspace.id}/join/'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            response.data['status'],
            'pending',
        )

        self.assertTrue(
            WorkspaceJoinRequest.objects.filter(
                workspace=self.private_workspace,
                user=self.member,
                status=WorkspaceJoinRequest.Status.PENDING,
            ).exists()
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.private_workspace,
                user=self.member,
            ).exists()
        )

    def test_admin_can_see_pending_requests(self):
        self.authenticate(self.member)

        self.client.post(
            f'/api/workspaces/{self.private_workspace.id}/join/'
        )

        self.authenticate(self.owner)

        response = self.client.get(
            f'/api/workspaces/{self.private_workspace.id}/join-requests/'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)

    def test_admin_can_approve_request(self):
        self.authenticate(self.member)

        self.client.post(
            f'/api/workspaces/{self.private_workspace.id}/join/'
        )

        join_request = WorkspaceJoinRequest.objects.get(
            workspace=self.private_workspace,
            user=self.member,
        )

        self.authenticate(self.owner)

        response = self.client.post(
            f'/api/workspaces/'
            f'{self.private_workspace.id}/'
            f'join-requests/'
            f'{join_request.id}/'
            f'approve/'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.private_workspace,
                user=self.member,
                role=WorkspaceMembership.Role.MEMBER,
            ).exists()
        )

        join_request.refresh_from_db()

        self.assertEqual(
            join_request.status,
            WorkspaceJoinRequest.Status.APPROVED,
        )

    def test_non_admin_cannot_approve_request(self):
        self.authenticate(self.member)

        self.client.post(
            f'/api/workspaces/{self.private_workspace.id}/join/'
        )

        join_request = WorkspaceJoinRequest.objects.get(
            workspace=self.private_workspace,
            user=self.member,
        )

        # member is NOT an admin
        response = self.client.post(
            f'/api/workspaces/'
            f'{self.private_workspace.id}/'
            f'join-requests/'
            f'{join_request.id}/'
            f'approve/'
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )