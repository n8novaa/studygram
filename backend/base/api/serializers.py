from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from base.models import Message, Room, Topic


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


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


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'name']


class MessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'user', 'room', 'body', 'created', 'updated']
        read_only_fields = ['id', 'user', 'created', 'updated']

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message body cannot be empty.')
        return value


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['body']

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message body cannot be empty.')
        return value


class RoomListSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id',
            'host',
            'topic',
            'name',
            'description',
            'participant_count',
            'created',
            'updated',
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()


class RoomDetailSerializer(RoomListSerializer):
    participants = UserSerializer(many=True, read_only=True)

    class Meta(RoomListSerializer.Meta):
        fields = RoomListSerializer.Meta.fields + ['participants']


class RoomWriteSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(write_only=True)

    class Meta:
        model = Room
        fields = ['name', 'description', 'topic_name']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Room name cannot be empty.')
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('topic_name'):
            raise serializers.ValidationError({'topic_name': 'Topic is required.'})
        return attrs

    def _get_or_create_topic(self, topic_name):
        existing = Topic.objects.filter(name__iexact=topic_name).first()
        if existing:
            return existing
        return Topic.objects.create(name=topic_name)

    def create(self, validated_data):
        topic_name = validated_data.pop('topic_name')
        topic = self._get_or_create_topic(topic_name)
        return Room.objects.create(
            host=self.context['request'].user,
            topic=topic,
            **validated_data,
        )

    def update(self, instance, validated_data):
        topic_name = validated_data.pop('topic_name', None)
        if topic_name is not None:
            instance.topic = self._get_or_create_topic(topic_name)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
