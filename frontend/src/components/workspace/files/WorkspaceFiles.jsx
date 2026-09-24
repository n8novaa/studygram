import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import {
  getWorkspaceFolders,
  createWorkspaceFolder,
  deleteWorkspaceFolder,
  getWorkspaceFiles,
  uploadWorkspaceFile,
  deleteWorkspaceFile,
  downloadWorkspaceFile,
} from '../../../services/workspaceFileService';
import WorkspaceBreadcrumbs from './WorkspaceBreadcrumbs';
import CreateFolderForm from './CreateFolderForm';
import WorkspaceFolderItem from './WorkspaceFolderItem';
import WorkspaceFileItem from './WorkspaceFileItem';
import ConfirmModal from '../../common/ConfirmModal';
import {
  FolderPlusIcon,
  UploadIcon,
  FolderIcon,
} from '../../common/Icons';
import { useToast } from '../../common/ToastContext';
import '../../../styles/components/workspace/files/files.css';

function WorkspaceFiles({ workspaceId, isAdmin = false }) {
  const { accessToken } = useAuth();
  const { addToast } = useToast();

  const [folderPath, setFolderPath] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyItemId, setBusyItemId] = useState(null);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Confirm delete modals
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentFolderId = currentFolder?.id ?? null;

  const loadContents = useCallback(async () => {
    if (!accessToken || !workspaceId) return;

    try {
      setLoading(true);
      setError('');

      const [folderData, fileData] = await Promise.all([
        getWorkspaceFolders(accessToken, workspaceId, currentFolderId),
        getWorkspaceFiles(accessToken, workspaceId, currentFolderId),
      ]);

      setFolders(Array.isArray(folderData) ? folderData : folderData?.results ?? []);
      setFiles(Array.isArray(fileData) ? fileData : fileData?.results ?? []);
    } catch (err) {
      setError(err?.message || 'Failed to load files and folders.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, currentFolderId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  function openFolder(folder) {
    setFolderPath((current) => [...current, { id: folder.id, name: folder.name }]);
  }

  function navigateToIndex(index) {
    if (index < 0) {
      setFolderPath([]);
      return;
    }
    setFolderPath((current) => current.slice(0, index + 1));
  }

  async function handleCreateFolder(event) {
    event.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setCreatingFolder(true);
      setError('');

      await createWorkspaceFolder(accessToken, workspaceId, {
        name: newFolderName.trim(),
        parent: currentFolderId,
      });

      addToast(`Folder "${newFolderName.trim()}" created!`, 'success');
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadContents();
    } catch (err) {
      setError(err?.message || 'Failed to create folder.');
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFolder(folder) {
    setConfirmDeleteFolder(folder);
  }

  async function confirmFolderDelete() {
    const folder = confirmDeleteFolder;
    if (!folder) return;

    try {
      setDeletingItem(true);
      setBusyItemId(`folder-${folder.id}`);
      setError('');
      await deleteWorkspaceFolder(accessToken, workspaceId, folder.id);
      addToast(`Folder "${folder.name}" deleted.`, 'info');
      setConfirmDeleteFolder(null);
      await loadContents();
    } catch (err) {
      setError(err?.message || 'Failed to delete folder.');
    } finally {
      setBusyItemId(null);
      setDeletingItem(false);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      await uploadWorkspaceFile(accessToken, workspaceId, {
        name: file.name,
        uploaded_file: file,
        folder: currentFolderId,
      });

      addToast(`Uploaded "${file.name}"!`, 'success');
      await loadContents();
    } catch (err) {
      setError(err?.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file) {
    try {
      setBusyItemId(`file-${file.id}`);
      setError('');
      await downloadWorkspaceFile(accessToken, workspaceId, file.id, file.name);
      addToast(`Downloaded "${file.name}".`, 'success');
    } catch (err) {
      setError(err?.message || 'Failed to download file.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleDeleteFile(file) {
    setConfirmDeleteFile(file);
  }

  async function confirmFileDelete() {
    const file = confirmDeleteFile;
    if (!file) return;

    try {
      setDeletingItem(true);
      setBusyItemId(`file-${file.id}`);
      setError('');
      await deleteWorkspaceFile(accessToken, workspaceId, file.id);
      addToast(`Deleted "${file.name}".`, 'info');
      setConfirmDeleteFile(null);
      await loadContents();
    } catch (err) {
      setError(err?.message || 'Failed to delete file.');
    } finally {
      setBusyItemId(null);
      setDeletingItem(false);
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <section className="workspace-files">
      <div className="workspace-section-heading">
        <div>
          <h2>Workspace Files & Storage</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Store lecture slides, notes, cheat sheets, and documents.
          </p>
        </div>

        {isAdmin && (
          <div className="workspace-files-actions">
            <button
              type="button"
              className="workspace-btn-action workspace-btn-secondary"
              onClick={() => setShowCreateFolder((prev) => !prev)}
              disabled={creatingFolder}
            >
              <FolderPlusIcon size={16} />
              <span>{showCreateFolder ? 'Cancel' : 'New Folder'}</span>
            </button>

            <label className="upload-file-label">
              <UploadIcon size={16} />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                className="hidden-file-input"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      <WorkspaceBreadcrumbs folderPath={folderPath} onNavigate={navigateToIndex} />

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger-text)',
          fontSize: '13.5px',
        }}>
          {error}
        </div>
      )}

      {showCreateFolder && isAdmin && (
        <CreateFolderForm
          name={newFolderName}
          creating={creatingFolder}
          onNameChange={(e) => setNewFolderName(e.target.value)}
          onSubmit={handleCreateFolder}
        />
      )}

      {loading ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span className="spinner" />
          <p>Loading files & folders...</p>
        </div>
      ) : isEmpty ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <FolderIcon size={36} />
          <h4 style={{ color: '#ffffff', margin: 0, fontSize: '16px' }}>
            {currentFolderId ? 'This folder is empty' : 'No files or folders yet'}
          </h4>
          <p style={{ fontSize: '13.5px', margin: 0 }}>
            {isAdmin
              ? 'Upload your first study document or create folders to organize materials.'
              : 'Workspace administrators haven\'t uploaded documents in this folder yet.'}
          </p>
        </div>
      ) : (
        <div className="workspace-files-grid">
          {folders.map((folder) => (
            <WorkspaceFolderItem
              key={folder.id}
              folder={folder}
              isAdmin={isAdmin}
              busy={busyItemId === `folder-${folder.id}`}
              onOpen={openFolder}
              onDelete={handleDeleteFolder}
            />
          ))}

          {files.map((file) => (
            <WorkspaceFileItem
              key={file.id}
              file={file}
              isAdmin={isAdmin}
              busy={busyItemId === `file-${file.id}`}
              onDownload={handleDownload}
              onDelete={handleDeleteFile}
            />
          ))}
        </div>
      )}
      {/* Folder delete confirm */}
      {confirmDeleteFolder && (
        <ConfirmModal
          title="Delete Folder"
          message={`Delete "${confirmDeleteFolder.name}" and all its contents? This cannot be undone.`}
          confirmText="Delete Folder"
          variant="danger"
          loading={deletingItem}
          onConfirm={confirmFolderDelete}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}

      {/* File delete confirm */}
      {confirmDeleteFile && (
        <ConfirmModal
          title="Delete File"
          message={`Are you sure you want to delete "${confirmDeleteFile.name}"? This cannot be undone.`}
          confirmText="Delete File"
          variant="danger"
          loading={deletingItem}
          onConfirm={confirmFileDelete}
          onCancel={() => setConfirmDeleteFile(null)}
        />
      )}
    </section>
  );
}

export default WorkspaceFiles;