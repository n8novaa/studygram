from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.throttling import ScopedRateThrottle

from .views import (
    CurrentUserView,
    LogoutView,
    RegisterView,
    UserViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from .health import health_check

class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('health/', health_check, name='api-health'),
    path('auth/register/', RegisterView.as_view(), name='api-register'),
    path(
        'auth/token/',
        ThrottledTokenObtainPairView.as_view(),
        name='api-token-obtain',
    ),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='api-me'),

    path(
        'auth/password-reset/',
        PasswordResetRequestView.as_view(),
        name='api-password-reset',
    ),
    path(
        'auth/password-reset/confirm/',
        PasswordResetConfirmView.as_view(),
        name='api-password-reset-confirm',
    ),

    path('', include(router.urls)),
    path('', include('workspaces.urls')),
]
