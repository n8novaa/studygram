
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership

from files.models import WorkspaceFile


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
            name="File Download Workspace",
            description="Workspace for file download tests",
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
            name="document.txt",
            content=b"StudyGram test file",
            content_type="text/plain",
        )

        self.url = reverse(
            "workspace-file-download",
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

    def test_admin_can_download_file(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response["Content-Disposition"],
            'attachment; filename="document.txt"',
        )

        self.assertEqual(
            response.getvalue(),
            b"StudyGram test file",
        )

    def test_member_can_download_file(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.getvalue(),
            b"StudyGram test file",
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

    def test_file_from_another_workspace_cannot_be_downloaded(self):
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

    def test_nonexistent_file_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            reverse(
                "workspace-file-download",
                kwargs={
                    "workspace_pk": self.workspace.pk,
                    "pk": 999999,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

