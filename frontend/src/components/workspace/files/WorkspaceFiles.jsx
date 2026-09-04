import "../../../styles/shared/workspace.css";
import "../../../styles/components/workspace/files/files.css";

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../../../auth/AuthContext'

import {
  getWorkspaceFolders,
  createWorkspaceFolder,
  deleteWorkspaceFolder,
  getWorkspaceFiles,
  uploadWorkspaceFile,
  deleteWorkspaceFile,
  downloadWorkspaceFile,
} from '../../../services/workspaceFileService'

import WorkspaceBreadcrumbs
  from './WorkspaceBreadcrumbs'

import CreateFolderForm
  from './CreateFolderForm'

import WorkspaceFolderItem
  from './WorkspaceFolderItem'

import WorkspaceFileItem
  from './WorkspaceFileItem'


function WorkspaceFiles({
  workspaceId,
  isAdmin = false,
}) {
  const { accessToken } = useAuth()

  const [folderPath, setFolderPath] =
    useState([])

  const [folders, setFolders] =
    useState([])

  const [files, setFiles] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [busyItemId, setBusyItemId] =
    useState(null)

  const [showCreateFolder, setShowCreateFolder] =
    useState(false)

  const [newFolderName, setNewFolderName] =
    useState('')

  const [creatingFolder, setCreatingFolder] =
    useState(false)

  const [uploading, setUploading] =
    useState(false)


  const currentFolder =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1]
      : null

  const currentFolderId =
    currentFolder?.id ?? null


  const loadContents = useCallback(
    async () => {
      if (
        !accessToken ||
        !workspaceId
      ) {
        return
      }

      try {
        setLoading(true)
        setError('')

        const [
          folderData,
          fileData,
        ] = await Promise.all([
          getWorkspaceFolders(
            accessToken,
            workspaceId,
            currentFolderId,
          ),

          getWorkspaceFiles(
            accessToken,
            workspaceId,
            currentFolderId,
          ),
        ])

        setFolders(folderData)
        setFiles(fileData)
      } catch (err) {
        setError(
          err?.message ||
          'Failed to load files.',
        )
      } finally {
        setLoading(false)
      }
    },
    [
      accessToken,
      workspaceId,
      currentFolderId,
    ],
  )


  useEffect(() => {
    loadContents()
  }, [loadContents])


  function openFolder(folder) {
    setFolderPath((current) => [
      ...current,
      {
        id: folder.id,
        name: folder.name,
      },
    ])
  }


  function navigateToIndex(index) {
    if (index < 0) {
      setFolderPath([])
      return
    }

    setFolderPath((current) =>
      current.slice(0, index + 1),
    )
  }


  async function handleCreateFolder(
    event,
  ) {
    event.preventDefault()

    if (!newFolderName.trim()) {
      return
    }

    try {
      setCreatingFolder(true)
      setError('')

      await createWorkspaceFolder(
        accessToken,
        workspaceId,
        {
          name: newFolderName.trim(),
          parent: currentFolderId,
        },
      )

      setNewFolderName('')
      setShowCreateFolder(false)

      await loadContents()
    } catch (err) {
      setError(
        err?.message ||
        'Failed to create folder.',
      )
    } finally {
      setCreatingFolder(false)
    }
  }


  async function handleDeleteFolder(
    folder,
  ) {
    const confirmed =
      window.confirm(
        `Delete folder "${folder.name}" and everything inside it?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyItemId(
        `folder-${folder.id}`,
      )

      setError('')

      await deleteWorkspaceFolder(
        accessToken,
        workspaceId,
        folder.id,
      )

      await loadContents()
    } catch (err) {
      setError(
        err?.message ||
        'Failed to delete folder.',
      )
    } finally {
      setBusyItemId(null)
    }
  }


  async function handleUpload(event) {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setUploading(true)
      setError('')

      await uploadWorkspaceFile(
        accessToken,
        workspaceId,
        {
          name: file.name,
          uploaded_file: file,
          folder: currentFolderId,
        },
      )

      await loadContents()
    } catch (err) {
      setError(
        err?.message ||
        'Failed to upload file.',
      )
    } finally {
      setUploading(false)
    }
  }


  async function handleDownload(file) {
    try {
      setBusyItemId(
        `file-${file.id}`,
      )

      setError('')

      await downloadWorkspaceFile(
        accessToken,
        workspaceId,
        file.id,
        file.name,
      )
    } catch (err) {
      setError(
        err?.message ||
        'Failed to download file.',
      )
    } finally {
      setBusyItemId(null)
    }
  }


  async function handleDeleteFile(file) {
    const confirmed =
      window.confirm(
        `Delete "${file.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyItemId(
        `file-${file.id}`,
      )

      setError('')

      await deleteWorkspaceFile(
        accessToken,
        workspaceId,
        file.id,
      )

      await loadContents()
    } catch (err) {
      setError(
        err?.message ||
        'Failed to delete file.',
      )
    } finally {
      setBusyItemId(null)
    }
  }


  const isEmpty =
    !loading &&
    folders.length === 0 &&
    files.length === 0


  return (
    <section className="workspace-detail-card workspace-files">

      <div className="workspace-section-heading">

        <div>

          <span className="workspace-eyebrow">
            Storage
          </span>

          <h2>
            Files
          </h2>

        </div>


        {isAdmin && (
          <div className="workspace-files-actions">

            <button
              type="button"
              className="workspace-button workspace-button-secondary"
              onClick={() =>
                setShowCreateFolder(
                  (current) => !current,
                )
              }
              disabled={creatingFolder}
            >
              {showCreateFolder
                ? 'Cancel'
                : 'New Folder'}
            </button>


            <label className="workspace-button workspace-button-primary workspace-upload-label">

              {uploading
                ? 'Uploading...'
                : 'Upload File'}

              <input
                type="file"
                className="workspace-upload-input"
                onChange={handleUpload}
                disabled={uploading}
              />

            </label>

          </div>
        )}

      </div>


      <WorkspaceBreadcrumbs
        folderPath={folderPath}
        onNavigate={navigateToIndex}
      />


      {error && (
        <p className="workspace-error">
          {error}
        </p>
      )}


      {showCreateFolder && isAdmin && (
        <CreateFolderForm
          name={newFolderName}
          creating={creatingFolder}
          onNameChange={(event) =>
            setNewFolderName(
              event.target.value,
            )
          }
          onSubmit={handleCreateFolder}
        />
      )}


      {loading ? (

        <div className="workspace-empty">

          <p>
            Loading files...
          </p>

        </div>

      ) : isEmpty ? (

        <div className="workspace-empty">

          <p>
            {currentFolderId
              ? 'This folder is empty.'
              : 'No files or folders yet.'}
          </p>

          {!isAdmin && (
            <p className="workspace-empty-hint">
              Only workspace admins can
              upload files.
            </p>
          )}

        </div>

      ) : (

        <div className="workspace-files-list">

          {folders.map((folder) => (
            <WorkspaceFolderItem
              key={folder.id}
              folder={folder}
              isAdmin={isAdmin}
              busy={
                busyItemId ===
                `folder-${folder.id}`
              }
              onOpen={openFolder}
              onDelete={handleDeleteFolder}
            />
          ))}


          {files.map((file) => (
            <WorkspaceFileItem
              key={file.id}
              file={file}
              isAdmin={isAdmin}
              busy={
                busyItemId ===
                `file-${file.id}`
              }
              onDownload={handleDownload}
              onDelete={handleDeleteFile}
            />
          ))}

        </div>

      )}

    </section>
  )
}


export default WorkspaceFiles