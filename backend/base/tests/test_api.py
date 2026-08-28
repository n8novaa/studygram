from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
import json
from base.models import Room, Topic, Message


class APITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='apiuser', password='password123')
        self.topic = Topic.objects.create(name='API Topic')
        self.room = Room.objects.create(host=self.user, topic=self.topic, name='API Room')
        
    def test_token_obtain(self):
        response = self.client.post(reverse('api-token-obtain'), data={'username': 'apiuser', 'password': 'password123'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())

    def test_unauthenticated_room_list(self):
        response = self.client.get(reverse('room-list'))
        self.assertEqual(response.status_code, 200)

    def test_authenticated_room_create(self):
        token_response = self.client.post(reverse('api-token-obtain'), data={'username': 'apiuser', 'password': 'password123'})
        token = token_response.json()['access']
        
        response = self.client.post(reverse('room-list'), data=json.dumps({
            'name': 'New API Room',
            'topic_name': 'New API Topic',
            'description': 'Desc'
        }), content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token}')
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Room.objects.filter(name='New API Room').exists())

    def test_unauthenticated_room_create(self):
        response = self.client.post(reverse('room-list'), data=json.dumps({
            'name': 'New API Room',
            'topic_name': 'New API Topic',
            'description': 'Desc'
        }), content_type='application/json')
        
        self.assertEqual(response.status_code, 401)

    def test_api_registration(self):
        response = self.client.post(reverse('api-register'), data=json.dumps({
            'username': 'newapiuser',
            'email': 'newapi@example.com',
            'password': 'Password123!'
        }), content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newapiuser').exists())

    def test_api_registration_duplicate(self):
        # apiuser exists from setUp
        response = self.client.post(reverse('api-register'), data=json.dumps({
            'username': 'APIUser', # Mixed case
            'email': 'newapi@example.com',
            'password': 'Password123!'
        }), content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.json())
        self.assertEqual(response.json()['username'][0], 'A user with that username already exists.')
