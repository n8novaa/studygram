import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthContext'

import {
  createWorkspace,
  getWorkspaces,
} from '../services/workspaceService'

import { normalizeList } from '../utils/apiHelpers'

import WorkspaceCreateForm
  from '../components/workspace/WorkspaceCreateForm'

import WorkspaceList
  from '../components/workspace/WorkspaceList'

import "../styles/pages/workspaces.css";


function Workspaces() {
  const { accessToken } = useAuth()

  const [workspaces, setWorkspaces] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [showCreateForm, setShowCreateForm] =
    useState(false)

  const [name, setName] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [visibility, setVisibility] =
    useState('private')

  const [creating, setCreating] =
    useState(false)

  const [createError, setCreateError] =
    useState('')


  useEffect(() => {
    let cancelled = false


    async function load() {
      if (!accessToken) {
        setWorkspaces([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data =
          await getWorkspaces(accessToken)

        if (cancelled) {
          return
        }

        setWorkspaces(
          normalizeList(data),
        )
      } catch (err) {
        if (cancelled) {
          return
        }

        setError(
          err?.message ||
          'Failed to load workspaces.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }


    load()


    return () => {
      cancelled = true
    }
  }, [accessToken])


  function resetCreateForm() {
    setName('')
    setDescription('')
    setVisibility('private')
    setCreateError('')
  }


  function handleToggleCreateForm() {
    setShowCreateForm(
      (current) => !current,
    )

    setCreateError('')
  }


  async function handleCreateWorkspace(event) {
    event.preventDefault()

    if (!accessToken) {
      setCreateError(
        'You must be logged in to create a workspace.',
      )

      return
    }

    if (!name.trim()) {
      setCreateError(
        'Workspace name is required.',
      )

      return
    }

    try {
      setCreating(true)
      setCreateError('')

      await createWorkspace(
        accessToken,
        {
          name: name.trim(),
          description:
            description.trim(),
          visibility,
        },
      )

      const data =
        await getWorkspaces(
          accessToken,
        )

      setWorkspaces(
        normalizeList(data),
      )

      resetCreateForm()
      setShowCreateForm(false)

    } catch (err) {
      setCreateError(
        err?.message ||
        'Failed to create workspace.',
      )
    } finally {
      setCreating(false)
    }
  }


  if (loading) {
    return (
      <main className="workspaces-page">

        <header className="workspaces-header">

          <div>
            <h1>
              Workspaces
            </h1>

            <p className="workspaces-subtitle">
              Your study spaces
            </p>
          </div>

        </header>


        <section className="workspace-state">

          <p>
            Loading workspaces...
          </p>

        </section>

      </main>
    )
  }


  if (error) {
    return (
      <main className="workspaces-page">

        <header className="workspaces-header">

          <div>
            <h1>
              Workspaces
            </h1>

            <p className="workspaces-subtitle">
              Your study spaces
            </p>
          </div>

        </header>


        <section className="workspace-state workspace-error">

          <p>
            {error}
          </p>

        </section>

      </main>
    )
  }


  return (
    <main className="workspaces-page">

      <header className="workspaces-header">

        <div>

          <h1>
            Workspaces
          </h1>

          <p className="workspaces-subtitle">
            Your study spaces
          </p>

        </div>


        <button
          type="button"
          className="workspace-button"
          onClick={handleToggleCreateForm}
          disabled={creating}
        >
          {showCreateForm
            ? 'Cancel'
            : 'Create Workspace'}
        </button>

      </header>


      {showCreateForm && (
        <WorkspaceCreateForm
          name={name}
          description={description}
          visibility={visibility}
          creating={creating}
          createError={createError}

          onNameChange={(event) =>
            setName(
              event.target.value,
            )
          }

          onDescriptionChange={(event) =>
            setDescription(
              event.target.value,
            )
          }

          onVisibilityChange={(event) =>
            setVisibility(
              event.target.value,
            )
          }

          onSubmit={
            handleCreateWorkspace
          }
        />
      )}


      <WorkspaceList
        workspaces={workspaces}
      />

    </main>
  )
}


export default Workspaces