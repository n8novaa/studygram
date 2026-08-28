import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  createWorkspace,
  getWorkspaces,
} from '../services/workspaceService'

function Workspaces() {
  const { accessToken } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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

      const workspace = await createWorkspace(accessToken, {
        name: name.trim(),
        description: description.trim(),
      })

      setWorkspaces((current) => [workspace, ...current])

      setName('')
      setDescription('')
      setShowCreateForm(false)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <main>
        <h1>Workspaces</h1>
        <p>Loading workspaces...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <h1>Workspaces</h1>
        <p>{error}</p>
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Workspaces</h1>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current)
            setCreateError('')
          }}
        >
          {showCreateForm ? 'Cancel' : 'Create Workspace'}
        </button>
      </header>

      {showCreateForm && (
        <section>
          <h2>Create Workspace</h2>

          <form onSubmit={handleCreateWorkspace}>
            <div>
              <label htmlFor="workspace-name">
                Name
              </label>

              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Workspace"
                disabled={creating}
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
                placeholder="What is this workspace for?"
                disabled={creating}
              />
            </div>

            {createError && (
              <p>{createError}</p>
            )}

            <button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>
        </section>
      )}

      {workspaces.length === 0 ? (
        <section>
          <p>You don't belong to any workspaces yet.</p>
        </section>
      ) : (
        <section>
          {workspaces.map((workspace) => (
            <article key={workspace.id}>
              <h2>{workspace.name}</h2>

              {workspace.description && (
                <p>{workspace.description}</p>
              )}

              <p>Owner: {workspace.owner}</p>

              <p>
                {workspace.members?.length ?? 0}{' '}
                {workspace.members?.length === 1
                  ? 'member'
                  : 'members'}
              </p>

              <Link
                to={`/app/workspaces/${workspace.id}`}
              >
                Open workspace
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default Workspaces