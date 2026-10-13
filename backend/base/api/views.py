from django.contrib.auth.models import User
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LogoutSerializer

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework import serializers
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
import logging
from smtplib import SMTPException


from .serializers import (
    PasswordResetConfirmSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        username = request.data.get('username', '')

        if not isinstance(username, str):
            username = ''

        username = username.strip()

        User = get_user_model()

        users = User.objects.filter(
            username__iexact=username,
            is_active=True,
        ).exclude(email='')

        # Usernames identify the account; delivery goes to its saved email.
        if users.count() == 1:
            user = users.first()

            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            token = default_token_generator.make_token(user)

            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/reset-password/{uid}/{token}"
            )

            message = (
                "We received a request to reset your StudyGram "
                "password.\n\n"
                f"Use the following link to reset it:\n{reset_url}\n\n"
                "If you did not request this, you can ignore "
                "this email."
            )

            try:
                send_mail(
                    subject='Reset your StudyGram password',
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except (SMTPException, OSError) as exc:
                # Keep the response indistinguishable from unknown usernames.
                logger.error(
                    'Password reset email delivery failed (%s).',
                    type(exc).__name__,
                )

        return Response(
            {
                'detail': (
                    'If an active account with a saved email matches '
                    'that username, password-reset instructions will be '
                    'sent to its saved email.'
                )
            },
            status=status.HTTP_200_OK,
        )

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']

        User = get_user_model()

        try:
            user_id = force_str(
                urlsafe_base64_decode(uid)
            )
            user = User.objects.get(
                pk=user_id,
                is_active=True,
            )
        except (
            ValueError,
            TypeError,
            OverflowError,
            User.DoesNotExist,
        ):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(
            user,
            token,
        ):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.contrib.auth.password_validation import (
                validate_password,
            )
            validate_password(password, user=user)
        except Exception as exc:
            from django.core.exceptions import ValidationError

            if isinstance(exc, ValidationError):
                return Response(
                    {'password': list(exc.messages)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise

        user.set_password(password)
        with transaction.atomic():
            user.save(update_fields=['password'])
            outstanding = OutstandingToken.objects.filter(user=user)
            BlacklistedToken.objects.bulk_create(
                [BlacklistedToken(token=token) for token in outstanding],
                ignore_conflicts=True,
            )

        return Response(
            {
                'detail': (
                    'Password reset successful. '
                    'You can now sign in.'
                )
            },
            status=status.HTTP_200_OK,
        )

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_205_RESET_CONTENT,
        )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = PublicUserSerializer
    permission_classes = [IsAuthenticated]
