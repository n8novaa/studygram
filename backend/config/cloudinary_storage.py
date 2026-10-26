"""Django media storage backed by Cloudinary.

Profile photos are public images for the existing avatar URL API. Workspace
files are authenticated raw assets; their signed delivery URLs are generated
only inside the backend download path.
"""

import shutil
import tempfile
import urllib.error
import urllib.request
from pathlib import PurePosixPath
from uuid import uuid4

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files import File
from django.core.files.storage import Storage
from django.core.files.utils import validate_file_name
from rest_framework.exceptions import APIException


class CloudinaryStorageError(APIException):
    """A provider failure that can be returned safely as HTTP 503 by DRF."""

    status_code = 503
    default_detail = 'Media storage is temporarily unavailable.'
    default_code = 'media_storage_unavailable'


class CloudinaryStorage(Storage):
    """Route profile images and workspace files to private/public Cloudinary."""

    profile_prefix = 'profile_photos/'
    workspace_prefix = 'workspace_files/'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
        api_key = getattr(settings, 'CLOUDINARY_API_KEY', '')
        api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', '')
        missing = [
            name for name, value in (
                ('CLOUDINARY_CLOUD_NAME', cloud_name),
                ('CLOUDINARY_API_KEY', api_key),
                ('CLOUDINARY_API_SECRET', api_secret),
            ) if not value
        ]
        if missing:
            raise ImproperlyConfigured(
                'Cloudinary media storage requires: ' + ', '.join(missing)
            )
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

    def _key(self, name):
        try:
            name = validate_file_name(str(name), allow_relative_path=True)
        except SuspiciousFileOperation:
            raise

        if '\\' in name or any(
            part in {'', '.', '..'} for part in PurePosixPath(name).parts
        ):
            raise SuspiciousFileOperation('Invalid Cloudinary media path.')

        if name.startswith(self.profile_prefix):
            return name, 'image', 'upload'
        if name.startswith(self.workspace_prefix):
            return name, 'raw', 'authenticated'
        raise SuspiciousFileOperation('Unsupported Cloudinary media path.')

    def _public_id(self, name, resource_type):
        if resource_type == 'image':
            return str(PurePosixPath(name).with_suffix(''))
        # Cloudinary raw public IDs include the original file extension.
        return name

    def _options(self, name):
        name, resource_type, delivery_type = self._key(name)
        return {
            'name': name,
            'public_id': self._public_id(name, resource_type),
            'resource_type': resource_type,
            'type': delivery_type,
        }

    def get_available_name(self, name, max_length=None):
        name, _resource_type, _delivery_type = self._key(name)
        path = PurePosixPath(name)
        candidate = path.with_name(f'{uuid4().hex}{path.suffix.lower()}').as_posix()
        if max_length and len(candidate) > max_length:
            raise SuspiciousFileOperation(
                'Generated Cloudinary media key exceeds the field maximum length.'
            )
        # Random storage keys avoid an Admin API existence check on every upload.
        self._key(candidate)
        return candidate

    def _save(self, name, content):
        options = self._options(name)
        upload_options = {
            'public_id': options['public_id'],
            'resource_type': options['resource_type'],
            'type': options['type'],
            'overwrite': False,
            'invalidate': True,
            'timeout': 120,
        }
        try:
            content.seek(0)
            if options['resource_type'] == 'image':
                result = cloudinary.uploader.upload(content, **upload_options)
            else:
                # Chunking handles transport request size only. Cloudinary's
                # account-level per-asset limit still applies to each file.
                result = cloudinary.uploader.upload_large(
                    content,
                    chunk_size=20 * 1024 * 1024,
                    **upload_options,
                )
        except Exception as exc:
            raise CloudinaryStorageError() from exc

        if (
            not isinstance(result, dict)
            or result.get('public_id') != options['public_id']
        ):
            raise CloudinaryStorageError()
        return name

    def _open(self, name, mode='rb'):
        if mode not in {'rb', 'r'}:
            raise ValueError('Cloudinary media can only be opened for reading.')
        options = self._options(name)
        url, _ = cloudinary.utils.cloudinary_url(
            options['public_id'],
            resource_type=options['resource_type'],
            type=options['type'],
            sign_url=options['type'] == 'authenticated',
            secure=True,
        )
        temporary_file = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024)
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                shutil.copyfileobj(response, temporary_file, length=64 * 1024)
            temporary_file.seek(0)
            return File(temporary_file, name=name)
        except urllib.error.HTTPError as exc:
            temporary_file.close()
            if exc.code == 404:
                raise FileNotFoundError(name) from exc
            raise CloudinaryStorageError() from exc
        except FileNotFoundError:
            temporary_file.close()
            raise
        except Exception as exc:
            temporary_file.close()
            raise CloudinaryStorageError() from exc

    def _resource(self, name):
        options = self._options(name)
        return cloudinary.api.resource(
            options['public_id'],
            resource_type=options['resource_type'],
            type=options['type'],
        )

    def exists(self, name):
        try:
            self._resource(name)
            return True
        except SuspiciousFileOperation:
            raise
        except cloudinary.exceptions.Error as exc:
            if getattr(exc, 'http_code', None) == 404:
                return False
            raise CloudinaryStorageError() from exc
        except Exception as exc:
            raise CloudinaryStorageError() from exc

    def size(self, name):
        try:
            return int(self._resource(name)['bytes'])
        except SuspiciousFileOperation:
            raise
        except cloudinary.exceptions.Error as exc:
            if getattr(exc, 'http_code', None) == 404:
                raise FileNotFoundError(name) from exc
            raise CloudinaryStorageError() from exc
        except FileNotFoundError:
            raise
        except Exception as exc:
            raise CloudinaryStorageError() from exc

    def delete(self, name):
        options = self._options(name)
        try:
            result = cloudinary.uploader.destroy(
                options['public_id'],
                resource_type=options['resource_type'],
                type=options['type'],
                invalidate=True,
            )
        except Exception as exc:
            raise CloudinaryStorageError() from exc
        if (
            not isinstance(result, dict)
            or result.get('result') not in {'ok', 'not found'}
        ):
            raise CloudinaryStorageError()

    def url(self, name):
        options = self._options(name)
        if options['resource_type'] != 'image':
            raise ValueError('Private workspace attachments have no public URL.')
        extension = PurePosixPath(name).suffix.lstrip('.').lower()
        url, _ = cloudinary.utils.cloudinary_url(
            options['public_id'],
            resource_type='image',
            type='upload',
            format=extension or None,
            secure=True,
        )
        return url
