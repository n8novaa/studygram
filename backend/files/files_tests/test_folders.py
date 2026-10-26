from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.test import override_settings
import tempfile
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership

from files.models import WorkspaceFile, WorkspaceFolder


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

    def test_deleting_folder_removes_physical_files(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.core.files.storage import default_storage
        from files.models import WorkspaceFile

        uploaded_file = SimpleUploadedFile(
            "test_document.txt",
            b"Test document content",
            content_type="text/plain",
        )

        workspace_file = WorkspaceFile.objects.create(
            workspace=self.workspace,
            folder=self.folder,
            name="test_document.txt",
            uploaded_file=uploaded_file,
            file_type="text/plain",
            size=len(b"Test document content"),
            created_by=self.admin,
        )

        storage_path = workspace_file.uploaded_file.name

        self.assertTrue(
            default_storage.exists(storage_path)
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceFile.objects.filter(
                pk=workspace_file.pk,
            ).exists()
        )

        self.assertFalse(
            default_storage.exists(storage_path)
        )

class WorkspaceFileDownloadTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="download_admin",
            password="testpass123",
        )

        self.member = User.objects.create_user(
            username="download_member",
            password="testpass123",
        )

        self.outsider = User.objects.create_user(
            username="download_outsider",
            password="testpass123",
        )

        self.workspace = Workspace.objects.create(
            name="Download Test Workspace",
            description="Workspace for download tests",
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

        self.workspace_file = WorkspaceFile.objects.create(
            workspace=self.workspace,
            name="download-document.txt",
            uploaded_file=SimpleUploadedFile(
                "download-document.txt",
                b"StudyGram download test content",
                content_type="text/plain",
            ),
            file_type="text/plain",
            size=len(b"StudyGram download test content"),
            created_by=self.admin,
        )

        self.url = reverse(
            "workspace-file-download",
            kwargs={
                "workspace_pk": self.workspace.pk,
                "pk": self.workspace_file.pk,
            },
        )

    def test_admin_can_download_file(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            b"".join(response.streaming_content),
            b"StudyGram download test content",
        )

    def test_member_can_download_file(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            b"".join(response.streaming_content),
            b"StudyGram download test content",
        )

    def test_outsider_cannot_download_file(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_download_file(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_cannot_download_file_from_another_workspace(self):
        other_workspace = Workspace.objects.create(
            name="Other Download Workspace",
            description="Another workspace",
            owner=self.admin,
        )

        other_file = WorkspaceFile.objects.create(
            workspace=other_workspace,
            name="secret.txt",
            uploaded_file=SimpleUploadedFile(
                "secret.txt",
                b"Secret content",
                content_type="text/plain",
            ),
            file_type="text/plain",
            size=len(b"Secret content"),
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            reverse(
                "workspace-file-download",
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


class WorkspaceFolderPasteTests(APITestCase):
    def setUp(self):
        self.media_dir = tempfile.TemporaryDirectory()
        media_override = override_settings(MEDIA_ROOT=self.media_dir.name)
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.addCleanup(self.media_dir.cleanup)

        self.admin = User.objects.create_user('paste_admin', password='testpass123')
        self.member = User.objects.create_user('paste_member', password='testpass123')
        self.workspace = Workspace.objects.create(
            name='Paste Workspace', description='Folder copy and move tests', owner=self.admin,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace, user=self.admin, role=WorkspaceMembership.Role.ADMIN,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace, user=self.member, role=WorkspaceMembership.Role.MEMBER,
        )
        self.source = WorkspaceFolder.objects.create(
            workspace=self.workspace, name='Source', created_by=self.admin,
        )
        self.destination = WorkspaceFolder.objects.create(
            workspace=self.workspace, name='Destination', created_by=self.admin,
        )
        self.url = reverse(
            'workspace-folder-paste',
            kwargs={'workspace_pk': self.workspace.pk, 'pk': self.source.pk},
        )

    def test_copy_duplicates_nested_folders_and_file_contents(self):
        child = WorkspaceFolder.objects.create(
            workspace=self.workspace, parent=self.source, name='Notes', created_by=self.admin,
        )
        original = WorkspaceFile.objects.create(
            workspace=self.workspace,
            folder=child,
            name='lesson.txt',
            uploaded_file=SimpleUploadedFile('lesson.txt', b'copy me', content_type='text/plain'),
            file_type='text/plain',
            size=7,
            created_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        with patch.object(
            original.uploaded_file.storage,
            'size',
            side_effect=AssertionError('copy should use persisted file size'),
        ) as storage_size:
            response = self.client.post(
                self.url,
                {'mode': 'copy', 'parent': self.destination.pk},
                format='json',
            )
        storage_size.assert_not_called()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        copied_root = WorkspaceFolder.objects.get(pk=response.data['id'])
        copied_child = WorkspaceFolder.objects.get(parent=copied_root, name='Notes')
        copied_file = WorkspaceFile.objects.get(folder=copied_child, name='lesson.txt')
        self.assertEqual(copied_root.parent, self.destination)
        self.assertNotEqual(copied_file.uploaded_file.name, original.uploaded_file.name)
        with copied_file.uploaded_file.open('rb') as copied_content:
            self.assertEqual(copied_content.read(), b'copy me')

    def test_move_updates_parent(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url, {'mode': 'move', 'parent': self.destination.pk}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.source.refresh_from_db()
        self.assertEqual(self.source.parent, self.destination)

    def test_copy_into_source_or_descendant_is_rejected(self):
        child = WorkspaceFolder.objects.create(
            workspace=self.workspace, parent=self.source, name='Child', created_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url, {'mode': 'copy', 'parent': child.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(WorkspaceFolder.objects.filter(name__startswith='Source (copy)').count(), 0)

    def test_cross_workspace_destination_is_rejected(self):
        other_workspace = Workspace.objects.create(
            name='Other', description='Other workspace', owner=self.admin,
        )
        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace, name='Other destination', created_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url, {'mode': 'move', 'parent': other_folder.pk}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_members_cannot_copy_or_move_folders(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(self.url, {'mode': 'move'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.source.refresh_from_db()
        self.assertIsNone(self.source.parent)

    def create_file(self, folder=None, name='notes.txt'):
        return WorkspaceFile.objects.create(
            workspace=self.workspace,
            folder=folder,
            name=name,
            uploaded_file=SimpleUploadedFile(
                name, b'file clipboard content', content_type='text/plain',
            ),
            file_type='text/plain',
            size=len(b'file clipboard content'),
            created_by=self.admin,
        )

    def file_paste_url(self, workspace, workspace_file):
        return reverse(
            'workspace-file-paste',
            kwargs={'workspace_pk': workspace.pk, 'pk': workspace_file.pk},
        )

    def test_file_copy_duplicates_stored_content_and_uses_unique_name(self):
        source_file = self.create_file(self.source)
        self.client.force_authenticate(user=self.admin)

        with patch.object(
            source_file.uploaded_file.storage,
            'size',
            side_effect=AssertionError('copy should use persisted file size'),
        ) as storage_size:
            response = self.client.post(
                self.file_paste_url(self.workspace, source_file),
                {'mode': 'copy', 'parent': self.destination.pk},
                format='json',
            )
        storage_size.assert_not_called()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        copied = WorkspaceFile.objects.get(pk=response.data['id'])
        self.assertEqual(copied.folder, self.destination)
        self.assertEqual(copied.name, 'notes (copy).txt')
        self.assertNotEqual(copied.uploaded_file.name, source_file.uploaded_file.name)
        with copied.uploaded_file.open('rb') as content:
            self.assertEqual(content.read(), b'file clipboard content')

    def test_file_move_updates_folder_without_copying_storage(self):
        source_file = self.create_file(self.source)
        stored_name = source_file.uploaded_file.name
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.file_paste_url(self.workspace, source_file),
            {'mode': 'move', 'parent': self.destination.pk},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        source_file.refresh_from_db()
        self.assertEqual(source_file.folder, self.destination)
        self.assertEqual(source_file.uploaded_file.name, stored_name)

    def test_file_paste_rejects_cross_workspace_destination(self):
        source_file = self.create_file(self.source)
        other_workspace = Workspace.objects.create(
            name='File Paste Other', description='Other workspace', owner=self.admin,
        )
        other_folder = WorkspaceFolder.objects.create(
            workspace=other_workspace, name='External', created_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.file_paste_url(self.workspace, source_file),
            {'mode': 'move', 'parent': other_folder.pk},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        source_file.refresh_from_db()
        self.assertEqual(source_file.folder, self.source)
