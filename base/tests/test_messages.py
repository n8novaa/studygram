from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from base.models import Room, Topic, Message


class MessageTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='author', password='password123')
        self.other_user = User.objects.create_user(username='other', password='password123')
        self.topic = Topic.objects.create(name='Test Topic')
        self.room = Room.objects.create(host=self.other_user, topic=self.topic, name='Test Room')
        self.message = Message.objects.create(user=self.user, room=self.room, body='Hello World')

    def test_create_message(self):
        self.client.login(username='author', password='password123')
        response = self.client.post(reverse('room', args=[self.room.id]), {
            'body': 'New Message'
        })
        self.assertRedirects(response, reverse('room', args=[self.room.id]))
        self.assertTrue(Message.objects.filter(body='New Message').exists())

    def test_delete_message_permissions(self):
        self.client.login(username='other', password='password123')
        response = self.client.post(reverse('delete-message', args=[self.message.id]))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Message.objects.filter(id=self.message.id).exists())

        self.client.logout()

        self.client.login(username='author', password='password123')
        response = self.client.post(reverse('delete-message', args=[self.message.id]))
        self.assertRedirects(response, reverse('room', args=[self.room.id]))
        self.assertFalse(Message.objects.filter(id=self.message.id).exists())
