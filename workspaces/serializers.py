from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Workspace, WorkspaceMembership


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = WorkspaceMembership
        fields = ['user', 'role', 'created']
        read_only_fields = ['user', 'role', 'created']


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField(read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'description',
            'owner',
            'members',
            'created',
            'updated',
        ]
        read_only_fields = [
            'id',
            'owner',
            'members',
            'created',
            'updated',
        ]

    def get_members(self, obj):
        memberships = obj.memberships.select_related('user')
        return WorkspaceMemberSerializer(
            memberships,
            many=True,
        ).data