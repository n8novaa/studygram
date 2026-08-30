import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from '../services/workspaceService'

function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()

  const difference = Math.floor(
    (now.getTime() - date.getTime()) / 1000,
  )

  if (difference < 60) {
    return 'just now'
  }

  const minutes = Math.floor(difference / 60)

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 30) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }

  const months = Math.floor(days / 30)

  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }

  const years = Math.floor(months / 12)

  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

function WorkspaceDetail() {
  const { accessToken, user } = useAuth()
  const { id } = useParams()

  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')

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

  const isPublic = workspace.visibility === 'public'

  const createdTime = new Date(workspace.created).getTime()
  const updatedTime = new Date(workspace.updated).getTime()

  // Django updates `updated` whenever the workspace is saved.
  // Treat very small differences as "created".
  const wasEdited =
    updatedTime - createdTime > 1000

  function startEditing() {
    setName(workspace.name)
    setDescription(workspace.description || '')
    setVisibility(workspace.visibility || 'private')
    setSaveError('')
    setEditing(true)
  }

  function cancelEditing() {
    setName(workspace.name)
    setDescription(workspace.description || '')
    setVisibility(workspace.visibility || 'private')
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
          visibility,
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

      {editing ? (
        <section>
          <h1>Edit Workspace</h1>

          <form onSubmit={handleUpdateWorkspace}>
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

            <div>
              <fieldset disabled={saving}>
                <legend>Visibility</legend>

                <label>
                  <input
                    type="radio"
                    name="workspace-visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={(event) =>
                      setVisibility(event.target.value)
                    }
                  />
                  Public
                </label>

                <p>
                  Anyone can discover and join this
                  workspace.
                </p>

                <label>
                  <input
                    type="radio"
                    name="workspace-visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(event) =>
                      setVisibility(event.target.value)
                    }
                  />
                  Private
                </label>

                <p>
                  Anyone can discover this workspace,
                  but joining requires administrator
                  approval.
                </p>
              </fieldset>
            </div>

            {saveError && (
              <p>{saveError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </form>
        </section>
      ) : (
        <>
          <header>
            <h1>{workspace.name}</h1>

            <p>
              <strong>
                {isPublic ? 'Public' : 'Private'}
              </strong>
            </p>

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
                {deleting
                  ? 'Deleting...'
                  : 'Delete Workspace'}
              </button>
            )}

            {deleteError && (
              <p>{deleteError}</p>
            )}
          </header>

          {workspace.description && (
            <section>
              <p>{workspace.description}</p>
            </section>
          )}

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

            <p>
              {wasEdited
                ? `Updated ${formatRelativeTime(workspace.updated)}`
                : `Created ${formatRelativeTime(workspace.created)}`}
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
        </>
      )}
    </main>
  )
}

export default WorkspaceDetail