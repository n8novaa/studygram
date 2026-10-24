from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceChannelReadPosition,
    WorkspaceMembership,
)


class RecentWorkspaceActivityTests(APITestCase):
    def setUp(self):
        self.member = User.objects.create_user('activity_member', password='testpass123')
        self.other_user = User.objects.create_user('activity_other', password='testpass123')
        self.member.profile.display_name = 'Study Member'
        self.member.profile.save(update_fields=['display_name'])
        self.workspace = Workspace.objects.create(
            name='Member Workspace',
            description='',
            owner=self.member,
        )
        self.other_workspace = Workspace.objects.create(
            name='Private Other Workspace',
            description='',
            owner=self.other_user,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.ADMIN,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.other_user,
            role=WorkspaceMembership.Role.MEMBER,
        )
        WorkspaceMembership.objects.create(
            workspace=self.other_workspace,
            user=self.other_user,
            role=WorkspaceMembership.Role.ADMIN,
        )
        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name='general',
            created_by=self.member,
        )
        self.other_channel = WorkspaceChannel.objects.create(
            workspace=self.other_workspace,
            name='private',
            created_by=self.other_user,
        )
        self.url = reverse('workspace-recent-activity')

    def test_authenticated_user_sees_only_messages_in_member_workspaces(self):
        visible = WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.other_user,
            body='Visible channel message',
        )
        own = WorkspaceChannelMessage.objects.create(
            channel=self.channel, user=self.member, body='Own message excluded'
        )
        WorkspaceChannelMessage.objects.create(
            channel=self.other_channel,
            user=self.other_user,
            body='Secret message from an inaccessible workspace',
        )

        self.client.force_authenticate(user=self.member)
        response = self.client.get(
            f'{self.url}?workspace_id={self.other_workspace.pk}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data['results']], [visible.pk])
        self.assertNotIn(own.pk, [item['id'] for item in response.data['results']])
        item = response.data['results'][0]
        self.assertEqual(item['workspace_id'], self.workspace.pk)
        self.assertEqual(item['workspace_name'], self.workspace.name)
        self.assertEqual(item['channel_name'], self.channel.name)
        self.assertEqual(item['author_username'], self.other_user.username)
        self.assertEqual(item['preview'], visible.body)
        self.assertNotIn('Secret', str(response.data))
        historical = self.client.get(f'{self.url}?view=history&workspace_id={self.other_workspace.pk}')
        self.assertEqual([item['id'] for item in historical.data['results']], [visible.pk])
        self.assertNotIn('Secret', str(historical.data))

    def test_unauthenticated_user_cannot_access_activity(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_activity_is_newest_first_and_paginated(self):
        messages = [
            WorkspaceChannelMessage.objects.create(
                channel=self.channel,
                user=self.other_user,
                body=f'Activity message {index}',
            )
            for index in range(4)
        ]
        now = timezone.now()
        for index, message in enumerate(messages):
            WorkspaceChannelMessage.objects.filter(pk=message.pk).update(
                created=now - timedelta(minutes=index),
            )

        self.client.force_authenticate(user=self.member)
        first_page = self.client.get(f'{self.url}?page_size=2')
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item['id'] for item in first_page.data['results']],
            [messages[0].pk, messages[1].pk],
        )
        self.assertIsNotNone(first_page.data['next'])

        second_page = self.client.get(f'{self.url}?page=2&page_size=2')
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item['id'] for item in second_page.data['results']],
            [messages[2].pk, messages[3].pk],
        )
        self.assertIsNone(second_page.data['next'])

    def test_message_preview_is_bounded(self):
        WorkspaceChannelMessage.objects.create(
            channel=self.channel,
            user=self.other_user,
            body='x' * 240,
        )
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results'][0]['preview']), 198)

    def test_viewed_messages_leave_active_feed_but_remain_in_history(self):
        viewed = WorkspaceChannelMessage.objects.create(
            channel=self.channel, user=self.other_user, body='Seen message'
        )
        newer = WorkspaceChannelMessage.objects.create(
            channel=self.channel, user=self.other_user, body='New message'
        )
        self.client.force_authenticate(user=self.member)
        position_url = reverse(
            'workspace-channel-read-position',
            kwargs={'workspace_pk': self.workspace.pk, 'channel_pk': self.channel.pk},
        )

        marked = self.client.post(position_url, {'message_id': viewed.pk}, format='json')
        self.assertEqual(marked.status_code, status.HTTP_200_OK)
        active_after_view = self.client.get(self.url)
        self.assertEqual([item['id'] for item in active_after_view.data['results']], [newer.pk])
        history = self.client.get(f'{self.url}?view=history')
        self.assertEqual(
            {item['id'] for item in history.data['results']}, {viewed.pk, newer.pk}
        )
        self.client.post(position_url, {'message_id': newer.pk}, format='json')
        backwards = self.client.post(position_url, {'message_id': viewed.pk}, format='json')
        self.assertEqual(backwards.data['last_viewed_message_id'], newer.pk)
        active = self.client.get(self.url)
        self.assertEqual(active.data['results'], [])

        next_message = WorkspaceChannelMessage.objects.create(
            channel=self.channel, user=self.other_user, body='Arrived after viewing'
        )
        active = self.client.get(self.url)
        self.assertEqual([item['id'] for item in active.data['results']], [next_message.pk])
        self.assertTrue(WorkspaceChannelReadPosition.objects.filter(
            user=self.member, channel=self.channel, last_viewed_message_id=newer.pk
        ).exists())

    def test_read_position_rejects_messages_from_another_channel(self):
        another_channel = WorkspaceChannel.objects.create(
            workspace=self.workspace, name='other', created_by=self.member
        )
        message = WorkspaceChannelMessage.objects.create(
            channel=another_channel, user=self.other_user, body='Other channel'
        )
        self.client.force_authenticate(user=self.member)
        url = reverse(
            'workspace-channel-read-position',
            kwargs={'workspace_pk': self.workspace.pk, 'channel_pk': self.channel.pk},
        )

        response = self.client.post(url, {'message_id': message.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_read_position_requires_membership_and_authentication(self):
        url = reverse(
            'workspace-channel-read-position',
            kwargs={'workspace_pk': self.other_workspace.pk, 'channel_pk': self.other_channel.pk},
        )
        unauthenticated = self.client.post(url, {'message_id': 1}, format='json')
        self.assertEqual(unauthenticated.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.member)
        denied = self.client.post(url, {'message_id': 1}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        own_workspace_url = reverse(
            'workspace-channel-read-position',
            kwargs={'workspace_pk': self.workspace.pk, 'channel_pk': self.channel.pk},
        )
        malformed = self.client.post(own_workspace_url, [], format='json')
        self.assertEqual(malformed.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deleted_messages_disappear_without_resetting_view_position(self):
        viewed = WorkspaceChannelMessage.objects.create(
            channel=self.channel, user=self.other_user, body='Will be deleted'
        )
        self.client.force_authenticate(user=self.member)
        position_url = reverse(
            'workspace-channel-read-position',
            kwargs={'workspace_pk': self.workspace.pk, 'channel_pk': self.channel.pk},
        )
        self.client.post(position_url, {'message_id': viewed.pk}, format='json')
        viewed_id = viewed.pk
        viewed.delete()

        self.assertEqual(self.client.get(self.url).data['results'], [])
        self.assertEqual(self.client.get(f'{self.url}?view=history').data['results'], [])
        self.assertTrue(WorkspaceChannelReadPosition.objects.filter(
            user=self.member, channel=self.channel, last_viewed_message_id=viewed_id
        ).exists())
