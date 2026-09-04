import { useEffect, useState } from 'react'

import { useAuth } from '../../../auth/AuthContext'

import { normalizeList } from '../../../utils/apiHelpers'

import {
  getWorkspaceMembers,
  removeWorkspaceMember,
} from '../../../services/workspaceMemberService'

import MemberManagement from './MemberManagement'

import "../../../styles/shared/workspace.css";
import "../../../styles/components/workspace/members/members.css";


function WorkspaceMembers({
  workspace,
  isAdmin = false,
}) {
  const { accessToken, user } = useAuth()

  const [members, setMembers] = useState(
    () => normalizeList(workspace?.members),
  )

  const [loading, setLoading] = useState(false)
  const [actionUserId, setActionUserId] =
    useState(null)

  const [error, setError] = useState('')


  async function loadMembers() {
    if (
      !accessToken ||
      !workspace?.id ||
      !isAdmin
    ) {
      return
    }

    try {
      setLoading(true)
      setError('')

      const data =
        await getWorkspaceMembers(
          accessToken,
          workspace.id,
        )

      setMembers(normalizeList(data))
    } catch (err) {
      setError(
        err?.message ||
        'Failed to load workspace members.',
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (!isAdmin) {
      setMembers(
        normalizeList(workspace?.members),
      )

      setLoading(false)
      setError('')

      return
    }

    let cancelled = false


    async function load() {
      if (!accessToken || !workspace?.id) {
        return
      }

      try {
        setLoading(true)
        setError('')

        const data =
          await getWorkspaceMembers(
            accessToken,
            workspace.id,
          )

        if (cancelled) {
          return
        }

        setMembers(normalizeList(data))
      } catch (err) {
        if (cancelled) {
          return
        }

        setError(
          err?.message ||
          'Failed to load workspace members.',
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
  }, [
    accessToken,
    workspace?.id,
    workspace?.members,
    isAdmin,
  ])


  function isCurrentUser(member) {
    return member.user === user?.username
  }


  function isOwner(member) {
    return member.user === workspace.owner
  }


  function memberIsAdmin(member) {
    return member.role === 'admin'
  }


  async function handleRemove(member) {
    if (!isAdmin) {
      return
    }

    const confirmed = window.confirm(
      `Remove ${member.user} from this workspace?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setActionUserId(member.user_id)
      setError('')

      await removeWorkspaceMember(
        accessToken,
        workspace.id,
        member.user_id,
      )

      await loadMembers()
    } catch (err) {
      setError(
        err?.message ||
        'Failed to remove member.',
      )
    } finally {
      setActionUserId(null)
    }
  }


  return (
    <section className="workspace-detail-card workspace-members">

      <div className="workspace-section-heading">

        <div>

          <span className="workspace-eyebrow">
            Community
          </span>

          <h2>
            Members
          </h2>

        </div>


        <div className="workspace-members-heading-actions">

          <span className="workspace-member-count">
            {members.length}{' '}

            {members.length === 1
              ? 'member'
              : 'members'}
          </span>


          <MemberManagement
            members={members}
            workspace={workspace}
            accessToken={accessToken}
            isAdmin={isAdmin}
            onMembersChanged={loadMembers}
          />

        </div>

      </div>


      {error && (
        <p className="workspace-error">
          {error}
        </p>
      )}


      {loading ? (

        <div className="workspace-empty">

          <p>
            Loading members...
          </p>

        </div>

      ) : members.length > 0 ? (

        <div className="workspace-member-list">

          {members.map((member) => {
            const admin =
              memberIsAdmin(member)

            const owner =
              isOwner(member)

            const currentUser =
              isCurrentUser(member)

            const busy =
              actionUserId === member.user_id


            return (
              <div
                className="workspace-member"
                key={member.user_id}
              >

                <div className="workspace-member-avatar">

                  {member.user
                    ?.charAt(0)
                    ?.toUpperCase()}

                </div>


                <div className="workspace-member-details">

                  <strong>

                    {member.user}

                    {currentUser && (
                      <span className="workspace-member-you">
                        You
                      </span>
                    )}

                  </strong>


                  <span>

                    {owner
                      ? 'Owner'
                      : admin
                        ? 'Administrator'
                        : 'Member'}

                  </span>

                </div>


                <div className="workspace-member-actions">

                  {owner ? (

                    <span className="workspace-role-badge">
                      Owner
                    </span>

                  ) : currentUser ? (

                    <span className="workspace-role-badge">
                      {admin
                        ? 'Administrator'
                        : 'Member'}
                    </span>

                  ) : isAdmin ? (

                    <button
                      type="button"
                      className="workspace-member-action workspace-member-action-remove"
                      onClick={() =>
                        handleRemove(member)
                      }
                      disabled={busy}
                    >
                      {busy
                        ? 'Working...'
                        : 'Remove'}
                    </button>

                  ) : (

                    <span className="workspace-role-badge">
                      {admin
                        ? 'Administrator'
                        : 'Member'}
                    </span>

                  )}

                </div>

              </div>
            )
          })}

        </div>

      ) : (

        <div className="workspace-empty">

          <p>
            No members found.
          </p>

        </div>

      )}

    </section>
  )
}


export default WorkspaceMembers