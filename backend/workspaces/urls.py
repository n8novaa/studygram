from django.urls import path
from rest_framework.routers import DefaultRouter

from .views.workspace import WorkspaceViewSet

from files.views import (
    WorkspaceFileListView,
    WorkspaceFileDetailView,
    WorkspaceFolderListView,
    WorkspaceFolderCreateView,
    WorkspaceFolderDetailView,
    WorkspaceFileCreateView,
    WorkspaceFileDownloadView,
)

from .views.access import (
    WorkspaceJoinRequestApproveView,
    WorkspaceJoinRequestListView,
    WorkspaceJoinRequestRejectView,
    WorkspaceJoinView,
    WorkspaceInvitationCreateView,
    AcceptInvitationView,
    WorkspaceMemberListView,
    WorkspaceMemberPromoteView,
    WorkspaceMemberDemoteView,
    WorkspaceMemberRemoveView,
)

from .views.channels import (
    WorkspaceChannelListCreateView,
    WorkspaceChannelDetailView,
    
)

from .views.channel_messages import (
    WorkspaceChannelMessageListCreateView,
    WorkspaceChannelMessageDetailView,
)


router = DefaultRouter()

router.register(
    'workspaces',
    WorkspaceViewSet,
    basename='workspace',
)


urlpatterns = [
    # ---------------------------------------------------------
    # Workspace access
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Invitations
    # ---------------------------------------------------------

    path(
        'workspaces/<int:workspace_pk>/invitations/create/',
        WorkspaceInvitationCreateView.as_view(),
        name='workspace-invitation-create',
    ),

    path(
        'workspaces/invitations/<str:token>/accept/',
        AcceptInvitationView.as_view(),
        name='workspace-invitation-accept',
    ),

    # ---------------------------------------------------------
    # Folders
    # ---------------------------------------------------------

    path(
        'workspaces/<int:workspace_pk>/folders/',
        WorkspaceFolderListView.as_view(),
        name='workspace-folder-list',
    ),

    path(
        'workspaces/<int:workspace_pk>/folders/create/',
        WorkspaceFolderCreateView.as_view(),
        name='workspace-folder-create',
    ),

    path(
        'workspaces/<int:workspace_pk>/folders/<int:pk>/',
        WorkspaceFolderDetailView.as_view(),
        name='workspace-folder-detail',
    ),

    # ---------------------------------------------------------
    # Files
    # ---------------------------------------------------------

    path(
        'workspaces/<int:workspace_pk>/files/',
        WorkspaceFileListView.as_view(),
        name='workspace-file-list',
    ),

    path(
        'workspaces/<int:workspace_pk>/files/upload/',
        WorkspaceFileCreateView.as_view(),
        name='workspace-file-upload',
    ),

    path(
        'workspaces/<int:workspace_pk>/files/<int:pk>/',
        WorkspaceFileDetailView.as_view(),
        name='workspace-file-detail',
    ),

    path(
        'workspaces/<int:workspace_pk>/files/<int:pk>/download/',
        WorkspaceFileDownloadView.as_view(),
        name='workspace-file-download',
    ),


    # ---------------------------------------------------------
    # Channels
    # ---------------------------------------------------------

    path(
        'workspaces/<int:workspace_pk>/channels/',
        WorkspaceChannelListCreateView.as_view(),
        name='workspace-channel-list-create',
    ),

    path(
        'workspaces/<int:workspace_pk>/channels/',
        WorkspaceChannelListCreateView.as_view(),
        name='workspace-channel-list-create',
    ),

    path(
        'workspaces/<int:workspace_pk>/channels/<int:channel_pk>/',
        WorkspaceChannelDetailView.as_view(),
        name='workspace-channel-detail',
    ),

    path(
        'workspaces/<int:workspace_pk>/channels/<int:channel_pk>/messages/',
        WorkspaceChannelMessageListCreateView.as_view(),
        name='workspace-channel-message-list-create',
    ),

    path(
        'workspaces/<int:workspace_pk>/channels/<int:channel_pk>/messages/<int:message_pk>/',
        WorkspaceChannelMessageDetailView.as_view(),
        name='workspace-channel-message-detail',
    ),

    # ---------------------------------------------------------
    # Members
    # ---------------------------------------------------------

    path(
        'workspaces/<int:workspace_pk>/members/',
        WorkspaceMemberListView.as_view(),
        name='workspace-members',
    ),

    path(
        'workspaces/<int:workspace_pk>/members/<int:user_pk>/promote/',
        WorkspaceMemberPromoteView.as_view(),
        name='workspace-member-promote',
    ),

    path(
        'workspaces/<int:workspace_pk>/members/<int:user_pk>/demote/',
        WorkspaceMemberDemoteView.as_view(),
        name='workspace-member-demote',
    ),

    path(
        'workspaces/<int:workspace_pk>/members/<int:user_pk>/remove/',
        WorkspaceMemberRemoveView.as_view(),
        name='workspace-member-remove',
    ),
]


urlpatterns += router.urls