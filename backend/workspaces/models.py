import secrets

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

    def __str__(self):
        return f'Invitation for {self.workspace.name}'