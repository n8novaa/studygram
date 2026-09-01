
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceMemberPromotionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="promotion_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="promotion_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="promotion_member",
            password="testpass123",
        )

        self.second_member = User.objects.create_user(
            username="promotion_member_two",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="promotion_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Promotion Test Workspace",
            description="Workspace for promotion tests",
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

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.second_member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.url = reverse(
            "workspace-member-promote",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "user_pk": self.member.pk,
            },
        )

    def test_owner_can_promote_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["role"],
            WorkspaceMembership.Role.ADMIN,
        )

        self.member.refresh_from_db()

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_admin_can_promote_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_member_cannot_promote_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

    def test_outsider_cannot_promote_member(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

    def test_unauthenticated_user_cannot_promote_member(self):
        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_cannot_promote_already_admin(self):
        self.client.force_authenticate(user=self.admin)

        admin_url = reverse(
            "workspace-member-promote",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "user_pk": self.owner.pk,
            },
        )

        response = self.client.post(admin_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "User is already an admin.",
        )

    def test_non_member_cannot_be_promoted(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                "workspace-member-promote",
                kwargs={
                    "workspace_pk": self.workspace.pk,
                    "user_pk": self.outsider.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_nonexistent_user_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                "workspace-member-promote",
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

    def test_promotion_does_not_create_duplicate_membership(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).count(),
            1,
        )

