from rest_framework import serializers

import os
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

        # Prevent a folder from being moved beneath itself
        # or any of its descendants.
        if self.instance is not None:
            current = value

            while current is not None:
                if current.pk == self.instance.pk:
                    raise serializers.ValidationError(
                        "A folder cannot be moved into itself "
                        "or one of its descendants."
                    )

                current = current.parent

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
            "uploaded_file",
            "file_type",
            "size",
            "created_by",
            "created_at",
            "updated_at",
        ]

    ALLOWED_FILE_TYPES = {
        '.pdf': {'application/pdf'},
        '.txt': {'text/plain'},
        '.doc': {'application/msword'},
        '.docx': {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        },
        '.xls': {'application/vnd.ms-excel'},
        '.xlsx': {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        '.ppt': {'application/vnd.ms-powerpoint'},
        '.pptx': {
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        },
        '.csv': {'text/csv', 'application/vnd.ms-excel'},
        '.png': {'image/png'},
        '.jpg': {'image/jpeg'},
        '.jpeg': {'image/jpeg'},
        '.gif': {'image/gif'},
        '.webp': {'image/webp'},
    }

    def validate_uploaded_file(self, uploaded_file):
        if not uploaded_file:
            return uploaded_file

        filename = uploaded_file.name
        extension = os.path.splitext(filename)[1].lower()

        allowed_mime_types = self.ALLOWED_FILE_TYPES.get(extension)

        if not allowed_mime_types:
            raise serializers.ValidationError(
                'This file type is not allowed.'
            )

        content_type = uploaded_file.content_type

        if content_type not in allowed_mime_types:
            raise serializers.ValidationError(
                'The file content type does not match the permitted type '
                'for this extension.'
            )

        return uploaded_file

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

    def validate(self, attrs):
        request = self.context.get("request")
        uploaded_file = (
            request.FILES.get("uploaded_file")
            if request
            else None
        )

        if self.instance is None and uploaded_file is None:
            raise serializers.ValidationError({
                "uploaded_file": "A file is required."
            })

        if uploaded_file:
            extension = os.path.splitext(
                uploaded_file.name
            )[1].lower()

            allowed_mime_types = self.ALLOWED_FILE_TYPES.get(
                extension
            )

            if not allowed_mime_types:
                raise serializers.ValidationError({
                    "uploaded_file": "This file type is not allowed."
                })

            if uploaded_file.content_type not in allowed_mime_types:
                raise serializers.ValidationError({
                    "uploaded_file": (
                        "The file content type does not match "
                        "the permitted type for this extension."
                    )
                })

            max_size = 100 * 1024 * 1024  # 100 MB

            if uploaded_file.size > max_size:
                raise serializers.ValidationError({
                    "uploaded_file": "File size cannot exceed 100 MB."
                })

        return attrs