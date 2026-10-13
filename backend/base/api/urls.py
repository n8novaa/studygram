from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.throttling import ScopedRateThrottle

from .views import (
    CurrentUserView,
    LogoutView,
    MessageDetailView,
    RegisterView,
    RoomMessageListCreateView,
    RoomViewSet,
    TopicViewSet,
    UserViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('topics', TopicViewSet, basename='topic')
router.register('rooms', RoomViewSet, basename='room')

urlpatterns = [
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

    path(
        'rooms/<int:room_pk>/messages/',
        RoomMessageListCreateView.as_view(),
        name='api-room-messages',
    ),
    path(
        'messages/<int:pk>/',
        MessageDetailView.as_view(),
        name='api-message-detail',
    ),

    path('', include(router.urls)),
    path('', include('workspaces.urls')),
]
