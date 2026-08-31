import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from '../services/workspaceService'

import '../styles/workspaceDetail.css'

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
    return `${minutes} ${
      minutes === 1 ? 'minute' : 'minutes'
    } ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} ${
      hours === 1 ? 'hour' : 'hours'
    } ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 30) {
    return `${days} ${
      days === 1 ? 'day' : 'days'
    } ago`
  }

  const months = Math.floor(days / 30)

  if (months < 12) {
    return `${months} ${
      months === 1 ? 'month' : 'months'
    } ago`
  }

  const years = Math.floor(months / 12)

  return `${years} ${
    years === 1 ? 'year' : 'years'
  } ago`
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

        const data = await getWorkspace(
          accessToken,
          id,
        )

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
      <main className="workspace-detail">
        <div className="workspace-state">
          <p>Loading workspace...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="workspace-detail">
        <Link
          className="workspace-back-link"
          to="/app/workspaces"
        >
          ← Back to Workspaces
        </Link>

        <div className="workspace-state workspace-state-error">
          <h1>Workspace</h1>
          <p>{error}</p>
        </div>
      </main>
    )
  }

  if (!workspace) {
    return null
  }

  const currentMember = workspace.members?.find(
    (member) =>
      member.user === user?.username,
  )

  const canEdit =
    workspace.owner === user?.username ||
    currentMember?.role === 'admin'

  const canDelete =
    workspace.owner === user?.username

  const isPublic =
    workspace.visibility === 'public'

  const createdTime = new Date(
    workspace.created,
  ).getTime()

  const updatedTime = new Date(
    workspace.updated,
  ).getTime()

  const wasEdited =
    updatedTime - createdTime > 1000

  function startEditing() {
    setName(workspace.name)
    setDescription(
      workspace.description || '',
    )
    setVisibility(
      workspace.visibility || 'private',
    )
    setSaveError('')
    setEditing(true)
  }

  function cancelEditing() {
    setName(workspace.name)
    setDescription(
      workspace.description || '',
    )
    setVisibility(
      workspace.visibility || 'private',
    )
    setSaveError('')
    setEditing(false)
  }

  async function handleUpdateWorkspace(event) {
    event.preventDefault()

    if (!name.trim()) {
      setSaveError(
        'Workspace name is required.',
      )
      return
    }

    try {
      setSaving(true)
      setSaveError('')

      const updatedWorkspace =
        await updateWorkspace(
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

      await deleteWorkspace(
        accessToken,
        id,
      )

      window.location.href =
        '/app/workspaces'
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  return (
    <main className="workspace-detail">

      <Link
        className="workspace-back-link"
        to="/app/workspaces"
      >
        ← Back to Workspaces
      </Link>

      {editing ? (
        <section className="workspace-card workspace-edit-card">
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-eyebrow">
                Workspace settings
              </span>

              <h1>Edit Workspace</h1>
            </div>
          </div>

          <form
            className="workspace-form"
            onSubmit={handleUpdateWorkspace}
          >
            <div className="form-field">
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

            <div className="form-field">
              <label htmlFor="workspace-description">
                Description
              </label>

              <textarea
                id="workspace-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </div>

            <fieldset
              className="visibility-fieldset"
              disabled={saving}
            >
              <legend>Visibility</legend>

              <label className="visibility-option">
                <input
                  type="radio"
                  name="workspace-visibility"
                  value="public"
                  checked={
                    visibility === 'public'
                  }
                  onChange={(event) =>
                    setVisibility(
                      event.target.value,
                    )
                  }
                />

                <span>
                  <strong>Public</strong>
                  <small>
                    Anyone can discover and
                    join this workspace.
                  </small>
                </span>
              </label>

              <label className="visibility-option">
                <input
                  type="radio"
                  name="workspace-visibility"
                  value="private"
                  checked={
                    visibility === 'private'
                  }
                  onChange={(event) =>
                    setVisibility(
                      event.target.value,
                    )
                  }
                />

                <span>
                  <strong>Private</strong>
                  <small>
                    Anyone can discover this
                    workspace, but joining
                    requires administrator
                    approval.
                  </small>
                </span>
              </label>
            </fieldset>

            {saveError && (
              <p className="workspace-error">
                {saveError}
              </p>
            )}

            <div className="workspace-form-actions">
              <button
                className="workspace-button workspace-button-primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

              <button
                className="workspace-button workspace-button-secondary"
                type="button"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="workspace-card workspace-header-card">
            <div className="workspace-header-content">
              <div>
                <div className="workspace-title-row">
                  <h1>{workspace.name}</h1>

                  <span
                    className={`workspace-visibility-badge ${
                      isPublic
                        ? 'workspace-visibility-public'
                        : 'workspace-visibility-private'
                    }`}
                  >
                    {isPublic
                      ? 'Public'
                      : 'Private'}
                  </span>
                </div>

                <p className="workspace-owner">
                  Owned by{' '}
                  <strong>
                    {workspace.owner}
                  </strong>
                </p>
              </div>

              <div className="workspace-header-actions">
                {canEdit && (
                  <button
                    className="workspace-button workspace-button-secondary"
                    type="button"
                    onClick={startEditing}
                  >
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    className="workspace-button workspace-button-danger"
                    type="button"
                    onClick={
                      handleDeleteWorkspace
                    }
                    disabled={deleting}
                  >
                    {deleting
                      ? 'Deleting...'
                      : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {deleteError && (
              <p className="workspace-error">
                {deleteError}
              </p>
            )}

            {workspace.description && (
              <p className="workspace-description">
                {workspace.description}
              </p>
            )}
          </section>

          <section className="workspace-card">
            <div className="workspace-section-heading">
              <div>
                <span className="workspace-eyebrow">
                  Overview
                </span>

                <h2>Workspace Information</h2>
              </div>
            </div>

            <div className="workspace-info-grid">
              <div className="workspace-info-item">
                <span>Owner</span>
                <strong>
                  {workspace.owner}
                </strong>
              </div>

              <div className="workspace-info-item">
                <span>Members</span>
                <strong>
                  {workspace.members?.length ??
                    0}
                </strong>
              </div>

              <div className="workspace-info-item">
                <span>Visibility</span>
                <strong>
                  {isPublic
                    ? 'Public'
                    : 'Private'}
                </strong>
              </div>

              <div className="workspace-info-item">
                <span>Activity</span>
                <strong>
                  {wasEdited
                    ? `Updated ${formatRelativeTime(
                        workspace.updated,
                      )}`
                    : `Created ${formatRelativeTime(
                        workspace.created,
                      )}`}
                </strong>
              </div>
            </div>
          </section>

          <section className="workspace-card">
            <div className="workspace-section-heading">
              <div>
                <span className="workspace-eyebrow">
                  Community
                </span>

                <h2>Members</h2>
              </div>

              <span className="workspace-member-count">
                {workspace.members?.length ??
                  0}{' '}
                {workspace.members?.length ===
                1
                  ? 'member'
                  : 'members'}
              </span>
            </div>

            {workspace.members?.length ? (
              <div className="workspace-member-list">
                {workspace.members.map(
                  (member) => (
                    <div
                      className="workspace-member"
                      key={member.user}
                    >
                      <div className="workspace-member-avatar">
                        {member.user
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div className="workspace-member-details">
                        <strong>
                          {member.user}
                        </strong>

                        <span>
                          {member.role}
                        </span>
                      </div>

                      {member.role ===
                        'admin' && (
                        <span className="workspace-role-badge">
                          Admin
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="workspace-empty">
                <p>
                  No members found.
                </p>
              </div>
            )}
          </section>

          {/*
           * Future workspace features can be
           * added below this point.
           *
           * Examples:
           * - Rooms
           * - Posts
           * - Invitations
           * - Workspace notifications
           * - Admin controls
           */}
        </>
      )}
    </main>
  )
}

export default WorkspaceDetail