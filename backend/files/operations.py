from collections import deque
from pathlib import PurePosixPath

from django.core.exceptions import SuspiciousFileOperation
from django.core.files import File
from django.db import transaction
from rest_framework import serializers

from .models import WorkspaceFile, WorkspaceFolder

MAX_COPIED_FOLDERS = 500
MAX_COPIED_FILES = 1000
MAX_COPIED_BYTES = 200 * 1024 * 1024


def _children_of(folder, workspace_id):
    return WorkspaceFolder.objects.filter(
        workspace_id=workspace_id,
        parent_id=folder.pk,
    ).order_by('id')


def _get_folder_subtree(root):
    folders = [root]
    seen = {root.pk}
    queue = deque([root])

    while queue:
        parent = queue.popleft()
        for child in _children_of(parent, root.workspace_id):
            if child.pk in seen:
                raise serializers.ValidationError(
                    'This folder tree contains a cycle and cannot be copied.'
                )
            seen.add(child.pk)
            folders.append(child)
            queue.append(child)

            if len(folders) > MAX_COPIED_FOLDERS:
                raise serializers.ValidationError(
                    'This folder contains too many subfolders to copy at once.'
                )

    return folders


def _ensure_destination_outside_subtree(source, destination):
    current = destination
    visited = set()

    while current is not None:
        if current.pk == source.pk:
            raise serializers.ValidationError(
                'A folder cannot be pasted into itself or one of its descendants.'
            )
        if current.pk in visited:
            raise serializers.ValidationError(
                'The destination folder tree contains a cycle.'
            )
        visited.add(current.pk)
        current = current.parent


def _sibling_folders(workspace_id, parent_id):
    siblings = WorkspaceFolder.objects.filter(
        workspace_id=workspace_id,
    )
    if parent_id is None:
        return siblings.filter(parent__isnull=True)
    return siblings.filter(parent_id=parent_id)


def _copy_name(source_name, workspace_id, parent_id):
    base = source_name[:245].rstrip()
    suffix = ' (copy)'
    candidate = f'{base}{suffix}'
    copy_number = 2

    while _sibling_folders(workspace_id, parent_id).filter(
        name__iexact=candidate,
    ).exists():
        suffix = f' (copy {copy_number})'
        candidate = f'{source_name[:255 - len(suffix)].rstrip()}{suffix}'
        copy_number += 1

    return candidate


def move_folder(source, destination):
    if destination is not None:
        _ensure_destination_outside_subtree(source, destination)

    if source.parent_id == (destination.pk if destination else None):
        return source, False

    if _sibling_folders(
        source.workspace_id,
        destination.pk if destination else None,
    ).filter(name__iexact=source.name).exclude(pk=source.pk).exists():
        raise serializers.ValidationError(
            {'parent': 'A folder with this name already exists in the destination.'}
        )

    source.parent = destination
    source.save(update_fields=['parent', 'updated_at'])
    return source, True


def copy_folder(source, destination, copied_by):
    if destination is not None:
        _ensure_destination_outside_subtree(source, destination)

    folders = _get_folder_subtree(source)
    folder_ids = [folder.pk for folder in folders]
    files = list(
        WorkspaceFile.objects.filter(
            workspace_id=source.workspace_id,
            folder_id__in=folder_ids,
        ).order_by('id')
    )

    if len(files) > MAX_COPIED_FILES:
        raise serializers.ValidationError(
            'This folder contains too many files to copy at once.'
        )

    try:
        total_bytes = sum(file.uploaded_file.size for file in files)
    except (OSError, ValueError, FileNotFoundError) as exc:
        raise serializers.ValidationError(
            'A file in this folder is missing from storage.'
        ) from exc

    if total_bytes > MAX_COPIED_BYTES:
        raise serializers.ValidationError(
            'Folders larger than 200 MB cannot be copied in one operation.'
        )

    storage_objects = []
    try:
        with transaction.atomic():
            copied_folders = {}
            for folder in folders:
                if folder.pk == source.pk:
                    parent = destination
                    name = _copy_name(
                        folder.name,
                        folder.workspace_id,
                        destination.pk if destination else None,
                    )
                else:
                    parent = copied_folders[folder.parent_id]
                    name = folder.name

                copied_folders[folder.pk] = WorkspaceFolder.objects.create(
                    workspace_id=folder.workspace_id,
                    parent=parent,
                    name=name,
                    created_by=copied_by,
                )

            for source_file in files:
                if not source_file.uploaded_file:
                    raise serializers.ValidationError(
                        f'The file "{source_file.name}" is missing from storage.'
                    )

                copied_file = WorkspaceFile(
                    workspace_id=source_file.workspace_id,
                    folder=copied_folders[source_file.folder_id],
                    name=source_file.name,
                    file_type=source_file.file_type,
                    size=source_file.uploaded_file.size,
                    created_by=copied_by,
                )

                try:
                    source_file.uploaded_file.open('rb')
                    file_content = File(
                        source_file.uploaded_file.file,
                        name=PurePosixPath(
                            source_file.uploaded_file.name
                        ).name,
                    )
                    copied_file.uploaded_file.save(
                        file_content.name,
                        file_content,
                        save=False,
                    )
                except (OSError, ValueError, SuspiciousFileOperation) as exc:
                    raise serializers.ValidationError(
                        f'The file "{source_file.name}" could not be copied from storage.'
                    ) from exc
                finally:
                    if source_file.uploaded_file:
                        source_file.uploaded_file.close()

                storage_objects.append((
                    copied_file.uploaded_file.storage,
                    copied_file.uploaded_file.name,
                ))
                copied_file.save()

        return copied_folders[source.pk]
    except Exception:
        for storage, name in storage_objects:
            try:
                storage.delete(name)
            except Exception:
                pass
        raise


def _sibling_files(workspace_id, folder_id):
    files = WorkspaceFile.objects.filter(workspace_id=workspace_id)
    if folder_id is None:
        return files.filter(folder__isnull=True)
    return files.filter(folder_id=folder_id)


def _copy_file_name(source_name, workspace_id, folder_id):
    path = PurePosixPath(source_name)
    stem = path.stem
    suffix = path.suffix
    copy_suffix = ' (copy)'
    candidate = f'{stem[:255 - len(copy_suffix) - len(suffix)]}{copy_suffix}{suffix}'
    index = 2
    while _sibling_files(workspace_id, folder_id).filter(
        name__iexact=candidate,
    ).exists():
        copy_suffix = f' (copy {index})'
        candidate = f'{stem[:255 - len(copy_suffix) - len(suffix)]}{copy_suffix}{suffix}'
        index += 1
    return candidate


def move_file(source, destination):
    if destination is not None and destination.workspace_id != source.workspace_id:
        raise serializers.ValidationError(
            {'parent': 'Destination folder must belong to this workspace.'}
        )

    destination_id = destination.pk if destination else None
    if source.folder_id == destination_id:
        return source, False

    if _sibling_files(source.workspace_id, destination_id).filter(
        name__iexact=source.name,
    ).exclude(pk=source.pk).exists():
        raise serializers.ValidationError(
            {'parent': 'A file with this name already exists in the destination.'}
        )

    source.folder = destination
    source.save(update_fields=['folder', 'updated_at'])
    return source, True


def copy_file(source, destination, copied_by):
    if destination is not None and destination.workspace_id != source.workspace_id:
        raise serializers.ValidationError(
            {'parent': 'Destination folder must belong to this workspace.'}
        )
    if not source.uploaded_file:
        raise serializers.ValidationError('This file is missing from storage.')

    try:
        size = source.uploaded_file.size
    except (OSError, ValueError, FileNotFoundError) as exc:
        raise serializers.ValidationError('This file is missing from storage.') from exc
    if size > MAX_COPIED_BYTES:
        raise serializers.ValidationError('Files larger than 200 MB cannot be copied.')

    copied = WorkspaceFile(
        workspace_id=source.workspace_id,
        folder=destination,
        name=_copy_file_name(
            source.name,
            source.workspace_id,
            destination.pk if destination else None,
        ),
        file_type=source.file_type,
        size=size,
        created_by=copied_by,
    )
    storage_object = None
    try:
        with transaction.atomic():
            source.uploaded_file.open('rb')
            try:
                content = File(
                    source.uploaded_file.file,
                    name=PurePosixPath(source.uploaded_file.name).name,
                )
                copied.uploaded_file.save(content.name, content, save=False)
            finally:
                source.uploaded_file.close()
            storage_object = (copied.uploaded_file.storage, copied.uploaded_file.name)
            copied.save()
        return copied
    except Exception:
        if storage_object:
            try:
                storage_object[0].delete(storage_object[1])
            except Exception:
                pass
        raise
