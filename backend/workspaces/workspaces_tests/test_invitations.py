from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
)


class WorkspaceInvitationTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="invitation_owner",
            password="TestPass123!",
        )

        self.member = User.objects.create_user(
            username="invitation_member",
            password="TestPass123!",
        )

        self.outsider = User.objects.create_user(
            username="invitation_outsider",
            password="TestPass123!",
        )

        self.workspace = Workspace.objects.create(
            name="Invitation Test Workspace",
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

        self.invitation = WorkspaceInvitation.objects.create(
            workspace=self.workspace,
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )

        self.create_url = reverse(
            "workspace-invitation-create",
            kwargs={"workspace_pk": self.workspace.pk},
        )

        self.accept_url = reverse(
            "workspace-invitation-accept",
            kwargs={"token": self.invitation.token},
        )

        self.list_url = reverse(
            "workspace-invitation-list",
            kwargs={"workspace_pk": self.workspace.pk},
        )

        self.revoke_url = reverse(
            "workspace-invitation-revoke",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "invitation_pk": self.invitation.pk,
            },
        )

    def test_admin_can_create_invitation(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.create_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_regular_member_cannot_create_invitation(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.create_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_outsider_cannot_create_invitation(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.create_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_user_can_accept_valid_invitation(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.accept_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.outsider,
                role=WorkspaceMembership.Role.MEMBER,
            ).exists()
        )

    def test_expired_invitation_is_rejected(self):
        self.invitation.expires_at = (
            timezone.now() - timedelta(days=1)
        )

        self.invitation.save(update_fields=["expires_at"])

        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.accept_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.outsider,
            ).exists()
        )

    def test_invalid_invitation_token_is_rejected(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            reverse(
                "workspace-invitation-accept",
                kwargs={"token": "invalid-token"},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.outsider,
            ).exists()
        )

    def test_existing_member_cannot_accept_invitation_again(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.accept_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).count(),
            1,
        )

    def test_admin_can_list_workspace_invitations(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            self.invitation.id,
        )


    def test_regular_member_cannot_list_invitations(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    def test_outsider_cannot_list_invitations(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    def test_invitation_list_includes_revocation_status(self):
        self.invitation.revoked_at = timezone.now()
        self.invitation.save(update_fields=["revoked_at"])

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIsNotNone(response.data[0]["revoked_at"])

    def test_admin_can_revoke_invitation(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.revoke_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.invitation.refresh_from_db()

        self.assertIsNotNone(self.invitation.revoked_at)


    def test_regular_member_cannot_revoke_invitation(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.revoke_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.invitation.refresh_from_db()

        self.assertIsNone(self.invitation.revoked_at)


    def test_outsider_cannot_revoke_invitation(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.revoke_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.invitation.refresh_from_db()

        self.assertIsNone(self.invitation.revoked_at)


    def test_revoked_invitation_cannot_be_accepted(self):
        self.invitation.revoked_at = timezone.now()
        self.invitation.save(update_fields=["revoked_at"])

        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(self.accept_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.outsider,
            ).exists()
        )


    def test_already_revoked_invitation_cannot_be_revoked_again(self):
        self.invitation.revoked_at = timezone.now()
        self.invitation.save(update_fields=["revoked_at"])

        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.revoke_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_admin_can_create_single_use_invitation(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.create_url,
            {"max_uses": 1},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(response.data["max_uses"], 1)
        self.assertEqual(response.data["uses"], 0)


    def test_invitation_defaults_to_unlimited_uses(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.create_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertIsNone(response.data["max_uses"])


    def test_invitation_rejects_zero_max_uses(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.create_url,
            {"max_uses": 0},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_single_use_invitation_rejects_second_acceptance(self):
        self.invitation.max_uses = 1
        self.invitation.save(update_fields=['max_uses'])

        self.client.force_authenticate(user=self.outsider)

        first_response = self.client.post(self.accept_url)

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        self.invitation.refresh_from_db()

        self.assertEqual(self.invitation.uses, 1)

        another_user = User.objects.create_user(
            username='another_invitation_user',
            password='TestPass123!',
        )

        self.client.force_authenticate(user=another_user)

        second_response = self.client.post(self.accept_url)

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.invitation.refresh_from_db()

        self.assertEqual(self.invitation.uses, 1)

    def test_unlimited_invitation_can_be_accepted_multiple_times(self):
        self.assertIsNone(self.invitation.max_uses)

        self.client.force_authenticate(user=self.outsider)

        first_response = self.client.post(self.accept_url)

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        another_user = User.objects.create_user(
            username='another_unlimited_user',
            password='TestPass123!',
        )

        self.client.force_authenticate(user=another_user)

        second_response = self.client.post(self.accept_url)

        self.assertEqual(
            second_response.status_code,
            status.HTTP_201_CREATED,
        )

        self.invitation.refresh_from_db()

        self.assertEqual(self.invitation.uses, 2)

    def test_existing_member_does_not_consume_invitation_use(self):
        self.invitation.max_uses = 2
        self.invitation.save(update_fields=['max_uses'])

        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.accept_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.invitation.refresh_from_db()

        self.assertEqual(self.invitation.uses, 0)

    def test_invitation_rejects_decimal_max_uses(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.create_url,
            {"max_uses": 1.5},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


    def test_invitation_rejects_boolean_max_uses(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.create_url,
            {"max_uses": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )