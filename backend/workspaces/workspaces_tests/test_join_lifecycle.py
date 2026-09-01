
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceJoinRequest,
    WorkspaceMembership,
)


class WorkspaceJoinLifecycleTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="lifecycle_owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="lifecycle_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="lifecycle_member",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Join Lifecycle Workspace",
            description="Workspace for join lifecycle tests",
            owner=self.owner,
            visibility=Workspace.Visibility.PRIVATE,
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

        self.join_url = reverse(
            "workspace-join",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def get_approve_url(self, request_id):
        return reverse(
            "workspace-join-request-approve",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "request_pk": request_id,
            },
        )

    def get_reject_url(self, request_id):
        return reverse(
            "workspace-join-request-reject",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "request_pk": request_id,
            },
        )

    def test_complete_reject_resubmit_approve_lifecycle(self):
        # ---------------------------------------------------------
        # 1. User submits a join request to the private workspace.
        # ---------------------------------------------------------
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.join_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        join_request = WorkspaceJoinRequest.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            join_request.status,
            WorkspaceJoinRequest.Status.PENDING,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

        # ---------------------------------------------------------
        # 2. Admin rejects the request.
        # ---------------------------------------------------------
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.get_reject_url(
                join_request.pk,
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        join_request.refresh_from_db()

        self.assertEqual(
            join_request.status,
            WorkspaceJoinRequest.Status.REJECTED,
        )

        self.assertIsNotNone(
            join_request.reviewed_at,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).exists()
        )

        # ---------------------------------------------------------
        # 3. Rejected user submits the request again.
        # ---------------------------------------------------------
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.join_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        join_request.refresh_from_db()

        self.assertEqual(
            join_request.status,
            WorkspaceJoinRequest.Status.PENDING,
        )

        self.assertIsNone(
            join_request.reviewed_at,
        )

        # The same request should be reused rather than
        # creating a second WorkspaceJoinRequest.
        self.assertEqual(
            WorkspaceJoinRequest.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).count(),
            1,
        )

        # ---------------------------------------------------------
        # 4. Admin approves the resubmitted request.
        # ---------------------------------------------------------
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.post(
            self.get_approve_url(
                join_request.pk,
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        # ---------------------------------------------------------
        # 5. Request becomes APPROVED.
        # ---------------------------------------------------------
        join_request.refresh_from_db()

        self.assertEqual(
            join_request.status,
            WorkspaceJoinRequest.Status.APPROVED,
        )

        self.assertIsNotNone(
            join_request.reviewed_at,
        )

        # ---------------------------------------------------------
        # 6. User becomes a normal workspace member.
        # ---------------------------------------------------------
        membership = WorkspaceMembership.objects.get(
            workspace=self.workspace,
            user=self.member,
        )

        self.assertEqual(
            membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

        # ---------------------------------------------------------
        # 7. User cannot join again because they are now a member.
        # ---------------------------------------------------------
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.post(
            self.join_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "You are already a member of this workspace.",
        )

        # Membership must still exist exactly once.
        self.assertEqual(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.member,
            ).count(),
            1,
        )

