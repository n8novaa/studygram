from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly

from base.models import Message, Room, Topic

from .permissions import IsAuthorOrReadOnly, IsHostOrReadOnly
from .serializers import (
    MessageCreateSerializer,
    MessageSerializer,
    RegisterSerializer,
    RoomDetailSerializer,
    RoomListSerializer,
    RoomWriteSerializer,
    TopicSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer


class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all().order_by('name')
    serializer_class = TopicSerializer
    lookup_field = 'pk'


class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsHostOrReadOnly]
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Room.objects.select_related('host', 'topic').prefetch_related('participants')
        search = self.request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(topic__name__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
            )
        return queryset.order_by('-updated', '-created')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RoomWriteSerializer
        if self.action == 'retrieve':
            return RoomDetailSerializer
        return RoomListSerializer


class RoomMessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_room(self):
        return get_object_or_404(
            Room.objects.select_related('host', 'topic'),
            pk=self.kwargs['room_pk'],
        )

    def get_queryset(self):
        return (
            Message.objects.filter(room_id=self.kwargs['room_pk'])
            .select_related('user', 'room')
            .order_by('-created')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        room = self.get_room()
        serializer.save(user=self.request.user, room=room)
        room.participants.add(self.request.user)


class MessageDetailView(generics.RetrieveDestroyAPIView):
    queryset = Message.objects.select_related('user', 'room')
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    lookup_field = 'pk'
