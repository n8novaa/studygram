from django.utils import timezone
from rest_framework import serializers

from base.api.serializers import PublicUserSerializer

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
    # The frontend uses this value as the member's stable username identity;
    # StringRelatedField would return WorkspaceMembership.__str__ instead.
    user = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.CharField(
        source='user.profile.display_name',
        read_only=True,
    )
    avatar = serializers.ImageField(
        source='user.profile.avatar',
        read_only=True,
    )

    class Meta:
        model = WorkspaceMembership
        fields = [
            'user_id',
            'user',
            'display_name',
            'avatar',
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
            context=self.context,
        ).data


class WorkspaceJoinRequestSerializer(
    serializers.ModelSerializer
):
    user = serializers.StringRelatedField(read_only=True)
    workspace = serializers.StringRelatedField(read_only=True)
    display_name = serializers.CharField(
        source='user.profile.display_name',
        read_only=True,
    )
    avatar = serializers.ImageField(
        source='user.profile.avatar',
        read_only=True,
    )

    class Meta:
        model = WorkspaceJoinRequest
        fields = [
            'id',
            'workspace',
            'user',
            'display_name',
            'avatar',
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
            'max_uses',
            'uses',
            'revoked_at',
        ]
        read_only_fields = [
            'id',
            'workspace',
            'created_by',
            'token',
            'created',
            'uses',
            'revoked_at',
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

        if invitation.revoked_at is not None:
            raise serializers.ValidationError(
                'This invitation has been revoked.'
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

    def to_representation(self, instance):
        data = super().to_representation(instance)

        request = self.context.get('request')

        if (
            instance.visibility == 'private'
            and request is not None
            and not instance.memberships.filter(
                user=request.user
            ).exists()
        ):
            data.pop('description', None)
            data.pop('owner', None)

        return data


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
    user = PublicUserSerializer(read_only=True)
    

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
    user = PublicUserSerializer(read_only=True)
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

        if len(value) > 10000:
            raise serializers.ValidationError(
                'Message body cannot exceed 10,000 characters.'
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


class RecentWorkspaceActivitySerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='user.username', read_only=True)
    author_display_name = serializers.CharField(
        source='user.profile.display_name',
        read_only=True,
    )
    author_avatar = serializers.ImageField(
        source='user.profile.avatar',
        read_only=True,
    )
    workspace_id = serializers.IntegerField(
        source='channel.workspace_id',
        read_only=True,
    )
    workspace_name = serializers.CharField(
        source='channel.workspace.name',
        read_only=True,
    )
    channel_id = serializers.IntegerField(read_only=True)
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    preview = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceChannelMessage
        fields = [
            'id',
            'author_username',
            'author_display_name',
            'author_avatar',
            'workspace_id',
            'workspace_name',
            'channel_id',
            'channel_name',
            'preview',
            'created',
        ]
        read_only_fields = fields

    def get_preview(self, obj):
        text = ' '.join(obj.body.split())
        if len(text) <= 200:
            return text
        return f'{text[:197].rstrip()}…'
