import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  createWorkspace,
  getWorkspaces,
} from '../services/workspaceService'

import '../styles/workspaces.css'


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


function Workspaces() {
  const { accessToken } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')


  async function loadWorkspaces() {
    try {
      setLoading(true)
      setError('')

      const data = await getWorkspaces(accessToken)

      setWorkspaces(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (accessToken) {
      loadWorkspaces()
    }
  }, [accessToken])


  async function handleCreateWorkspace(event) {
    event.preventDefault()

    if (!name.trim()) {
      setCreateError('Workspace name is required.')
      return
    }

    try {
      setCreating(true)
      setCreateError('')

      const workspace = await createWorkspace(
        accessToken,
        {
          name: name.trim(),
          description: description.trim(),
          visibility,
        },
      )

      setWorkspaces((current) => [
        workspace,
        ...current,
      ])

      setName('')
      setDescription('')
      setVisibility('private')
      setShowCreateForm(false)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }


  if (loading) {
    return (
      <main className="workspaces-page">

        <header className="workspaces-header">
          <div>
            <h1>Workspaces</h1>

            <p className="workspaces-subtitle">
              Your study spaces
            </p>
          </div>
        </header>

        <section className="workspace-state">
          <p>Loading workspaces...</p>
        </section>

      </main>
    )
  }


  if (error) {
    return (
      <main className="workspaces-page">

        <header className="workspaces-header">
          <div>
            <h1>Workspaces</h1>

            <p className="workspaces-subtitle">
              Your study spaces
            </p>
          </div>
        </header>

        <section className="workspace-state workspace-error">
          <p>{error}</p>
        </section>

      </main>
    )
  }


  return (
    <main className="workspaces-page">

      {/* Page header */}

      <header className="workspaces-header">

        <div>
          <h1>Workspaces</h1>

          <p className="workspaces-subtitle">
            Your study spaces
          </p>
        </div>

        <button
          type="button"
          className="workspace-button"
          onClick={() => {
            setShowCreateForm((current) => !current)
            setCreateError('')
          }}
        >
          {showCreateForm
            ? 'Cancel'
            : 'Create Workspace'}
        </button>

      </header>


      {/* Create workspace form */}

      {showCreateForm && (
        <section className="workspace-create">

          <h2>Create Workspace</h2>

          <form
            className="workspace-form"
            onSubmit={handleCreateWorkspace}
          >

            <div className="workspace-field">

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
                placeholder="My Workspace"
                disabled={creating}
              />

            </div>


            <div className="workspace-field">

              <label htmlFor="workspace-description">
                Description
              </label>

              <textarea
                id="workspace-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="What is this workspace for?"
                disabled={creating}
              />

            </div>


            <fieldset
              className="workspace-visibility"
              disabled={creating}
            >

              <legend>Visibility</legend>

              <div className="workspace-visibility-options">

                <label className="workspace-visibility-option">

                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={(event) =>
                      setVisibility(event.target.value)
                    }
                  />

                  <span className="workspace-visibility-option-content">

                    <span className="workspace-visibility-option-title">
                      Public
                    </span>

                    <span className="workspace-visibility-option-description">
                      Anyone can discover and join this
                      workspace.
                    </span>

                  </span>

                </label>


                <label className="workspace-visibility-option">

                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(event) =>
                      setVisibility(event.target.value)
                    }
                  />

                  <span className="workspace-visibility-option-content">

                    <span className="workspace-visibility-option-title">
                      Private
                    </span>

                    <span className="workspace-visibility-option-description">
                      Anyone can discover this workspace,
                      but joining requires admin approval.
                    </span>

                  </span>

                </label>

              </div>

            </fieldset>


            {createError && (
              <p className="workspace-form-error">
                {createError}
              </p>
            )}


            <div className="workspace-form-actions">

              <button
                type="submit"
                className="workspace-button"
                disabled={creating}
              >
                {creating
                  ? 'Creating...'
                  : 'Create Workspace'}
              </button>

            </div>

          </form>

        </section>
      )}


      {/* Workspace list */}

      {workspaces.length === 0 ? (

        <section className="workspace-state">

          <p>
            You don't belong to any workspaces yet.
          </p>

        </section>

      ) : (

        <section className="workspace-list">

          {workspaces.map((workspace) => {

            const isPublic =
              workspace.visibility === 'public'

            const createdTime =
              new Date(workspace.created).getTime()

            const updatedTime =
              new Date(workspace.updated).getTime()

            const wasEdited =
              updatedTime - createdTime > 1000


            return (
              <article
                key={workspace.id}
                className="workspace-card"
              >

                <header className="workspace-card-header">

                  <h2>{workspace.name}</h2>

                  <span className="workspace-visibility-badge">
                    {isPublic
                      ? 'Public'
                      : 'Private'}
                  </span>

                </header>


                {workspace.description && (
                  <p className="workspace-description">
                    {workspace.description}
                  </p>
                )}


                <div className="workspace-meta">

                  <p>
                    {workspace.members?.length ?? 0}{' '}

                    {workspace.members?.length === 1
                      ? 'member'
                      : 'members'}
                  </p>

                  <p>
                    Owner: {workspace.owner}
                  </p>

                </div>


                <footer className="workspace-card-footer">

                  <span className="workspace-time">

                    {wasEdited
                      ? `Updated ${formatRelativeTime(
                          workspace.updated,
                        )}`
                      : `Created ${formatRelativeTime(
                          workspace.created,
                        )}`}

                  </span>


                  <Link
                    className="workspace-open-link"
                    to={`/app/workspaces/${workspace.id}`}
                  >
                    Open →
                  </Link>

                </footer>

              </article>
            )
          })}

        </section>

      )}

    </main>
  )
}


export default Workspaces