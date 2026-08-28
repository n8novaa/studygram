from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render

from .forms import RoomForm, UserForm, CustomUserCreationForm
from .models import Message, Room, Topic


def loginPage(request):
    page = 'login'
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        username = request.POST.get('username', '').lower()
        password = request.POST.get('password', '')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('home')

        messages.error(request, 'Invalid username or password')

    return render(request, 'base/login_register.html', {'page': page})


def logoutUser(request):
    logout(request)
    return redirect('home')


def registerPage(request):
    form = CustomUserCreationForm()

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.username = user.username.lower()
            user.save()
            login(request, user)
            return redirect('home')

        messages.error(request, 'An error occurred during registration')

    return render(request, 'base/login_register.html', {'form': form, 'page': 'register'})


def home(request):
    q = request.GET.get('q') or ''
    rooms = (
        Room.objects.filter(
            Q(topic__name__icontains=q)
            | Q(name__icontains=q)
            | Q(description__icontains=q)
        )
        .select_related('host', 'topic')
        .prefetch_related('participants')
    )
    topics = Topic.objects.all()[:5]
    room_count = rooms.count()
    room_messages = Message.objects.filter(
        Q(room__name__icontains=q)
    ).select_related('user', 'room')

    context = {
        'rooms': rooms,
        'topics': topics,
        'room_count': room_count,
        'room_messages': room_messages,
    }
    return render(request, 'base/home.html', context)


def room(request, pk):
    room_obj = get_object_or_404(
        Room.objects.select_related('host', 'topic'),
        id=pk,
    )
    room_messages = room_obj.message_set.select_related('user').all()
    participants = room_obj.participants.all()

    if request.method == 'POST':
        if not request.user.is_authenticated:
            return redirect('login')
        body = request.POST.get('body', '').strip()
        if body:
            Message.objects.create(
                user=request.user,
                room=room_obj,
                body=body,
            )
            room_obj.participants.add(request.user)
        return redirect('room', pk=room_obj.id)

    context = {
        'room': room_obj,
        'room_messages': room_messages,
        'participants': participants,
    }
    return render(request, 'base/room.html', context)


def userProfile(request, pk):
    user = get_object_or_404(User, id=pk)
    rooms = user.room_set.select_related('host', 'topic').prefetch_related('participants')
    room_messages = user.message_set.select_related('user', 'room')
    topics = Topic.objects.all()[:5]
    context = {
        'user': user,
        'rooms': rooms,
        'room_messages': room_messages,
        'topics': topics,
    }
    return render(request, 'base/profile.html', context)


def _get_or_create_topic(topic_name):
    topic_name = topic_name.strip()
    if not topic_name:
        return None
    existing = Topic.objects.filter(name__iexact=topic_name).first()
    if existing:
        return existing
    return Topic.objects.create(name=topic_name)


@login_required(login_url='login')
def createRoom(request):
    form = RoomForm()
    topics = Topic.objects.all()

    if request.method == 'POST':
        form = RoomForm(request.POST)
        if form.is_valid():
            room_obj = form.save(commit=False)
            room_obj.host = request.user
            room_obj.save()
            return redirect('home')

    return render(request, 'base/room_form.html', {'form': form, 'topics': topics})


@login_required(login_url='login')
def updateRoom(request, pk):
    room_obj = get_object_or_404(Room, id=pk)
    if request.user != room_obj.host:
        raise PermissionDenied

    form = RoomForm(instance=room_obj)
    topics = Topic.objects.all()

    if request.method == 'POST':
        form = RoomForm(request.POST, instance=room_obj)
        if form.is_valid():
            form.save()
            return redirect('home')

    return render(
        request,
        'base/room_form.html',
        {'form': form, 'topics': topics, 'room': room_obj},
    )


@login_required(login_url='login')
def deleteRoom(request, pk):
    room_obj = get_object_or_404(Room, id=pk)
    if request.user != room_obj.host:
        raise PermissionDenied

    if request.method == 'POST':
        room_obj.delete()
        return redirect('home')

    return render(request, 'base/delete.html', {'obj': room_obj})


@login_required(login_url='login')
def deleteMessage(request, pk):
    message = get_object_or_404(Message, id=pk)
    if request.user != message.user:
        raise PermissionDenied

    room_id = message.room_id

    if request.method == 'POST':
        message.delete()
        return redirect('room', pk=room_id)

    return render(request, 'base/delete.html', {'obj': message})


@login_required(login_url='login')
def updateUser(request):
    user = request.user
    form = UserForm(instance=user)

    if request.method == 'POST':
        form = UserForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect('user-profile', pk=user.id)

    return render(request, 'base/update-user.html', {'form': form})


def topicsPage(request):
    q = request.GET.get('q') or ''
    topics = Topic.objects.filter(name__icontains=q)
    return render(request, 'base/topics.html', {'topics': topics})


def activityPage(request):
    room_messages = Message.objects.select_related('user', 'room').all()
    return render(request, 'base/activity.html', {'room_messages': room_messages})
