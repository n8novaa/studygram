from io import BytesIO
from tempfile import TemporaryDirectory

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from base.models import Profile
from workspaces.models import (
    Workspace,
    WorkspaceChannel,
    WorkspaceChannelMessage,
    WorkspaceJoinRequest,
    WorkspaceMembership,
)


def make_png_upload(name='avatar.png'):
    image_file = BytesIO()
    Image.new('RGB', (2, 2), 'navy').save(image_file, format='PNG')
    return SimpleUploadedFile(name, image_file.getvalue(), content_type='image/png')


class ProfileAvatarApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user('profile_owner', password='testpass123')
        self.member = User.objects.create_user('profile_member', password='testpass123')
        self.workspace = Workspace.objects.create(
            name='Avatar Workspace', description='', owner=self.owner,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.ADMIN,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )
        self.channel = WorkspaceChannel.objects.create(
            workspace=self.workspace,
            name='general',
            created_by=self.owner,
        )

    def test_avatar_is_embedded_in_profile_member_and_message_responses(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(user=self.member)
            profile_response = self.client.patch(
                reverse('api-profile'),
                {
                    'display_name': 'Study Partner',
                    'avatar': make_png_upload(),
                },
                format='multipart',
            )

            self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
            self.assertTrue(profile_response.data['avatar'])
            self.assertEqual(profile_response.data['display_name'], 'Study Partner')

            WorkspaceChannelMessage.objects.create(
                channel=self.channel,
                user=self.member,
                body='Hello from the member',
            )

            self.client.force_authenticate(user=self.owner)
            members_response = self.client.get(
                reverse('workspace-members', kwargs={'workspace_pk': self.workspace.pk}),
            )
            member_data = next(
                item for item in members_response.data
                if item['user'] == self.member.username
            )
            self.assertEqual(members_response.status_code, status.HTTP_200_OK)
            self.assertTrue(member_data['avatar'])
            self.assertEqual(member_data['display_name'], 'Study Partner')

            WorkspaceJoinRequest.objects.create(
                workspace=self.workspace,
                user=self.member,
                status=WorkspaceJoinRequest.Status.PENDING,
            )
            join_requests_response = self.client.get(reverse(
                'workspace-join-requests',
                kwargs={'workspace_pk': self.workspace.pk},
            ))
            self.assertEqual(join_requests_response.status_code, status.HTTP_200_OK)
            self.assertTrue(join_requests_response.data[0]['avatar'])
            self.assertEqual(join_requests_response.data[0]['display_name'], 'Study Partner')

            self.client.force_authenticate(user=self.member)
            messages_response = self.client.get(reverse(
                'workspace-channel-message-list-create',
                kwargs={
                    'workspace_pk': self.workspace.pk,
                    'channel_pk': self.channel.pk,
                },
            ))
            message_user = messages_response.data['results'][0]['user']
            self.assertEqual(messages_response.status_code, status.HTTP_200_OK)
            self.assertEqual(message_user['username'], self.member.username)
            self.assertTrue(message_user['profile']['avatar'])
            self.assertEqual(message_user['profile']['display_name'], 'Study Partner')

    def test_profile_avatar_can_be_removed_by_its_owner(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(user=self.member)
            upload_response = self.client.patch(
                reverse('api-profile'),
                {'avatar': make_png_upload()},
                format='multipart',
            )
            self.assertEqual(upload_response.status_code, status.HTTP_200_OK)
            self.assertTrue(upload_response.data['avatar'])

            remove_response = self.client.patch(
                reverse('api-profile'),
                {'remove_avatar': 'true'},
                format='multipart',
            )
            self.assertEqual(remove_response.status_code, status.HTTP_200_OK)
            self.assertIsNone(remove_response.data['avatar'])
            self.assertFalse(Profile.objects.get(user=self.member).avatar)

    def test_invalid_avatar_upload_is_rejected(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.patch(
            reverse('api-profile'),
            {'avatar': SimpleUploadedFile('not-image.png', b'not an image', content_type='image/png')},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('avatar', response.data)
        self.assertFalse(Profile.objects.get(user=self.member).avatar)
