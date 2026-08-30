from django.utils import timezone
from rest_framework import serializers

from .models import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceJoinRequest,
    WorkspaceMembership,
)


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = WorkspaceMembership
        fields = [
            'user',
            'role',
            'created',
        ]
        read_only_fields = [
            'user',
            'role',
            'created',
        ]


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField(read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'description',
            'owner',
            'visibility',
            'members',
            'created',
            'updated',
        ]
        read_only_fields = [
            'id',
            'owner',
            'members',
            'created',
            'updated',
        ]

    def get_members(self, obj):
        memberships = obj.memberships.select_related('user')

        return WorkspaceMemberSerializer(
            memberships,
            many=True,
        ).data


class WorkspaceJoinRequestSerializer(
    serializers.ModelSerializer
):
    user = serializers.StringRelatedField(read_only=True)
    workspace = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = WorkspaceJoinRequest
        fields = [
            'id',
            'workspace',
            'user',
            'status',
            'created',
            'reviewed_at',
        ]
        read_only_fields = [
            'id',
            'workspace',
            'user',
            'status',
            'created',
            'reviewed_at',
        ]


class WorkspaceInvitationSerializer(
    serializers.ModelSerializer
):
    workspace = serializers.StringRelatedField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = WorkspaceInvitation
        fields = [
            'id',
            'workspace',
            'created_by',
            'token',
            'created',
            'expires_at',
        ]
        read_only_fields = [
            'id',
            'workspace',
            'created_by',
            'token',
            'created',
        ]

    def validate_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Invitation expiration must be in the future.'
            )

        return value


class AcceptInvitationSerializer(serializers.Serializer):

    def validate(self, attrs):
        invitation = self.context['invitation']
        user = self.context['request'].user

        if invitation.expires_at <= timezone.now():
            raise serializers.ValidationError(
                'This invitation has expired.'
            )

        if WorkspaceMembership.objects.filter(
            workspace=invitation.workspace,
            user=user,
        ).exists():
            raise serializers.ValidationError(
                'You are already a member of this workspace.'
            )

        attrs['invitation'] = invitation

        return attrs

class WorkspaceDiscoverSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField(read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'owner',
            'visibility',
            'member_count',
            'created',
            'updated',
        ]
        read_only_fields = [
            'id',
            'name',
            'owner',
            'visibility',
            'member_count',
            'created',
            'updated',
        ]

    def get_member_count(self, obj):
        return obj.memberships.count()