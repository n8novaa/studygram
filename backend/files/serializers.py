from rest_framework import serializers

from .models import WorkspaceFile, WorkspaceFolder


class WorkspaceFolderSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = WorkspaceFolder
        fields = [
            "id",
            "workspace",
            "parent",
            "name",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Folder name cannot be empty."
            )

        return value

    def validate_parent(self, value):
        if value is None:
            return value

        workspace = self.context.get("workspace")

        if workspace is None:
            raise serializers.ValidationError(
                "Workspace context is required."
            )

        if value.workspace_id != workspace.id:
            raise serializers.ValidationError(
                "Parent folder must belong to this workspace."
            )

        return value


class WorkspaceFileSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = WorkspaceFile
        fields = [
            "id",
            "workspace",
            "folder",
            "name",
            "uploaded_file",
            "file_type",
            "size",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "created_by",
            "file_type",
            "size",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "File name cannot be empty."
            )

        return value

    def validate_folder(self, value):
        if value is None:
            return value

        workspace = self.context.get("workspace")

        if workspace is None:
            raise serializers.ValidationError(
                "Workspace context is required."
            )

        if value.workspace_id != workspace.id:
            raise serializers.ValidationError(
                "Folder must belong to this workspace."
            )

        return value