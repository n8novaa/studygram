from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='password123')

    def test_login_valid_user(self):
        response = self.client.post(reverse('login'), {'username': 'testuser', 'password': 'password123'})
        self.assertRedirects(response, reverse('home'))
        self.assertTrue('_auth_user_id' in self.client.session)

    def test_login_invalid_user(self):
        response = self.client.post(reverse('login'), {'username': 'wronguser', 'password': 'wrongpassword'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse('_auth_user_id' in self.client.session)
        self.assertContains(response, 'Invalid username or password')

    def test_logout(self):
        self.client.login(username='testuser', password='password123')
        response = self.client.get(reverse('logout'))
        self.assertRedirects(response, reverse('home'))
        self.assertFalse('_auth_user_id' in self.client.session)

    def test_registration(self):
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'password1': 'Password123!',
            'password2': 'Password123!'
        })
        self.assertRedirects(response, reverse('home'))
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_registration_duplicate_username(self):
        # testuser already exists from setUp
        response = self.client.post(reverse('register'), {
            'username': 'TestUser', # Mixed case
            'password1': 'Password123!',
            'password2': 'Password123!'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'A user with that username already exists.')

