from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceMembership,
)


class WorkspaceDiscoverTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="discover_owner",
            password="TestPass123!",
        )

        self.member = User.objects.create_user(
            username="discover_member",
            password="TestPass123!",
        )

        self.outsider = User.objects.create_user(
            username="discover_outsider",
            password="TestPass123!",
        )

        self.private_workspace = Workspace.objects.create(
            name="Private Discovery Workspace",
            description="Confidential workspace description",
            owner=self.owner,
            visibility=Workspace.Visibility.PRIVATE,
        )

        self.public_workspace = Workspace.objects.create(
            name="Public Discovery Workspace",
            description="Public workspace description",
            owner=self.owner,
            visibility=Workspace.Visibility.PUBLIC,
        )

        WorkspaceMembership.objects.create(
            workspace=self.private_workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.private_workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        WorkspaceMembership.objects.create(
            workspace=self.public_workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )

        self.discover_url = reverse(
            "workspace-discover",
        )

    def get_workspace_from_response(self, response, workspace):
        return next(
            item
            for item in response.data["results"]
            if item["id"] == workspace.id
        )

    def test_non_member_can_discover_private_workspace(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.get(
            self.discover_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        private_workspace = self.get_workspace_from_response(
            response,
            self.private_workspace,
        )

        self.assertEqual(
            private_workspace["visibility"],
            Workspace.Visibility.PRIVATE,
        )

    def test_non_member_cannot_see_private_description_or_owner(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.get(
            self.discover_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        private_workspace = self.get_workspace_from_response(
            response,
            self.private_workspace,
        )

        self.assertNotIn(
            "description",
            private_workspace,
        )

        self.assertNotIn(
            "owner",
            private_workspace,
        )

    def test_member_can_see_private_workspace_metadata(self):
        self.client.force_authenticate(
            user=self.member,
        )

        response = self.client.get(
            self.discover_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        private_workspace = self.get_workspace_from_response(
            response,
            self.private_workspace,
        )

        self.assertEqual(
            private_workspace["description"],
            "Confidential workspace description",
        )

        self.assertEqual(
            private_workspace["owner"],
            str(self.owner),
        )

    def test_public_workspace_metadata_remains_visible_to_non_member(self):
        self.client.force_authenticate(
            user=self.outsider,
        )

        response = self.client.get(
            self.discover_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        public_workspace = self.get_workspace_from_response(
            response,
            self.public_workspace,
        )

        self.assertEqual(
            public_workspace["description"],
            "Public workspace description",
        )

        self.assertEqual(
            public_workspace["owner"],
            str(self.owner),
        )

    def test_discover_uses_pagination(self):
        # Create enough additional workspaces to exceed the page size.
        for i in range(20):
            Workspace.objects.create(
                name=f"Additional Workspace {i}",
                description=f"Description {i}",
                owner=self.owner,
                visibility=Workspace.Visibility.PUBLIC,
            )

        self.client.force_authenticate(user=self.outsider)
        
        response = self.client.get(self.discover_url)

        self.assertEqual(response.status_code, 200)

        # Verify the paginated response structure.
        self.assertIn("count", response.data)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)
        self.assertIn("results", response.data)

        # There should be more than one page of results.
        self.assertGreater(response.data["count"], 20)

        # The first page must not exceed the configured page size.
        self.assertLessEqual(len(response.data["results"]), 20)

        # A next page should be available.
        self.assertIsNotNone(response.data["next"])