import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthContext'

import {
  getWorkspaces,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../services/workspaceService'

import '../styles/home.css'


function AppHome() {
  const { user, accessToken } = useAuth()

  const [joinRequests, setJoinRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [processingRequestId, setProcessingRequestId] =
    useState(null)


  async function loadJoinRequests() {
    try {
      setLoading(true)
      setError('')

      const workspaces =
        await getWorkspaces(accessToken)

      /*
       * Only load join requests for workspaces
       * where the current user is an admin.
       */
      const adminWorkspaces =
        workspaces.filter((workspace) =>
          workspace.members?.some(
            (member) =>
              member.user === user.username &&
              member.role === 'admin',
          ),
        )

      const requests =
        await Promise.all(
          adminWorkspaces.map(
            async (workspace) => {
              const data =
                await getJoinRequests(
                  accessToken,
                  workspace.id,
                )

              return data.map((request) => ({
                ...request,
                workspaceName:
                  workspace.name,
                workspaceId:
                  workspace.id,
              }))
            },
          ),
        )

      setJoinRequests(
        requests
          .flat()
          .filter(
            (request) =>
              request.status === 'pending',
          ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (accessToken) {
      loadJoinRequests()
    }
  }, [accessToken])


  async function handleApprove(request) {
    try {
      setProcessingRequestId(request.id)
      setError('')

      await approveJoinRequest(
        accessToken,
        request.workspaceId,
        request.id,
      )

      setJoinRequests((current) =>
        current.filter(
          (item) => item.id !== request.id,
        ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingRequestId(null)
    }
  }


  async function handleReject(request) {
    try {
      setProcessingRequestId(request.id)
      setError('')

      await rejectJoinRequest(
        accessToken,
        request.workspaceId,
        request.id,
      )

      setJoinRequests((current) =>
        current.filter(
          (item) => item.id !== request.id,
        ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingRequestId(null)
    }
  }


  return (
    <main className="home-page">

      <section className="home-header">
        <div>
          <p className="home-eyebrow">
            StudyGram
          </p>

          <h1>
            Welcome back, {user.username}
          </h1>

          <p className="home-subtitle">
            Manage your workspace activity from here.
          </p>
        </div>
      </section>


      <section className="home-section">

        <div className="section-header">
          <div>
            <h2>Join Requests</h2>

            <p>
              Requests from users who want to join
              your workspaces.
            </p>
          </div>

          {joinRequests.length > 0 && (
            <span className="section-count">
              {joinRequests.length}
            </span>
          )}
        </div>


        {error && (
          <div className="home-error">
            {error}
          </div>
        )}


        <div className="request-list">

          {loading ? (
            <div className="home-state">
              <p>Loading join requests...</p>
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="home-state">
              <h3>No pending requests</h3>

              <p>
                Join requests for your workspaces
                will appear here.
              </p>
            </div>
          ) : (
            joinRequests.map((request) => {
              const processing =
                processingRequestId === request.id

              return (
                <article
                  className="request-card"
                  key={request.id}
                >

                  <div className="request-content">

                    <div className="request-avatar">
                      {request.user
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div className="request-details">

                      <h3>
                        {request.user}
                      </h3>

                      <p>
                        wants to join
                        <strong>
                          {' '}
                          {request.workspaceName}
                        </strong>
                      </p>

                    </div>

                  </div>


                  <div className="request-actions">

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() =>
                        handleApprove(request)
                      }
                      disabled={processing}
                    >
                      {processing
                        ? 'Processing...'
                        : 'Accept'}
                    </button>

                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        handleReject(request)
                      }
                      disabled={processing}
                    >
                      Reject
                    </button>

                  </div>

                </article>
              )
            })
          )}

        </div>

      </section>

    </main>
  )
}


export default AppHome