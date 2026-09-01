from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..permissions import IsWorkspaceAdmin

from django.db import transaction

from ..models import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceJoinRequest,
    WorkspaceMembership,
)
from ..serializers import (
    AcceptInvitationSerializer,
    WorkspaceInvitationSerializer,
    WorkspaceJoinRequestSerializer,
    WorkspaceMemberSerializer,
)


class WorkspaceJoinView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
        
        ]

    def post(self, request, workspace_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        # The owner/admin/member cannot join a workspace
        # they already belong to.
        if WorkspaceMembership.objects.filter(
            workspace=workspace,
            user=request.user,
        ).exists():
            return Response(
                {
                    'detail': 'You are already a member of this workspace.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # PUBLIC workspace:
        # immediately create a normal membership.
        if workspace.visibility == Workspace.Visibility.PUBLIC:
            membership = WorkspaceMembership.objects.create(
                workspace=workspace,
                user=request.user,
                role=WorkspaceMembership.Role.MEMBER,
            )

            return Response(
                {
                    'detail': 'Successfully joined workspace.',
                    'workspace_id': workspace.id,
                    'workspace_name': workspace.name,
                    'role': membership.role,
                },
                status=status.HTTP_201_CREATED,
            )

        # PRIVATE workspace:
        # create a pending request instead.
        join_request, created = (
            WorkspaceJoinRequest.objects.get_or_create(
                workspace=workspace,
                user=request.user,
            )
        )

        if not created:
            if (
                join_request.status
                == WorkspaceJoinRequest.Status.PENDING
            ):
                return Response(
                    {
                        'detail': (
                            'Your join request is already pending.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Allow a user whose previous request was rejected
            # to request access again.
            join_request.status = (
                WorkspaceJoinRequest.Status.PENDING
            )
            join_request.reviewed_at = None
            join_request.save(
                update_fields=['status', 'reviewed_at']
            )

        return Response(
            {
                'detail': 'Join request submitted.',
                'workspace_id': workspace.id,
                'workspace_name': workspace.name,
                'status': join_request.status,
            },
            status=status.HTTP_201_CREATED,
        )


class WorkspaceJoinRequestListView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
        ]

    def get(self, request, workspace_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        

        requests = (
            WorkspaceJoinRequest.objects
            .filter(
                workspace=workspace,
                status=WorkspaceJoinRequest.Status.PENDING,
            )
            .select_related('user')
        )

        serializer = WorkspaceJoinRequestSerializer(
            requests,
            many=True,
        )

        return Response(serializer.data)


class WorkspaceJoinRequestApproveView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
        ]

    def post(self, request, workspace_pk, request_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        

        join_request = get_object_or_404(
            WorkspaceJoinRequest,
            pk=request_pk,
            workspace=workspace,
        )

        if (
            join_request.status
            != WorkspaceJoinRequest.Status.PENDING
        ):
            return Response(
                {
                    'detail': (
                        'This request has already been reviewed.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            WorkspaceMembership.objects.create(
                workspace=workspace,
                user=join_request.user,
                role=WorkspaceMembership.Role.MEMBER,
            )

            join_request.status = (
                WorkspaceJoinRequest.Status.APPROVED
            )
            join_request.reviewed_at = timezone.now()
            join_request.save(
                update_fields=['status', 'reviewed_at']
            )

        return Response(
            {
                'detail': 'Join request approved.',
                'user': join_request.user.username,
                'workspace_id': workspace.id,
                'role': WorkspaceMembership.Role.MEMBER,
            },
            status=status.HTTP_200_OK,
        )


class WorkspaceJoinRequestRejectView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
        ]

    def post(self, request, workspace_pk, request_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        

        join_request = get_object_or_404(
            WorkspaceJoinRequest,
            pk=request_pk,
            workspace=workspace,
        )

        if (
            join_request.status
            != WorkspaceJoinRequest.Status.PENDING
        ):
            return Response(
                {
                    'detail': (
                        'This request has already been reviewed.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        join_request.status = (
            WorkspaceJoinRequest.Status.REJECTED
        )
        join_request.reviewed_at = timezone.now()

        join_request.save(
            update_fields=['status', 'reviewed_at']
        )

        return Response(
            {
                'detail': 'Join request rejected.',
                'user': join_request.user.username,
                'workspace_id': workspace.id,
            },
            status=status.HTTP_200_OK,
        )


class WorkspaceInvitationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, workspace_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        membership = WorkspaceMembership.objects.filter(
            workspace=workspace,
            user=request.user,
        ).first()

        if (
            not membership
            or membership.role != WorkspaceMembership.Role.ADMIN
        ):
            return Response(
                {
                    'detail': (
                        'Only workspace admins can create invitations.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        invitation = WorkspaceInvitation.objects.create(
            workspace=workspace,
            created_by=request.user,
            expires_at=(
                timezone.now()
                + timezone.timedelta(days=7)
            ),
        )

        serializer = WorkspaceInvitationSerializer(
            invitation
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class AcceptInvitationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(
            WorkspaceInvitation.objects.select_related(
                'workspace'
            ),
            token=token,
        )

        serializer = AcceptInvitationSerializer(
            data={},
            context={
                'request': request,
                'invitation': invitation,
            },
        )

        serializer.is_valid(raise_exception=True)

        membership = WorkspaceMembership.objects.create(
            workspace=invitation.workspace,
            user=request.user,
            role=WorkspaceMembership.Role.MEMBER,
        )

        return Response(
            {
                'detail': 'Successfully joined workspace.',
                'workspace_id': invitation.workspace.id,
                'workspace_name': invitation.workspace.name,
                'role': membership.role,
            },
            status=status.HTTP_201_CREATED,
        )

class WorkspaceMemberListView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
    ]

    def get(self, request, workspace_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )


        memberships = (
            WorkspaceMembership.objects
            .filter(workspace=workspace)
            .select_related('user')
        )

        serializer = WorkspaceMemberSerializer(
            memberships,
            many=True,
        )

        return Response(serializer.data)

class WorkspaceMemberPromoteView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
    ]

    def post(self, request, workspace_pk, user_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        

        membership = get_object_or_404(
            WorkspaceMembership,
            workspace=workspace,
            user_id=user_pk,
        )

        if membership.role == WorkspaceMembership.Role.ADMIN:
            return Response(
                {
                    'detail': 'User is already an admin.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.role = WorkspaceMembership.Role.ADMIN
        membership.save(update_fields=['role'])

        return Response(
            {
                'detail': 'Member promoted to admin.',
                'user': membership.user.username,
                'workspace_id': workspace.id,
                'role': membership.role,
            },
            status=status.HTTP_200_OK,
        )

class WorkspaceMemberDemoteView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
    ]

    def post(self, request, workspace_pk, user_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )


        membership = get_object_or_404(
            WorkspaceMembership,
            workspace=workspace,
            user_id=user_pk,
        )

        if membership.user_id == workspace.owner_id:
            return Response(
                {
                    'detail': 'The workspace owner cannot be demoted.'
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if membership.role == WorkspaceMembership.Role.MEMBER:
            return Response(
                {
                    'detail': 'User is already a member.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.role = WorkspaceMembership.Role.MEMBER
        membership.save(update_fields=['role'])

        return Response(
            {
                'detail': 'Admin demoted to member.',
                'user': membership.user.username,
                'workspace_id': workspace.id,
                'role': membership.role,
            },
            status=status.HTTP_200_OK,
        )


class WorkspaceMemberRemoveView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsWorkspaceAdmin,
    ]

    def delete(self, request, workspace_pk, user_pk):
        workspace = get_object_or_404(
            Workspace,
            pk=workspace_pk,
        )

        membership = get_object_or_404(
            WorkspaceMembership,
            workspace=workspace,
            user_id=user_pk,
        )

        # The owner cannot be removed from their own workspace.
        if membership.user_id == workspace.owner_id:
            return Response(
                {
                    'detail': (
                        'The workspace owner cannot be removed.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # An admin cannot remove themselves.
        if membership.user_id == request.user.id:
            return Response(
                {
                    'detail': (
                        'You cannot remove yourself from the workspace.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = membership.user.username

        membership.delete()

        return Response(
            {
                'detail': 'Member removed from workspace.',
                'user': username,
                'workspace_id': workspace.id,
            },
            status=status.HTTP_200_OK,
        )