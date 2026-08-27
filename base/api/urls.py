from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CurrentUserView,
    MessageDetailView,
    RegisterView,
    RoomMessageListCreateView,
    RoomViewSet,
    TopicViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('topics', TopicViewSet, basename='topic')
router.register('rooms', RoomViewSet, basename='room')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='api-register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='api-token-obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='api-me'),

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