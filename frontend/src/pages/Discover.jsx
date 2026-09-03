import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthContext'

import {
  getDiscoveredWorkspaces,
  joinWorkspace,
} from '../services/workspaceService'

import DiscoverWorkspaceGrid from '../components/discover/DiscoverWorkspaceGrid'

import '../styles/discover.css'


function Discover() {
  const { accessToken } = useAuth()

  const [workspaces, setWorkspaces] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [joiningWorkspaceId, setJoiningWorkspaceId] =
    useState(null)

  const [joinedWorkspaceIds, setJoinedWorkspaceIds] =
    useState(new Set())


  useEffect(() => {
    let cancelled = false


    async function loadWorkspaces() {
      if (!accessToken) {
        setWorkspaces([])
        setLoading(false)
        return
      }


      try {
        setLoading(true)
        setError('')


        const data =
          await getDiscoveredWorkspaces(
            accessToken,
          )


        if (cancelled) {
          return
        }


        const discovered =
          Array.isArray(data)
            ? data
            : data?.results ?? []


        setWorkspaces(discovered)

      } catch (err) {

        if (cancelled) {
          return
        }


        setError(
          err?.message ||
          'Failed to load discoverable workspaces.',
        )

      } finally {

        if (!cancelled) {
          setLoading(false)
        }
      }
    }


    loadWorkspaces()


    return () => {
      cancelled = true
    }
  }, [accessToken])


  async function handleJoin(workspace) {
    if (!accessToken) {
      return
    }


    if (
      joiningWorkspaceId === workspace.id
    ) {
      return
    }


    try {
      setJoiningWorkspaceId(workspace.id)
      setError('')


      await joinWorkspace(
        accessToken,
        workspace.id,
      )


      setJoinedWorkspaceIds(
        (current) => {
          const updated =
            new Set(current)

          updated.add(workspace.id)

          return updated
        },
      )

    } catch (err) {

      setError(
        err?.message ||
        'Failed to join workspace.',
      )

    } finally {

      setJoiningWorkspaceId(null)
    }
  }


  if (loading) {
    return (
      <main className="discover-page">

        <header className="discover-header">

          <div>

            <span className="discover-eyebrow">
              StudyGram
            </span>

            <h1>
              Discover Workspaces
            </h1>

            <p>
              Find study communities to join.
            </p>

          </div>

        </header>


        <section className="discover-state">

          <p>
            Loading workspaces...
          </p>

        </section>

      </main>
    )
  }


  return (
    <main className="discover-page">

      <header className="discover-header">

        <div>

          <span className="discover-eyebrow">
            StudyGram
          </span>

          <h1>
            Discover Workspaces
          </h1>

          <p>
            Find study communities to join.
          </p>

        </div>

      </header>


      {error && (
        <div className="discover-error">
          {error}
        </div>
      )}


      {workspaces.length === 0 ? (

        <section className="discover-state">

          <h2>
            No workspaces found
          </h2>

          <p>
            There are currently no public
            workspaces available to discover.
          </p>

        </section>

      ) : (

        <DiscoverWorkspaceGrid
          workspaces={workspaces}
          joinedWorkspaceIds={joinedWorkspaceIds}
          joiningWorkspaceId={
            joiningWorkspaceId
          }
          onJoin={handleJoin}
        />

      )}

    </main>
  )
}


export default Discover