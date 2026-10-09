from django.utils import timezone
from rest_framework import serializers

from base.api.serializers import UserSerializer

from .models import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceJoinRequest,
    WorkspaceMembership,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceChannelMessageReaction,
)


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = WorkspaceMembership
        fields = [
            'user_id',
            'user',
            'role',
            'created',
        ]
        read_only_fields = [
            'user_id',
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
        # Use the prefetched memberships from WorkspaceViewSet
        # instead of creating another database queryset.
        memberships = obj.memberships.all()

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

    # This value is supplied by the queryset annotation:
    # Count('memberships')
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'description',
            'owner',
            'visibility',
            'member_count',
            'created',
            'updated',
        ]
        read_only_fields = [
            'id',
            'name',
            'description',
            'owner',
            'visibility',
            'member_count',
            'created',
            'updated',
        ]


class WorkspaceChannelSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = WorkspaceChannel
        fields = [
            'id',
            'workspace',
            'name',
            'description',
            'created_by',
            'created',
            'updated',
        ]
        read_only_fields = [
            'id',
            'workspace',
            'created_by',
            'created',
            'updated',
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                'Channel name cannot be empty.'
            )

        return value

class WorkspaceChannelMessageReactionSerializer(
    serializers.ModelSerializer
):
    user = UserSerializer(read_only=True)
    

    class Meta:
        model = WorkspaceChannelMessageReaction
        fields = [
            'id',
            'user',
            'emoji',
            'created',
        ]
        read_only_fields = [
            'id',
            'user',
            'created',
        ]

class WorkspaceChannelMessageSerializer(
    serializers.ModelSerializer
):
    user = UserSerializer(read_only=True)
    reactions = WorkspaceChannelMessageReactionSerializer(
            many=True,
            read_only=True,
        )
    is_edited = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceChannelMessage
        fields = [
            'id',
            'channel',
            'user',
            'body',
            'reply_to',
            'created',
            'updated',
            'is_edited',
            'reactions',
        ]
        read_only_fields = [
            'id',
            'channel',
            'user',
            'created',
            'updated',
            'is_edited',
        ]

    def validate_body(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                'Message body cannot be empty.'
            )

        return value

    def validate_reply_to(self, value):
        if value.channel_id != self.instance.channel_id if self.instance else False:
            raise serializers.ValidationError(
                'You can only reply to a message in the same channel.'
            )

        return value

    def get_is_edited(self, obj):
        return obj.updated > obj.created