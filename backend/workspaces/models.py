import secrets
import uuid

from django.contrib.auth.models import User
from django.db import models


class Workspace(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = 'public', 'Public'
        PRIVATE = 'private', 'Private'

    name = models.CharField(max_length=150)

    description = models.TextField(blank=True)

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_workspaces',
    )

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )

    created = models.DateTimeField(auto_now_add=True)

    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated', '-created']

    def __str__(self):
        return self.name


class WorkspaceMembership(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        MEMBER = 'member', 'Member'

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='memberships',
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_memberships',
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )

    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'user'],
                name='unique_workspace_membership',
            ),
        ]

    def __str__(self):
        return (
            f'{self.user.username} - '
            f'{self.workspace.name} '
            f'({self.role})'
        )


class WorkspacePresenceConnection(models.Model):
    """A short-lived lease for one authenticated workspace WebSocket."""

    connection_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='presence_connections',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_presence_connections',
    )
    connected_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=['workspace', 'last_seen'],
                name='ws_presence_ws_seen_idx',
            ),
            models.Index(
                fields=['workspace', 'user', 'last_seen'],
                name='ws_presence_ws_user_seen_idx',
            ),
        ]

class WorkspaceChannel(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='channels',
    )

    name = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workspace_channels',
    )

    created = models.DateTimeField(auto_now_add=True)

    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'name'],
                name='unique_workspace_channel_name',
            ),
        ]

        ordering = ['created']

    def __str__(self):
        return f'{self.workspace.name} - #{self.name}'


class WorkspaceChannelMessage(models.Model):
    channel = models.ForeignKey(
        WorkspaceChannel,
        on_delete=models.CASCADE,
        related_name='messages',
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_channel_messages',
    )

    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
    )

    body = models.TextField()

    created = models.DateTimeField(auto_now_add=True)

    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created']

    def __str__(self):
        return (
            f'{self.user.username} in '
            f'#{self.channel.name}: '
            f'{self.body[:50]}'
        )


class WorkspaceChannelReadPosition(models.Model):
    """Highest message a member has actually reached in a channel."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='channel_read_positions'
    )
    channel = models.ForeignKey(
        WorkspaceChannel, on_delete=models.CASCADE, related_name='read_positions'
    )
    # Store the monotonic message id rather than a message FK so deleting the
    # referenced message cannot make older activity reappear as unread.
    last_viewed_message_id = models.PositiveBigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'channel'], name='unique_channel_read_position'
            ),
        ]


class WorkspaceChannelMessageReaction(models.Model):
    message = models.ForeignKey(
        WorkspaceChannelMessage,
        on_delete=models.CASCADE,
        related_name='reactions',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_channel_message_reactions',
    )
    emoji = models.CharField(max_length=32)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['message', 'user'],
                name='unique_message_user_reaction',
            ),
        ]
        ordering = ['created']

    def __str__(self):
        return (
            f'{self.user.username} reacted '
            f'{self.emoji} to message {self.message_id}'
        )

    

class WorkspaceJoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='join_requests',
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_join_requests',
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created = models.DateTimeField(auto_now_add=True)

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'user'],
                name='unique_workspace_join_request',
            ),
        ]

        ordering = ['-created']

    def __str__(self):
        return (
            f'{self.user.username} - '
            f'{self.workspace.name} '
            f'({self.status})'
        )


class WorkspaceInvitation(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='invitations',
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_workspace_invitations',
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        default=secrets.token_urlsafe,
        editable=False,
    )

    created = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    max_uses = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=None,
    )

    uses = models.PositiveIntegerField(
        default=0,
    )

    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f'Invitation for {self.workspace.name}'
