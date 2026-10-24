import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Profile

logger = logging.getLogger(__name__)


@receiver(post_save, sender=get_user_model())
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


@receiver(post_delete, sender=Profile)
def delete_profile_photo(sender, instance, **kwargs):
    if not instance.avatar:
        return

    storage = instance.avatar.storage
    name = instance.avatar.name

    def delete_file():
        try:
            storage.delete(name)
        except Exception as exc:
            logger.warning(
                'Unable to remove a deleted profile photo (%s).',
                type(exc).__name__,
            )

    transaction.on_commit(delete_file)
