from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class AuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='password123',
        )

    def test_login_valid_user(self):
        response = self.client.post(
            reverse('api-token-obtain'),
            {'username': 'testuser', 'password': 'password123'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_user(self):
        response = self.client.post(
            reverse('api-token-obtain'),
            {'username': 'wronguser', 'password': 'wrongpassword'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)

    def test_logout(self):
        refresh = str(RefreshToken.for_user(self.user))
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse('api-logout'),
            {'refresh': refresh},
            format='json',
        )

        self.assertEqual(response.status_code, 205)
        with self.assertRaises(TokenError):
            RefreshToken(refresh)

    def test_logout_does_not_change_state_on_get(self):
        refresh = str(RefreshToken.for_user(self.user))
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('api-logout'))

        self.assertEqual(response.status_code, 405)
        # A read-only request must not revoke the user's refresh token.
        self.assertEqual(str(RefreshToken(refresh)), refresh)

    def test_registration(self):
        response = self.client.post(
            reverse('api-register'),
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'Password123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_registration_duplicate_username(self):
        response = self.client.post(
            reverse('api-register'),
            {
                'username': 'TestUser',
                'email': 'newuser@example.com',
                'password': 'Password123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.data)
