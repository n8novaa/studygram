
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceMemberRemovalTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="removal_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="removal_admin",
            password="testpass123",
        )

        self.second_admin = User.objects.create_user(
            username="removal_admin_two",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="removal_member",
            password="testpass123",
        )

        self.second_member = User.objects.create_user(
            username="removal_member_two",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="removal_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Removal Test Workspace",
            description="Workspace for removal tests",
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
            user=self.second_admin,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.second_member,
            role=WorkspaceMembership.Role.MEMBER,
        )

    def get_remove_url(self, user):
        return reverse(
            "workspace-member-remove",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "user_pk": user.pk,
            },
        )

    def test_owner_can_remove_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            self.get_remove_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

    def test_owner_can_remove_admin(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            self.get_remove_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.admin,
            ).exists()
        )

    def test_admin_can_remove_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.get_remove_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

    def test_admin_can_remove_another_admin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.get_remove_url(self.second_admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.second_admin,
            ).exists()
        )

    def test_admin_cannot_remove_owner(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.get_remove_url(self.owner)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            response.data["detail"],
            "The workspace owner cannot be removed.",
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.owner,
            ).exists()
        )

    def test_admin_cannot_remove_self(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.get_remove_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "You cannot remove yourself from the workspace.",
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.admin,
            ).exists()
        )

    def test_member_cannot_remove_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(
            self.get_remove_url(self.second_member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.second_member,
            ).exists()
        )

    def test_outsider_cannot_remove_member(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.delete(
            self.get_remove_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

    def test_unauthenticated_user_cannot_remove_member(self):
        response = self.client.delete(
            self.get_remove_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

    def test_non_member_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        WorkspaceMembership.objects.filter(
            workspace=self.workspace,
            user=self.outsider,
        ).delete()

        response = self.client.delete(
            self.get_remove_url(self.outsider)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_nonexistent_user_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-member-remove",
                kwargs={
                    "workspace_pk": self.workspace.pk,
                    "user_pk": 999999,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_removal_does_not_delete_user_account(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.get_remove_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            User.objects.filter(
                pk=self.member.pk,
            ).exists()
        )

