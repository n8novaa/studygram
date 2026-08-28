import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from '../services/workspaceService'

function WorkspaceDetail() {
  const { accessToken, user } = useAuth()
  const { id } = useParams()

  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')  

  useEffect(() => {
    async function loadWorkspace() {
      try {
        setLoading(true)
        setError('')

        const data = await getWorkspace(accessToken, id)
        setWorkspace(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (accessToken && id) {
      loadWorkspace()
    }
  }, [accessToken, id])

  if (loading) {
    return (
      <main>
        <p>Loading workspace...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <Link to="/app/workspaces">
          ← Back to Workspaces
        </Link>

        <h1>Workspace</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (!workspace) {
    return null
  }

  const currentMember = workspace.members?.find(
    (member) => member.user === user?.username,
  )

  const canEdit =
    workspace.owner === user?.username ||
    currentMember?.role === 'admin'

  const canDelete =
    workspace.owner === user?.username

  function startEditing() {
    setName(workspace.name)
    setDescription(workspace.description || '')
    setSaveError('')
    setEditing(true)
  }

  function cancelEditing() {
    setName(workspace.name)
    setDescription(workspace.description || '')
    setSaveError('')
    setEditing(false)
  }

  async function handleUpdateWorkspace(event) {
    event.preventDefault()

    if (!name.trim()) {
      setSaveError('Workspace name is required.')
      return
    }

    try {
      setSaving(true)
      setSaveError('')

      const updatedWorkspace = await updateWorkspace(
        accessToken,
        id,
        {
          name: name.trim(),
          description: description.trim(),
        },
      )

      setWorkspace(updatedWorkspace)
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteWorkspace() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)
      setDeleteError('')

      await deleteWorkspace(accessToken, id)

      window.location.href = '/app/workspaces'
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  return (
    <main>
      <Link to="/app/workspaces">
        ← Back to Workspaces
      </Link>

      <header>
        {editing ? (
          <form onSubmit={handleUpdateWorkspace}>
            <h1>Edit Workspace</h1>

            <div>
              <label htmlFor="workspace-name">
                Name
              </label>

              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="workspace-description">
                Description
              </label>

              <textarea
                id="workspace-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                disabled={saving}
              />
            </div>

            {saveError && (
              <p>{saveError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1>{workspace.name}</h1>

            {workspace.description && (
              <p>{workspace.description}</p>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={startEditing}
              >
                Edit Workspace
              </button>
            )}

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteWorkspace}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Workspace'}
                    </button>
                  )}

                  {deleteError && (
                    <p>{deleteError}</p>
                  )}
                        </>
                      )}
      </header>

      <section>
        <h2>Workspace Information</h2>

        <p>
          <strong>Owner:</strong>{' '}
          {workspace.owner}
        </p>

        <p>
          <strong>Members:</strong>{' '}
          {workspace.members?.length ?? 0}
        </p>
      </section>

      <section>
        <h2>Members</h2>

        {workspace.members?.length ? (
          <ul>
            {workspace.members.map((member) => (
              <li key={member.user}>
                <strong>{member.user}</strong>
                {' — '}
                {member.role}
              </li>
            ))}
          </ul>
        ) : (
          <p>No members found.</p>
        )}
      </section>
    </main>
  )
}

export default WorkspaceDetail