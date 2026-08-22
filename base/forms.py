from django.forms import ModelForm, CharField
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError

from .models import Room, Topic


class RoomForm(ModelForm):
    topic_name = CharField(required=True, max_length=200)

    class Meta:
        model = Room
        fields = ['name', 'description']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and getattr(self.instance, 'topic', None):
            self.initial['topic_name'] = self.instance.topic.name

    def clean_topic_name(self):
        topic_name = self.cleaned_data.get('topic_name', '').strip()
        if not topic_name:
            self.add_error('topic_name', 'Topic is required.')
        return topic_name

    def save(self, commit=True):
        room = super().save(commit=False)
        topic_name = self.cleaned_data.get('topic_name')
        if topic_name:
            # Case insensitive get or create
            topic = Topic.objects.filter(name__iexact=topic_name).first()
            if not topic:
                topic = Topic.objects.create(name=topic_name)
            room.topic = topic
        if commit:
            room.save()
        return room


class CustomUserCreationForm(UserCreationForm):
    def clean_username(self):
        username = self.cleaned_data.get('username', '').lower()
        if User.objects.filter(username=username).exists():
            raise ValidationError("A user with that username already exists.")
        return username


class UserForm(ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email']

    def clean_username(self):
        username = self.cleaned_data.get('username', '').lower()
        if User.objects.filter(username=username).exclude(pk=self.instance.pk).exists():
            raise ValidationError("A user with that username already exists.")
        return username
