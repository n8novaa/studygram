from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from files.models import WorkspaceFile, WorkspaceFolder
from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceFileCreateTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="file_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="file_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="file_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="File Test Workspace",
            description="Workspace for file upload tests",
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

        self.url = reverse(
            "workspace-file-upload",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def create_uploaded_file(
        self,
        name="notes.txt",
        content=b"StudyGram test file",
        content_type="text/plain",
    ):
        return SimpleUploadedFile(
            name=name,
            content=content,
            content_type=content_type,
        )

    def test_admin_can_upload_file(self):
        self.client.force_authenticate(user=self.admin)

        uploaded_file = self.create_uploaded_file()

        response = self.client.post(
            self.url,
            {
                "name": "notes.txt",
                "uploaded_file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="notes.txt",
                created_by=self.admin,
            ).exists()
        )

    def test_member_cannot_upload_file(self):
        self.client.force_authenticate(user=self.member)

        uploaded_file = self.create_uploaded_file()

        response = self.client.post(
            self.url,
            {
                "name": "member.txt",
                "uploaded_file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="member.txt",
            ).exists()
        )

    def test_unauthenticated_user_cannot_upload_file(self):
        uploaded_file = self.create_uploaded_file()

        response = self.client.post(
            self.url,
            {
                "name": "anonymous.txt",
                "uploaded_file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="anonymous.txt",
            ).exists()
        )

    def test_outsider_cannot_upload_file(self):
        self.client.force_authenticate(user=self.outsider)

        uploaded_file = self.create_uploaded_file()

        response = self.client.post(
            self.url,
            {
                "name": "outsider.txt",
                "uploaded_file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="outsider.txt",
            ).exists()
        )

    def test_uploaded_file_metadata_is_recorded(self):
        self.client.force_authenticate(user=self.admin)

        content = b"Hello StudyGram"
        uploaded_file = self.create_uploaded_file(
            name="document.txt",
            content=content,
            content_type="text/plain",
        )

        response = self.client.post(
            self.url,
            {
                "name": "document.txt",
                "uploaded_file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        workspace_file = WorkspaceFile.objects.get(
            workspace=self.workspace,
            name="document.txt",
        )

        self.assertEqual(
            workspace_file.created_by,
            self.admin,
        )

        self.assertEqual(
            workspace_file.file_type,
            "text/plain",
        )

        self.assertEqual(
            workspace_file.size,
            len(content),
        )

    def test_admin_can_upload_file_into_folder(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        uploaded_file = self.create_uploaded_file(
            name="lecture.txt",
        )

        response = self.client.post(
            self.url,
            {
                "name": "lecture.txt",
                "uploaded_file": uploaded_file,
                "folder": folder.pk,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        workspace_file = WorkspaceFile.objects.get(
            workspace=self.workspace,
            name="lecture.txt",
        )

        self.assertEqual(
            workspace_file.folder,
            folder,
        )

    def test_admin_can_upload_file_into_nested_folder(self):
        parent = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Semester 5",
            created_by=self.admin,
        )

        child = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Data Structures",
            parent=parent,
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        uploaded_file = self.create_uploaded_file(
            name="arrays.txt",
        )

        response = self.client.post(
            self.url,
            {
                "name": "arrays.txt",
                "uploaded_file": uploaded_file,
                "folder": child.pk,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        workspace_file = WorkspaceFile.objects.get(
            workspace=self.workspace,
            name="arrays.txt",
        )

        self.assertEqual(
            workspace_file.folder,
            child,
        )

    def test_admin_cannot_upload_file_into_folder_from_another_workspace(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace,
            name="Other Folder",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        uploaded_file = self.create_uploaded_file(
            name="invalid.txt",
        )

        response = self.client.post(
            self.url,
            {
                "name": "invalid.txt",
                "uploaded_file": uploaded_file,
                "folder": other_folder.pk,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="invalid.txt",
            ).exists()
        )

    def test_member_cannot_upload_file_into_folder(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Member Target",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.member)

        uploaded_file = self.create_uploaded_file(
            name="member.txt",
        )

        response = self.client.post(
            self.url,
            {
                "name": "member.txt",
                "uploaded_file": uploaded_file,
                "folder": folder.pk,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                workspace=self.workspace,
                name="member.txt",
            ).exists()
        )

class WorkspaceFileListTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="list_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="list_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="list_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="File List Workspace",
            description="Workspace for file listing tests",
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

        self.url = reverse(
            "workspace-file-list",
            kwargs={
                "workspace_pk": self.workspace.pk,
            },
        )

    def create_file(
        self,
        name,
        folder=None,
        content=b"StudyGram test file",
        content_type="text/plain",
    ):
        uploaded_file = SimpleUploadedFile(
            name=name,
            content=content,
            content_type=content_type,
        )

        return WorkspaceFile.objects.create(
            workspace=self.workspace,
            folder=folder,
            name=name,
            uploaded_file=uploaded_file,
            file_type=content_type,
            size=len(content),
            created_by=self.admin,
        )

    def test_admin_can_list_root_files(self):
        self.create_file("root-one.txt")
        self.create_file("root-two.txt")

        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.create_file(
            "inside-folder.txt",
            folder=folder,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            file["name"]
            for file in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "root-one.txt",
                "root-two.txt",
            },
        )

    def test_member_can_list_root_files(self):
        self.create_file("root-one.txt")
        self.create_file("root-two.txt")

        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            file["name"]
            for file in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "root-one.txt",
                "root-two.txt",
            },
        )

    def test_folder_file_listing(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.create_file(
            "lecture-one.txt",
            folder=folder,
        )

        self.create_file(
            "lecture-two.txt",
            folder=folder,
        )

        self.create_file("root.txt")

        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "folder": folder.pk,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            file["name"]
            for file in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "lecture-one.txt",
                "lecture-two.txt",
            },
        )

    def test_nested_folder_file_listing(self):
        parent = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Semester 5",
            created_by=self.admin,
        )

        child = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Data Structures",
            parent=parent,
            created_by=self.admin,
        )

        self.create_file(
            "parent.txt",
            folder=parent,
        )

        self.create_file(
            "child.txt",
            folder=child,
        )

        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "folder": child.pk,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        names = {
            file["name"]
            for file in response.data["results"]
        }

        self.assertEqual(
            names,
            {
                "child.txt",
            },
        )

    def test_outsider_cannot_list_files(self):
        self.create_file("private.txt")

        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_list_files(self):
        self.create_file("private.txt")

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_nonexistent_folder_returns_empty_list(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "folder": 999999,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["count"],
            0,
        )

        self.assertEqual(
            response.data["results"],
            [],
        )

    def test_folder_from_another_workspace_returns_empty_list(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace,
            name="Other Folder",
            created_by=self.admin,
        )

        self.create_file(
            "other-file.txt",
            folder=other_folder,
        )

        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            self.url,
            {
                "folder": other_folder.pk,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["count"],
            0,
        )

        self.assertEqual(
            response.data["results"],
            [],
        )

class WorkspaceFileDetailTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="detail_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="detail_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="detail_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="File Detail Workspace",
            description="Workspace for file detail tests",
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

        self.workspace_file = self.create_file(
            "document.txt",
        )

        self.url = reverse(
            "workspace-file-detail",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "pk": self.workspace_file.pk,
            },
        )

    def create_file(
        self,
        name,
        content=b"StudyGram test file",
        content_type="text/plain",
    ):
        uploaded_file = SimpleUploadedFile(
            name=name,
            content=content,
            content_type=content_type,
        )

        return WorkspaceFile.objects.create(
            workspace=self.workspace,
            name=name,
            uploaded_file=uploaded_file,
            file_type=content_type,
            size=len(content),
            created_by=self.admin,
        )

    def test_admin_can_view_file_detail(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["id"],
            self.workspace_file.pk,
        )

        self.assertEqual(
            response.data["name"],
            "document.txt",
        )

    def test_member_can_view_file_detail(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["id"],
            self.workspace_file.pk,
        )

        self.assertEqual(
            response.data["name"],
            "document.txt",
        )

    def test_outsider_cannot_view_file_detail(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_view_file_detail(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_file_from_another_workspace_cannot_be_viewed(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_file = WorkspaceFile.objects.create(
            workspace=other_workspace,
            name="secret.txt",
            uploaded_file=SimpleUploadedFile(
                "secret.txt",
                b"Secret workspace file",
                content_type="text/plain",
            ),
            file_type="text/plain",
            size=len(b"Secret workspace file"),
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            reverse(
                "workspace-file-detail",
                kwargs={
                    "workspace_pk": self.workspace.pk,
                    "pk": other_file.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_admin_can_rename_file(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.url,
            {
                "name": "renamed-document.txt",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.workspace_file.refresh_from_db()

        self.assertEqual(
            self.workspace_file.name,
            "renamed-document.txt",
        )

    def test_member_cannot_rename_file(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.url,
            {
                "name": "member-renamed.txt",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.workspace_file.refresh_from_db()

        self.assertEqual(
            self.workspace_file.name,
            "document.txt",
        )

    def test_admin_can_move_file_into_folder(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.url,
            {
                "folder": folder.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.workspace_file.refresh_from_db()

        self.assertEqual(
            self.workspace_file.folder,
            folder,
        )

    def test_admin_can_move_file_to_workspace_root(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.workspace_file.folder = folder
        self.workspace_file.save()

        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.url,
            {
                "folder": None,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.workspace_file.refresh_from_db()

        self.assertIsNone(
            self.workspace_file.folder,
        )

    def test_member_cannot_move_file(self):
        folder = WorkspaceFolder.objects.create(
            workspace=self.workspace,
            name="Notes",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.url,
            {
                "folder": folder.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.workspace_file.refresh_from_db()

        self.assertIsNone(
            self.workspace_file.folder,
        )

    def test_admin_cannot_move_file_into_another_workspace_folder(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace,
            name="Other Folder",
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.url,
            {
                "folder": other_folder.pk,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.workspace_file.refresh_from_db()

        self.assertIsNone(
            self.workspace_file.folder,
        )

    def test_admin_cannot_rename_file_to_empty_name(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
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

        self.workspace_file.refresh_from_db()

        self.assertEqual(
            self.workspace_file.name,
            "document.txt",
        )

    def test_put_is_not_supported(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.put(
            self.url,
            {
                "name": "replacement.txt",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_admin_can_delete_file(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                pk=self.workspace_file.pk,
            ).exists()
        )

    def test_member_cannot_delete_file(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceFile.objects.filter(
                pk=self.workspace_file.pk,
            ).exists()
        )

    def test_outsider_cannot_delete_file(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            WorkspaceFile.objects.filter(
                pk=self.workspace_file.pk,
            ).exists()
        )

    def test_unauthenticated_user_cannot_delete_file(self):
        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertTrue(
            WorkspaceFile.objects.filter(
                pk=self.workspace_file.pk,
            ).exists()
        )

    def test_admin_cannot_delete_file_from_another_workspace(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_file = WorkspaceFile.objects.create(
            workspace=other_workspace,
            name="secret.txt",
            uploaded_file=SimpleUploadedFile(
                "secret.txt",
                b"Secret workspace file",
                content_type="text/plain",
            ),
            file_type="text/plain",
            size=len(b"Secret workspace file"),
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-file-detail",
                kwargs={
                    "workspace_pk": self.workspace.pk,
                    "pk": other_file.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertTrue(
            WorkspaceFile.objects.filter(
                pk=other_file.pk,
            ).exists()
        )

    def test_deleting_file_removes_physical_file(self):
        self.client.force_authenticate(user=self.admin)

        file_path = self.workspace_file.uploaded_file.path

        self.assertTrue(
            self.workspace_file.uploaded_file.storage.exists(
                self.workspace_file.uploaded_file.name
            )
        )

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            self.workspace_file.uploaded_file.storage.exists(
                self.workspace_file.uploaded_file.name
            )
        )