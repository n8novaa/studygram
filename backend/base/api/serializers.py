from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
import logging
import warnings

from PIL import Image, UnidentifiedImageError

from base.models import Profile


logger = logging.getLogger(__name__)




class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']
        read_only_fields = ['id']

    def get_profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        return ProfileSummarySerializer(profile, context=self.context).data


class ProfileSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['display_name', 'avatar']
        read_only_fields = fields

class PublicUserSerializer(serializers.ModelSerializer):
    profile = ProfileSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'profile']
        read_only_fields = ['id', 'username']


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    remove_avatar = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Profile
        fields = [
            'username',
            'email',
            'display_name',
            'bio',
            'avatar',
            'remove_avatar',
            'updated_at',
        ]
        read_only_fields = ['username', 'email', 'updated_at']

    def validate_display_name(self, value):
        return value.strip()

    def validate_bio(self, value):
        return value.strip()

    def validate_avatar(self, uploaded):
        if uploaded is None:
            return uploaded
        if uploaded.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Profile photos cannot exceed 5 MB.')

        uploaded.seek(0)
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(uploaded) as image:
                    image_format = image.format
                    if image_format not in {'JPEG', 'PNG', 'WEBP'}:
                        raise serializers.ValidationError(
                            'Use a JPEG, PNG, or WebP image.'
                        )
                    if image.width > 4096 or image.height > 4096:
                        raise serializers.ValidationError(
                            'Profile photos must be no larger than 4096 × 4096 pixels.'
                        )
                    image.verify()
        except serializers.ValidationError:
            raise
        except (
            UnidentifiedImageError,
            OSError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ):
            raise serializers.ValidationError('The uploaded file is not a valid image.')
        finally:
            uploaded.seek(0)
        uploaded.name = {
            'JPEG': 'profile-photo.jpg',
            'PNG': 'profile-photo.png',
            'WEBP': 'profile-photo.webp',
        }[image_format]
        return uploaded

    def validate(self, attrs):
        if attrs.get('remove_avatar') and attrs.get('avatar'):
            raise serializers.ValidationError(
                {'avatar': 'Choose a new photo or remove the current one, not both.'}
            )
        return attrs

    def update(self, instance, validated_data):
        remove_avatar = validated_data.pop('remove_avatar', False)
        old_avatar_name = instance.avatar.name if instance.avatar else None
        old_avatar_storage = instance.avatar.storage if instance.avatar else None
        if remove_avatar:
            validated_data['avatar'] = None

        instance = super().update(instance, validated_data)
        if old_avatar_name and old_avatar_name != (instance.avatar.name if instance.avatar else None):
            transaction.on_commit(
                lambda storage=old_avatar_storage, name=old_avatar_name: self._delete_old_avatar(
                    storage,
                    name,
                )
            )
        return instance

    @staticmethod
    def _delete_old_avatar(storage, name):
        try:
            storage.delete(name)
        except Exception as exc:
            logger.warning(
                'Unable to remove a replaced profile photo (%s).',
                type(exc).__name__,
            )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        read_only_fields = ['id']

    def validate_username(self, value):
        username = value.lower()
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return username

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except Exception:
            raise serializers.ValidationError(
                "Invalid or expired refresh token."
            )

        token_user_id = self.token.get(
            api_settings.USER_ID_CLAIM
        )
        if str(token_user_id) != str(self.context['request'].user.pk):
            raise serializers.ValidationError(
                "This refresh token does not belong to the authenticated user."
            )

        return value

    def save(self, **kwargs):
        self.token.blacklist()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_password(self, value):
        validate_password(value)
        return value
