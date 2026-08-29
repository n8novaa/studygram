from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    WorkspaceJoinRequestApproveView,
    WorkspaceJoinRequestListView,
    WorkspaceJoinRequestRejectView,
    WorkspaceJoinView,
    WorkspaceViewSet,
)


router = DefaultRouter()

router.register(
    'workspaces',
    WorkspaceViewSet,
    basename='workspace',
)

urlpatterns = [
    path(
        'workspaces/<int:workspace_pk>/join/',
        WorkspaceJoinView.as_view(),
        name='workspace-join',
    ),

    path(
        'workspaces/<int:workspace_pk>/join-requests/',
        WorkspaceJoinRequestListView.as_view(),
        name='workspace-join-requests',
    ),

    path(
        'workspaces/<int:workspace_pk>/join-requests/<int:request_pk>/approve/',
        WorkspaceJoinRequestApproveView.as_view(),
        name='workspace-join-request-approve',
    ),

    path(
        'workspaces/<int:workspace_pk>/join-requests/<int:request_pk>/reject/',
        WorkspaceJoinRequestRejectView.as_view(),
        name='workspace-join-request-reject',
    ),
]

urlpatterns += router.urls