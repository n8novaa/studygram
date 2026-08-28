from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from base.models import Room, Topic


class RoomTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='hostuser', password='password123')
        self.other_user = User.objects.create_user(username='otheruser', password='password123')
        self.topic = Topic.objects.create(name='Test Topic')
        self.room = Room.objects.create(host=self.user, topic=self.topic, name='Test Room', description='Test Desc')

    def test_create_room_authenticated(self):
        self.client.login(username='hostuser', password='password123')
        response = self.client.post(reverse('create-room'), {
            'topic_name': 'New Topic',
            'name': 'New Room',
            'description': 'Desc'
        })
        self.assertRedirects(response, reverse('home'))
        self.assertTrue(Room.objects.filter(name='New Room').exists())
        self.assertTrue(Topic.objects.filter(name='New Topic').exists())

    def test_create_room_unauthenticated(self):
        response = self.client.post(reverse('create-room'), {
            'topic_name': 'New Topic',
            'name': 'New Room'
        })
        self.assertRedirects(response, reverse('login') + '?next=/create-room/')
        self.assertFalse(Room.objects.filter(name='New Room').exists())

    def test_update_room_permissions(self):
        # host can update
        self.client.login(username='hostuser', password='password123')
        response = self.client.post(reverse('update-room', args=[self.room.id]), {
            'topic_name': 'Test Topic',
            'name': 'Updated Room',
            'description': 'Test Desc'
        })
        self.assertRedirects(response, reverse('home'))
        self.room.refresh_from_db()
        self.assertEqual(self.room.name, 'Updated Room')

        self.client.logout()

        # other user cannot update
        self.client.login(username='otheruser', password='password123')
        response = self.client.post(reverse('update-room', args=[self.room.id]), {
            'topic_name': 'Test Topic',
            'name': 'Hacked Room',
            'description': 'Test Desc'
        })
        self.assertEqual(response.status_code, 403)
        self.room.refresh_from_db()
        self.assertEqual(self.room.name, 'Updated Room')

    def test_delete_room_permissions(self):
        self.client.login(username='otheruser', password='password123')
        response = self.client.post(reverse('delete-room', args=[self.room.id]))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Room.objects.filter(id=self.room.id).exists())

        self.client.logout()

        self.client.login(username='hostuser', password='password123')
        response = self.client.post(reverse('delete-room', args=[self.room.id]))
        self.assertRedirects(response, reverse('home'))
        self.assertFalse(Room.objects.filter(id=self.room.id).exists())
