import json

from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.urls import reverse


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
