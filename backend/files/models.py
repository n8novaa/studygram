from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from workspaces.models import Workspace


class WorkspaceFolder(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="folders",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    name = models.CharField(max_length=255)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_workspace_folders",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def clean(self):
        if self.parent and self.parent.workspace_id != self.workspace_id:
            raise ValidationError(
                "A folder's parent must belong to the same workspace."
            )

        if self.parent and self.parent.pk == self.pk:
            raise ValidationError(
                "A folder cannot be its own parent."
            )

    def __str__(self):
        return self.name


class WorkspaceFile(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="files",
    )

    folder = models.ForeignKey(
        WorkspaceFolder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="files",
    )

    name = models.CharField(max_length=255)

    uploaded_file = models.FileField(
        upload_to="workspace_files/%Y/%m/%d/",
    )

    file_type = models.CharField(
        max_length=100,
        blank=True,
    )

    size = models.PositiveBigIntegerField(
        default=0,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_workspace_files",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def clean(self):
        if self.folder and self.folder.workspace_id != self.workspace_id:
            raise ValidationError(
                "A file's folder must belong to the same workspace."
            )

    def __str__(self):
        return self.name