from types import SimpleNamespace

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from files.operations import MAX_COPIED_BYTES
from files.serializers import WorkspaceFileSerializer


class WorkspaceUploadLimitTests(SimpleTestCase):
    def serializer_for_size(self, size):
        uploaded_file = SimpleUploadedFile(
            'notes.txt', b'valid text', content_type='text/plain'
        )
        uploaded_file.size = size
        request = SimpleNamespace(FILES={'uploaded_file': uploaded_file})
        return WorkspaceFileSerializer(
            data={'name': 'notes.txt'},
            context={'request': request},
        )

    def test_upload_limit_still_accepts_100_megabytes(self):
        serializer = self.serializer_for_size(100 * 1024 * 1024)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_upload_limit_rejects_more_than_100_megabytes(self):
        serializer = self.serializer_for_size(100 * 1024 * 1024 + 1)

        self.assertFalse(serializer.is_valid())
        self.assertIn('uploaded_file', serializer.errors)

    def test_folder_copy_limit_remains_200_megabytes(self):
        self.assertEqual(MAX_COPIED_BYTES, 200 * 1024 * 1024)
