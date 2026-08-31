import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import {
  getDiscoveredWorkspaces,
  joinWorkspace,
} from '../services/workspaceService'

import '../styles/discover.css'


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


function Discover() {
  const { accessToken } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [joiningWorkspaceId, setJoiningWorkspaceId] =
    useState(null)

  const [joinError, setJoinError] = useState('')


  async function loadWorkspaces() {
    try {
      setLoading(true)
      setError('')

      const data =
        await getDiscoveredWorkspaces(accessToken)

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


  async function handleJoin(workspaceId) {
    try {
      setJoiningWorkspaceId(workspaceId)
      setJoinError('')

      await joinWorkspace(
        accessToken,
        workspaceId,
      )

      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                joined: true,
              }
            : workspace,
        ),
      )
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoiningWorkspaceId(null)
    }
  }


  if (loading) {
    return (
      <main className="discover-page">
        <div className="discover-container">
          <section className="discover-state">
            <h1>Discover</h1>
            <p>Loading workspaces...</p>
          </section>
        </div>
      </main>
    )
  }


  if (error) {
    return (
      <main className="discover-page">
        <div className="discover-container">
          <section className="discover-state discover-error">
            <h1>Discover</h1>
            <p>{error}</p>

            <button
              type="button"
              onClick={loadWorkspaces}
            >
              Try again
            </button>
          </section>
        </div>
      </main>
    )
  }


  return (
    <main className="discover-page">
      <div className="discover-container">

        <header className="discover-header">
          <div>
            <h1>Discover</h1>

            <p>
              Find communities and workspaces
              that interest you.
            </p>
          </div>
        </header>


        {joinError && (
          <div className="discover-alert">
            <span>{joinError}</span>

            <button
              type="button"
              onClick={() => setJoinError('')}
            >
              ×
            </button>
          </div>
        )}


        {workspaces.length === 0 ? (
          <section className="discover-state">
            <h2>No workspaces yet</h2>

            <p>
              There are no workspaces available
              to discover right now.
            </p>
          </section>
        ) : (
          <section className="workspace-grid">

            {workspaces.map((workspace) => {
              const isPublic =
                workspace.visibility === 'public'

              const isJoining =
                joiningWorkspaceId === workspace.id

              const isJoined =
                workspace.joined === true


              return (
                <article
                  key={workspace.id}
                  className="discover-card"
                >

                  <div className="discover-card-top">

                    <div className="workspace-avatar">
                      {workspace.name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <span
                      className={`visibility-badge ${
                        isPublic
                          ? 'public'
                          : 'private'
                      }`}
                    >
                      {isPublic
                        ? 'Public'
                        : 'Private'}
                    </span>

                  </div>


                  <div className="discover-card-content">

                    <h2>
                      {workspace.name}
                    </h2>

                    <p className="workspace-owner">
                      Owned by {workspace.owner}
                    </p>


                    <div className="workspace-meta">

                      <span>
                        {workspace.member_count}{' '}
                        {workspace.member_count === 1
                          ? 'member'
                          : 'members'}
                      </span>

                      <span className="meta-divider">
                        ·
                      </span>

                      <span>
                        {formatRelativeTime(
                          workspace.created,
                        )}
                      </span>

                    </div>

                  </div>


                  <div className="discover-card-actions">

                    <Link
                      to={`/app/workspaces/${workspace.id}`}
                      className="view-workspace-button"
                    >
                      View
                    </Link>


                    <button
                      type="button"
                      className={`join-button ${
                        isJoined
                          ? 'joined'
                          : ''
                      }`}
                      onClick={() =>
                        handleJoin(workspace.id)
                      }
                      disabled={
                        isJoining || isJoined
                      }
                    >
                      {isJoining
                        ? 'Joining...'
                        : isJoined
                          ? 'Joined'
                          : 'Join'}
                    </button>

                  </div>

                </article>
              )
            })}

          </section>
        )}

      </div>
    </main>
  )
}


export default Discover