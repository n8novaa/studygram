import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from '../services/workspaceService'

import WorkspaceHeader
  from '../components/workspace/WorkspaceHeader'

import WorkspaceOverview
  from '../components/workspace/overview/WorkspaceOverview'

import WorkspaceEditForm
  from '../components/workspace/overview/WorkspaceEditForm'

import WorkspaceMembers
  from '../components/workspace/members/workspaceMembers'

import WorkspaceFiles
  from '../components/workspace/files/WorkspaceFiles'

import '../styles/pages/workspace-detail.css'


function WorkspaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { accessToken, user } = useAuth()

  const [workspace, setWorkspace] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [editing, setEditing] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [deleting, setDeleting] =
    useState(false)

  const [name, setName] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [visibility, setVisibility] =
    useState('private')

  const [formError, setFormError] =
    useState('')

  const [activeSection, setActiveSection] =
    useState(null)


  useEffect(() => {
    async function loadWorkspace() {
      if (!accessToken) {
        return
      }

      try {
        setLoading(true)
        setError('')

        const data =
          await getWorkspace(
            accessToken,
            id,
          )

        setWorkspace(data)

        setName(data.name || '')

        setDescription(
          data.description || '',
        )

        setVisibility(
          data.visibility || 'private',
        )
      } catch (err) {
        setError(
          err?.message ||
          'Failed to load workspace.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [accessToken, id])


  function startEditing() {
    setName(workspace.name || '')

    setDescription(
      workspace.description || '',
    )

    setVisibility(
      workspace.visibility || 'private',
    )

    setFormError('')
    setEditing(true)
  }


  function cancelEditing() {
    setName(workspace.name || '')

    setDescription(
      workspace.description || '',
    )

    setVisibility(
      workspace.visibility || 'private',
    )

    setFormError('')
    setEditing(false)
  }


  async function handleSave(event) {
    event.preventDefault()

    if (!name.trim()) {
      setFormError(
        'Workspace name is required.',
      )

      return
    }

    try {
      setSaving(true)
      setFormError('')

      const updatedWorkspace =
        await updateWorkspace(
          accessToken,
          id,
          {
            name: name.trim(),
            description:
              description.trim(),
            visibility,
          },
        )

      setWorkspace(updatedWorkspace)
      setEditing(false)
    } catch (err) {
      setFormError(
        err?.message ||
        'Failed to update workspace.',
      )
    } finally {
      setSaving(false)
    }
  }


  async function handleDelete() {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this workspace? This action cannot be undone.',
      )

    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)
      setError('')

      await deleteWorkspace(
        accessToken,
        id,
      )

      navigate(
        '/app/workspaces',
        {
          replace: true,
        },
      )
    } catch (err) {
      setError(
        err?.message ||
        'Failed to delete workspace.',
      )

      setDeleting(false)
    }
  }


  function handleSectionChange(section) {
    setEditing(false)
    setFormError('')
    setActiveSection(section)
  }


  if (loading) {
    return (
      <main className="workspace-detail-page">

        <section className="workspace-detail-state">
          <p>
            Loading workspace...
          </p>
        </section>

      </main>
    )
  }


  if (error) {
    return (
      <main className="workspace-detail-page">

        <section className="workspace-detail-state workspace-state-error">
          <p>
            {error}
          </p>
        </section>

      </main>
    )
  }


  if (!workspace) {
    return (
      <main className="workspace-detail-page">

        <section className="workspace-detail-state">
          <p>
            Workspace not found.
          </p>
        </section>

      </main>
    )
  }


  const currentUsername =
    user?.username

  const isOwner =
    workspace.owner === currentUsername

  const currentMember =
    workspace.members?.find(
      (member) =>
        member.user === currentUsername,
    )

  const isAdmin =
    isOwner ||
    currentMember?.role === 'admin'


  return (
    <main className="workspace-detail-page">

      <WorkspaceHeader
        workspace={workspace}
        isOwner={false}
        isAdmin={false}
        editing={editing}
        saving={saving}
        deleting={deleting}
        onEdit={startEditing}
        onDelete={handleDelete}
      />


      <nav
        className="workspace-section-navigation"
        aria-label="Workspace sections"
      >

        <button
          type="button"
          className={
            `workspace-section-button ${
              activeSection === 'overview'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            handleSectionChange('overview')
          }
        >
          <span className="workspace-section-button-icon">
            ◈
          </span>

          <span className="workspace-section-button-content">
            <span className="workspace-section-button-title">
              Overview
            </span>

            <span className="workspace-section-button-description">
              Details and information
            </span>
          </span>

          <span className="workspace-section-button-arrow">
            →
          </span>
        </button>


        <button
          type="button"
          className={
            `workspace-section-button ${
              activeSection === 'members'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            handleSectionChange('members')
          }
        >
          <span className="workspace-section-button-icon">
            ◉
          </span>

          <span className="workspace-section-button-content">
            <span className="workspace-section-button-title">
              Members
            </span>

            <span className="workspace-section-button-description">
              Workspace community
            </span>
          </span>

          <span className="workspace-section-button-arrow">
            →
          </span>
        </button>


        <button
          type="button"
          className={
            `workspace-section-button ${
              activeSection === 'files'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            handleSectionChange('files')
          }
        >
          <span className="workspace-section-button-icon">
            ▦
          </span>

          <span className="workspace-section-button-content">
            <span className="workspace-section-button-title">
              Files
            </span>

            <span className="workspace-section-button-description">
              Files and folders
            </span>
          </span>

          <span className="workspace-section-button-arrow">
            →
          </span>
        </button>

      </nav>


      <div className="workspace-detail-content">

        {activeSection === 'overview' && (
          <>
            {!editing && (
              <div className="workspace-overview-management">

                {(isAdmin || isOwner) && (
                  <button
                    type="button"
                    className="workspace-button workspace-button-secondary"
                    onClick={startEditing}
                    disabled={
                      saving || deleting
                    }
                  >
                    Edit
                  </button>
                )}

                {isOwner && (
                  <button
                    type="button"
                    className="workspace-button workspace-button-danger"
                    onClick={handleDelete}
                    disabled={
                      saving || deleting
                    }
                  >
                    {deleting
                      ? 'Deleting...'
                      : 'Delete'}
                  </button>
                )}

              </div>
            )}


            {editing ? (

              <WorkspaceEditForm
                name={name}
                description={description}
                visibility={visibility}
                saving={saving}
                formError={formError}

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

                onSave={handleSave}
                onCancel={cancelEditing}
              />

            ) : (

              <WorkspaceOverview
                workspace={workspace}
              />

            )}

          </>
        )}


        {activeSection === 'members' && (
          <WorkspaceMembers
            workspace={workspace}
            isAdmin={isAdmin}
          />
        )}


        {activeSection === 'files' && (
          <WorkspaceFiles
            workspaceId={workspace.id}
            isAdmin={isAdmin}
          />
        )}

      </div>

    </main>
  )
}


export default WorkspaceDetail