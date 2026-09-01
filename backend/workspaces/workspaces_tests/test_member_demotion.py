
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceMemberDemotionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="demotion_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="demotion_admin",
            password="testpass123",
        )

        self.second_admin = User.objects.create_user(
            username="demotion_admin_two",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="demotion_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="demotion_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Demotion Test Workspace",
            description="Workspace for demotion tests",
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
            user=self.outsider,
            role=WorkspaceMembership.Role.MEMBER,
        )

    def get_demote_url(self, user):
        return reverse(
            "workspace-member-demote",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "user_pk": user.pk,
            },
        )

    def test_owner_can_demote_admin(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.get_demote_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.admin,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

    def test_admin_can_demote_another_admin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.get_demote_url(self.second_admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.second_admin,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

    def test_owner_cannot_be_demoted(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.get_demote_url(self.owner)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            response.data["detail"],
            "The workspace owner cannot be demoted.",
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.owner,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_member_cannot_demote_admin(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.get_demote_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.admin,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_outsider_cannot_demote_admin(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            self.get_demote_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.admin,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_unauthenticated_user_cannot_demote_admin(self):
        response = self.client.post(
            self.get_demote_url(self.admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_cannot_demote_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.get_demote_url(self.member)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "User is already a member.",
        )

    def test_non_member_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        WorkspaceMembership.objects.filter(
            workspace=self.workspace,
            user=self.outsider,
        ).delete()

        response = self.client.post(
            self.get_demote_url(self.outsider)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_nonexistent_user_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                "workspace-member-demote",
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

    def test_demotion_does_not_delete_membership(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.get_demote_url(self.second_admin)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.second_admin,
            ).count(),
            1,
        )

