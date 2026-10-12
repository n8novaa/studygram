from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class JWTLogoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="logoutuser",
            password="Password123!",
        )
        self.logout_url = reverse("api-logout")
        self.refresh = str(RefreshToken.for_user(self.user))

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def test_authenticated_user_can_logout(self):
        self.authenticate()

        response = self.client.post(
            self.logout_url,
            {"refresh": self.refresh},
            format="json",
        )

        self.assertEqual(response.status_code, 205)

        # The submitted refresh token must now be blacklisted.
        with self.assertRaises(TokenError):
            RefreshToken(self.refresh)

    def test_blacklisted_refresh_token_cannot_be_used(self):
        self.authenticate()

        logout_response = self.client.post(
            self.logout_url,
            {"refresh": self.refresh},
            format="json",
        )
        self.assertEqual(logout_response.status_code, 205)

        # Simple JWT must reject the blacklisted token.
        refresh_response = self.client.post(
            reverse("api-token-refresh"),
            {"refresh": self.refresh},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, 401)

    def test_invalid_refresh_token_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            self.logout_url,
            {"refresh": "not-a-valid-refresh-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_unauthenticated_user_cannot_logout(self):
        response = self.client.post(
            self.logout_url,
            {"refresh": self.refresh},
            format="json",
        )

        self.assertEqual(response.status_code, 401)