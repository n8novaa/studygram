import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.test import override_settings
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
)
class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='study_user',
            email='study-user@example.com',
            password='OldPassword123!',
        )
        self.request_url = reverse('api-password-reset')
        self.confirm_url = reverse('api-password-reset-confirm')

    def test_username_requests_reset_to_the_account_email(self):
        response = self.client.post(
            self.request_url,
            {'username': 'study_user'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['study-user@example.com'])
        self.assertIn('/reset-password/', mail.outbox[0].body)

    def test_unknown_username_gets_same_response_without_email(self):
        response = self.client.post(
            self.request_url,
            {'username': 'not-a-user'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_link_changes_password(self):
        refresh = str(RefreshToken.for_user(self.user))
        self.client.post(
            self.request_url,
            {'username': self.user.username},
            format='json',
        )
        match = re.search(
            r'/reset-password/([^/\s]+)/([^/\s]+)',
            mail.outbox[0].body,
        )
        self.assertIsNotNone(match)
        uid, token = match.groups()

        response = self.client.post(
            self.confirm_url,
            {
                'uid': uid,
                'token': token,
                'password': 'NewPassword123!safe',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword123!safe'))

        refresh_response = self.client.post(
            reverse('api-token-refresh'),
            {'refresh': refresh},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
