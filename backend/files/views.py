from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from workspaces.models import Workspace

from .models import WorkspaceFile, WorkspaceFolder
from .permissions import (
    IsWorkspaceFileAdmin,
    IsWorkspaceFileMember,
)
from .serializers import (
    WorkspaceFileSerializer,
    WorkspaceFolderSerializer,
)

class WorkspaceFolderListView(generics.ListAPIView):
    serializer_class = WorkspaceFolderSerializer
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceFileMember,
    ]

    def get_queryset(self):
        workspace_id = self.kwargs["workspace_pk"]
        parent_id = self.request.query_params.get("parent")

        queryset = WorkspaceFolder.objects.filter(
            workspace_id=workspace_id
        )

        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        else:
            queryset = queryset.filter(parent__isnull=True)

        return queryset


class WorkspaceFileListView(generics.ListAPIView):
    serializer_class = WorkspaceFileSerializer
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceFileMember,
    ]

    def get_queryset(self):
        workspace_id = self.kwargs["workspace_pk"]
        folder_id = self.request.query_params.get("folder")

        queryset = WorkspaceFile.objects.filter(
            workspace_id=workspace_id
        )

        if folder_id:
            queryset = queryset.filter(
                folder_id=folder_id,
                folder__workspace_id=workspace_id,
            )
        else:
            queryset = queryset.filter(
                folder__isnull=True
            )

        return queryset
        
class WorkspaceFileDetailView(generics.RetrieveAPIView):
    serializer_class = WorkspaceFileSerializer
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceFileMember,
    ]

    def get_queryset(self):
        workspace_id = self.kwargs["workspace_pk"]

        return WorkspaceFile.objects.filter(
            workspace_id=workspace_id
        )


class WorkspaceFolderCreateView(generics.CreateAPIView):
    serializer_class = WorkspaceFolderSerializer
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceFileAdmin,
    ]

    def get_serializer_context(self):
        context = super().get_serializer_context()

        context["workspace"] = self.get_workspace()

        return context

    def get_workspace(self):
        from workspaces.models import Workspace

        return Workspace.objects.get(
            pk=self.kwargs["workspace_pk"]
        )

    def perform_create(self, serializer):
        serializer.save(
            workspace=self.get_workspace(),
            created_by=self.request.user,
        )

class WorkspaceFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceFolderSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            permission_classes = [
                IsAuthenticated,
                IsWorkspaceFileMember,
            ]
        else:
            permission_classes = [
                IsAuthenticated,
                IsWorkspaceFileAdmin,
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    def get_workspace(self):
        return get_object_or_404(
            Workspace,
            pk=self.kwargs["workspace_pk"],
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        context["workspace"] = self.get_workspace()

        return context

    def get_queryset(self):
        return WorkspaceFolder.objects.filter(
            workspace_id=self.kwargs["workspace_pk"]
        )

class WorkspaceFileCreateView(generics.CreateAPIView):
    serializer_class = WorkspaceFileSerializer
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceFileAdmin,
    ]

    def get_workspace(self):
        return get_object_or_404(
            Workspace,
            pk=self.kwargs["workspace_pk"],
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        context["workspace"] = self.get_workspace()

        return context

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get("uploaded_file")

        serializer.save(
            workspace=self.get_workspace(),
            created_by=self.request.user,
            file_type=(
                uploaded_file.content_type
                if uploaded_file
                else ""
            ),
            size=(
                uploaded_file.size
                if uploaded_file
                else 0
            ),
        )