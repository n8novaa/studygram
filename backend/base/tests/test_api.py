import json

from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APIClient
from workspaces.models import Workspace, WorkspaceMembership


class APITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='apiuser', password='password123'
        )

    def test_token_obtain(self):
        response = self.client.post(
            reverse('api-token-obtain'),
            data={'username': 'apiuser', 'password': 'password123'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())

    def test_api_registration(self):
        response = self.client.post(
            reverse('api-register'),
            data=json.dumps({
                'username': 'newapiuser',
                'email': 'newapi@example.com',
                'password': 'Password123!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newapiuser').exists())

    def test_api_registration_duplicate_is_case_insensitive(self):
        response = self.client.post(
            reverse('api-register'),
            data=json.dumps({
                'username': 'APIUser',
                'email': 'newapi@example.com',
                'password': 'Password123!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.json())


class UserDirectoryAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.requester = User.objects.create_user('directory_requester')
        self.workspace_user = User.objects.create_user('directory_colleague')
        self.outsider = User.objects.create_user('directory_outsider')
        workspace = Workspace.objects.create(
            name='Shared workspace', description='', owner=self.requester,
        )
        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=self.requester,
            role=WorkspaceMembership.Role.ADMIN,
        )
        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=self.workspace_user,
            role=WorkspaceMembership.Role.MEMBER,
        )
        self.client.force_authenticate(user=self.requester)

    def test_list_only_returns_users_in_shared_workspaces(self):
        response = self.client.get(reverse('user-list'))

        self.assertEqual(response.status_code, 200)
        usernames = {item['username'] for item in response.data['results']}
        self.assertEqual(usernames, {'directory_requester', 'directory_colleague'})

    def test_user_detail_cannot_enumerate_accounts_outside_shared_workspaces(self):
        response = self.client.get(
            reverse('user-detail', kwargs={'pk': self.outsider.pk})
        )

        self.assertEqual(response.status_code, 404)

    def test_user_directory_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse('user-list'))

        self.assertEqual(response.status_code, 401)
