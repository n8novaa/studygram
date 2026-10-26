from io import BytesIO
from tempfile import SpooledTemporaryFile
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from config.cloudinary_storage import CloudinaryStorage, CloudinaryStorageError


@override_settings(
    CLOUDINARY_CLOUD_NAME='test-cloud',
    CLOUDINARY_API_KEY='test-key',
    CLOUDINARY_API_SECRET='test-secret',
)
class CloudinaryStorageTests(SimpleTestCase):
    def setUp(self):
        self.storage = CloudinaryStorage()

    @patch('config.cloudinary_storage.cloudinary.uploader.upload')
    def test_avatar_saves_as_public_cloudinary_image(self, upload):
        upload.side_effect = lambda _content, **options: {
            'public_id': options['public_id']
        }

        name = self.storage.save(
            'profile_photos/12/original.png', ContentFile(b'image-bytes')
        )

        self.assertTrue(name.startswith('profile_photos/12/'))
        self.assertTrue(name.endswith('.png'))
        self.assertEqual(upload.call_args.kwargs['resource_type'], 'image')
        self.assertEqual(upload.call_args.kwargs['type'], 'upload')
        self.assertFalse(upload.call_args.kwargs['overwrite'])
        self.assertNotIn('.png', upload.call_args.kwargs['public_id'])

    @patch('config.cloudinary_storage.cloudinary.uploader.upload_large')
    def test_workspace_attachment_saves_as_private_authenticated_raw(self, upload):
        upload.side_effect = lambda _content, **options: {
            'public_id': options['public_id']
        }

        name = self.storage.save(
            'workspace_files/2026/10/26/file.txt', ContentFile(b'private bytes')
        )

        self.assertTrue(name.startswith('workspace_files/2026/10/26/'))
        self.assertTrue(name.endswith('.txt'))
        self.assertEqual(upload.call_args.kwargs['resource_type'], 'raw')
        self.assertEqual(upload.call_args.kwargs['type'], 'authenticated')
        self.assertFalse(upload.call_args.kwargs['overwrite'])
        self.assertEqual(upload.call_args.kwargs['public_id'], name)

    @patch('config.cloudinary_storage.cloudinary.utils.cloudinary_url')
    def test_only_avatar_receives_a_delivery_url(self, build_url):
        build_url.return_value = ('https://cdn.example/avatar.png', {})

        self.assertEqual(
            self.storage.url('profile_photos/12/avatar.png'),
            'https://cdn.example/avatar.png',
        )
        build_url.assert_called_once()
        self.assertTrue(build_url.call_args.kwargs['secure'])

        with self.assertRaises(ValueError):
            self.storage.url('workspace_files/2026/10/26/file.txt')

    @patch('config.cloudinary_storage.cloudinary.api.resource')
    def test_size_uses_resource_metadata(self, resource):
        resource.return_value = {'bytes': 42}

        self.assertEqual(
            self.storage.size('workspace_files/2026/10/26/file.txt'), 42
        )
        resource.assert_called_once_with(
            'workspace_files/2026/10/26/file.txt',
            resource_type='raw',
            type='authenticated',
        )

    @patch('config.cloudinary_storage.cloudinary.uploader.destroy')
    def test_delete_uses_the_correct_resource_and_access_type(self, destroy):
        destroy.return_value = {'result': 'ok'}

        self.storage.delete('workspace_files/2026/10/26/file.txt')

        destroy.assert_called_once_with(
            'workspace_files/2026/10/26/file.txt',
            resource_type='raw',
            type='authenticated',
            invalidate=True,
        )

    @patch('config.cloudinary_storage.urllib.request.urlopen')
    @patch('config.cloudinary_storage.cloudinary.utils.cloudinary_url')
    def test_open_downloads_authenticated_asset_to_spooled_file(
        self, build_url, urlopen
    ):
        build_url.return_value = ('https://cdn.example/signed-file', {})
        response = MagicMock()
        response.__enter__.return_value = BytesIO(b'private bytes')
        urlopen.return_value = response

        opened = self.storage.open('workspace_files/2026/10/26/file.txt', 'rb')
        self.addCleanup(opened.close)

        self.assertIsInstance(opened.file, SpooledTemporaryFile)
        self.assertEqual(opened.read(), b'private bytes')
        build_url.assert_called_once()
        self.assertEqual(build_url.call_args.kwargs['resource_type'], 'raw')
        self.assertEqual(build_url.call_args.kwargs['type'], 'authenticated')
        self.assertTrue(build_url.call_args.kwargs['sign_url'])
        urlopen.assert_called_once()

    @patch('config.cloudinary_storage.urllib.request.urlopen')
    @patch('config.cloudinary_storage.cloudinary.utils.cloudinary_url')
    def test_open_maps_missing_asset_to_file_not_found(self, build_url, urlopen):
        build_url.return_value = ('https://cdn.example/signed-file', {})
        urlopen.side_effect = HTTPError(
            'https://cdn.example/signed-file', 404, 'Not found', {}, BytesIO()
        )

        with self.assertRaises(FileNotFoundError):
            self.storage.open('workspace_files/2026/10/26/missing.txt', 'rb')

    @patch('config.cloudinary_storage.urllib.request.urlopen')
    @patch('config.cloudinary_storage.cloudinary.utils.cloudinary_url')
    def test_open_maps_provider_outage_to_safe_service_error(
        self, build_url, urlopen
    ):
        build_url.return_value = ('https://cdn.example/signed-file', {})
        urlopen.side_effect = OSError('private transport detail')

        with self.assertRaises(CloudinaryStorageError) as raised:
            self.storage.open('workspace_files/2026/10/26/file.txt', 'rb')

        self.assertNotIn('private transport detail', str(raised.exception))

    @patch('config.cloudinary_storage.cloudinary.uploader.upload')
    def test_provider_upload_failures_are_wrapped_without_losing_cause(self, upload):
        provider_error = RuntimeError('provider rejected the asset')
        upload.side_effect = provider_error

        with self.assertRaises(CloudinaryStorageError) as raised:
            self.storage.save(
                'profile_photos/12/avatar.png', ContentFile(b'image-bytes')
            )

        self.assertEqual(raised.exception.status_code, 503)
        self.assertIs(raised.exception.__cause__, provider_error)

    def test_unrecognized_keys_and_traversal_are_rejected(self):
        with self.assertRaises(SuspiciousFileOperation):
            self.storage.size('../private.txt')

        with self.assertRaises(SuspiciousFileOperation):
            self.storage.size('other-media/private.txt')

    @override_settings(
        CLOUDINARY_CLOUD_NAME='',
        CLOUDINARY_API_KEY='',
        CLOUDINARY_API_SECRET='',
    )
    def test_missing_cloudinary_credentials_fail_clearly(self):
        with self.assertRaisesMessage(ImproperlyConfigured, 'CLOUDINARY_CLOUD_NAME'):
            CloudinaryStorage()
