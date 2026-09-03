import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthContext'

import {
  getWorkspaces,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../services/workspaceService'

import JoinRequestList from '../components/home/JoinRequestList'

import '../styles/home.css'


function AppHome() {
  const { user, accessToken } = useAuth()

  const [joinRequests, setJoinRequests] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [processingRequestId, setProcessingRequestId] =
    useState(null)


  useEffect(() => {
    if (!accessToken || !user?.username) {
      setJoinRequests([])
      setLoading(false)
      return
    }


    let cancelled = false


    async function loadJoinRequests() {
      try {
        setLoading(true)
        setError('')


        const workspaces =
          await getWorkspaces(accessToken)


        if (cancelled) {
          return
        }


        const adminWorkspaces =
          workspaces.filter((workspace) => {
            const isOwner =
              workspace.owner === user.username

            const isAdmin =
              workspace.members?.some(
                (member) =>
                  member.user === user.username &&
                  member.role === 'admin',
              )

            return isOwner || isAdmin
          })


        const requests =
          await Promise.all(
            adminWorkspaces.map(
              async (workspace) => {
                const workspaceRequests =
                  await getJoinRequests(
                    accessToken,
                    workspace.id,
                  )


                return workspaceRequests.map(
                  (request) => ({
                    ...request,
                    workspaceName:
                      workspace.name,
                    workspaceId:
                      workspace.id,
                  }),
                )
              },
            ),
          )


        if (cancelled) {
          return
        }


        setJoinRequests(
          requests
            .flat()
            .filter(
              (request) =>
                request.status === 'pending',
            ),
        )

      } catch (err) {
        if (cancelled) {
          return
        }

        setError(
          err?.message ||
          'Failed to load join requests.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }


    loadJoinRequests()


    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    user?.username,
  ])


  async function handleApprove(request) {
    if (!accessToken) {
      return
    }


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
          (item) =>
            item.id !== request.id,
        ),
      )

    } catch (err) {
      setError(
        err?.message ||
        'Failed to approve join request.',
      )
    } finally {
      setProcessingRequestId(null)
    }
  }


  async function handleReject(request) {
    if (!accessToken) {
      return
    }


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
          (item) =>
            item.id !== request.id,
        ),
      )

    } catch (err) {
      setError(
        err?.message ||
        'Failed to reject join request.',
      )
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
            Welcome back, {user?.username}
          </h1>

          <p className="home-subtitle">
            Manage your workspace activity from here.
          </p>

        </div>

      </section>


      <section className="home-section">

        <div className="section-header">

          <div>

            <h2>
              Join Requests
            </h2>

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


        <JoinRequestList
          requests={joinRequests}
          loading={loading}
          processingRequestId={
            processingRequestId
          }
          onApprove={handleApprove}
          onReject={handleReject}
        />

      </section>

    </main>
  )
}


export default AppHome