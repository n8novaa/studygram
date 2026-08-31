from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership

from files.models import WorkspaceFolder


class WorkspaceFolderCreateTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            password="testpass123",
        )

        self.admin = User.objects.create_user(
            username="admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            description="Workspace for filesystem tests",
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
            "workspace-folder-create",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def test_admin_can_create_root_folder(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                "name": "Semester 5",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Semester 5",
                parent__isnull=True,
                created_by=self.admin,
            ).exists()
        )

    def test_owner_can_create_root_folder(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {
                "name": "Owner Folder",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Owner Folder",
                created_by=self.owner,
            ).exists()
        )

    def test_member_cannot_create_folder(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.url,
            {
                "name": "Member Folder",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Member Folder",
            ).exists()
        )

    def test_non_member_cannot_create_folder(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            self.url,
            {
                "name": "Outsider Folder",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Outsider Folder",
            ).exists()
        )

    def test_unauthenticated_user_cannot_create_folder(self):
        response = self.client.post(
            self.url,
            {
                "name": "Anonymous Folder",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Anonymous Folder",
            ).exists()
        )

    def test_admin_can_create_nested_folder(self):
        parent = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Semester 5",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                "name": "Data Structures",
                "parent": parent.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        child = WorkspaceFolder.objects.get(
            workspace=self.workspace,
            name="Data Structures",
        )

        self.assertEqual(
            child.parent,
            parent,
        )

        self.assertEqual(
            child.created_by,
            self.admin,
        )

    def test_admin_cannot_use_parent_from_another_workspace(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.owner,
        )

        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace,
            name="Other Folder",
            created_by=self.owner,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                "name": "Invalid Folder",
                "parent": other_folder.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
                name="Invalid Folder",
            ).exists()
        )

    def test_folder_name_cannot_be_empty(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                "name": "   ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                workspace=self.workspace,
            ).exists()
        )

class WorkspaceFolderListTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            description="Workspace for filesystem tests",
            owner=self.admin,
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

        self.other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        self.root_folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Semester 5",
            created_by=self.admin,
        )

        self.second_root_folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Semester 6",
            created_by=self.admin,
        )

        self.nested_folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Data Structures",
            parent=self.root_folder,
            created_by=self.admin,
        )

        self.other_workspace_folder = WorkspaceFolder.objects.create(
            workspace=self.other_workspace,
            name="Other Folder",
            created_by=self.admin,
        )

        self.url = reverse(
            "workspace-folder-list",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def test_admin_can_list_root_folders(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            folder["name"]
            for folder in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "Semester 5",
                "Semester 6",
            },
        )

        self.assertNotIn(
            "Data Structures",
            names,
        )

        self.assertNotIn(
            "Other Folder",
            names,
        )

    def test_member_can_list_root_folders(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            folder["name"]
            for folder in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "Semester 5",
                "Semester 6",
            },
        )

    def test_non_member_cannot_list_folders(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_list_folders(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_nested_folder_listing(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "parent": self.root_folder.pk,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            folder["name"]
            for folder in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "Data Structures",
            },
        )

    def test_nonexistent_parent_returns_empty_list(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "parent": 999999,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["results"],
            [],
        )

class WorkspaceFolderDetailTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_detail",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="member_detail",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Detail Test Workspace",
            description="Workspace for folder detail tests",
            owner=self.admin,
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

        self.folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Original Name",
            created_by=self.admin,
        )

        self.url = reverse(
            "workspace-folder-detail",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "pk": self.folder.pk,
            },
        )

    def test_deleting_folder_deletes_nested_folders(self):
        child = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Child",
            parent=self.folder,
            created_by=self.admin,
        )

        grandchild = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Grandchild",
            parent=child,
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                pk=self.folder.pk,
            ).exists()
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                pk=child.pk,
            ).exists()
        )

        self.assertFalse(
            WorkspaceFolder.objects.filter(
                pk=grandchild.pk,
            ).exists()
        )