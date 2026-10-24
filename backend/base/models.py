"""Account profiles; workspace models live in their own apps."""

from pathlib import Path
from uuid import uuid4

from django.contrib.auth.models import User
from django.db import models


def profile_avatar_upload_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return f'profile_photos/{instance.user_id}/{uuid4().hex}{extension}'


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.CharField(max_length=280, blank=True)
    avatar = models.ImageField(
        upload_to=profile_avatar_upload_path,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile for {self.user.username}'
