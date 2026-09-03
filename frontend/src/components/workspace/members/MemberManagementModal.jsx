import { useEffect, useMemo, useState } from 'react'

import {
  promoteWorkspaceMember,
  demoteWorkspaceMember,
} from '../../../services/workspaceMemberService'


function MemberManagementModal({
  action,
  members,
  workspace,
  accessToken,
  onClose,
  onMembersChanged,
}) {
  const [actionUserId, setActionUserId] =
    useState(null)

  const [error, setError] = useState('')


  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !actionUserId) {
        onClose()
      }
    }


    document.addEventListener(
      'keydown',
      handleKeyDown,
    )


    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [actionUserId, onClose])


  const candidates = useMemo(() => {
    return members.filter((member) => {
      const isOwner =
        member.user === workspace.owner

      if (isOwner) {
        return false
      }


      if (action === 'promote') {
        return member.role !== 'admin'
      }


      return member.role === 'admin'
    })
  }, [
    members,
    workspace.owner,
    action,
  ])


  async function handleAction(member) {
    try {
      setActionUserId(member.user_id)
      setError('')


      if (action === 'promote') {
        await promoteWorkspaceMember(
          accessToken,
          workspace.id,
          member.user_id,
        )
      } else {
        await demoteWorkspaceMember(
          accessToken,
          workspace.id,
          member.user_id,
        )
      }


      await onMembersChanged()

      onClose()
    } catch (err) {
      setError(
        err?.message ||
        `Failed to ${
          action === 'promote'
            ? 'promote'
            : 'demote'
        } member.`,
      )
    } finally {
      setActionUserId(null)
    }
  }


  function handleBackdropMouseDown(event) {
    if (
      event.target === event.currentTarget &&
      !actionUserId
    ) {
      onClose()
    }
  }


  const isPromote =
    action === 'promote'


  return (
    <div
      className="workspace-member-modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
    >

      <div
        className="workspace-member-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-member-modal-title"
      >

        <div className="workspace-member-modal-header">

          <div>

            <span className="workspace-eyebrow">
              Member Management
            </span>

            <h3 id="workspace-member-modal-title">
              {isPromote
                ? 'Promote Member'
                : 'Demote Administrator'}
            </h3>

          </div>


          <button
            type="button"
            className="workspace-member-modal-close"
            onClick={onClose}
            disabled={Boolean(actionUserId)}
            aria-label="Close"
          >
            ×
          </button>

        </div>


        <p className="workspace-member-modal-description">

          {isPromote
            ? 'Select a member to promote to administrator.'
            : 'Select an administrator to return to the member role.'}

        </p>


        {error && (
          <p className="workspace-error">
            {error}
          </p>
        )}


        <div className="workspace-member-candidate-list">

          {candidates.length === 0 ? (

            <div className="workspace-member-modal-empty">

              <p>
                {isPromote
                  ? 'There are no members available for promotion.'
                  : 'There are no administrators available for demotion.'}
              </p>

            </div>

          ) : (

            candidates.map((member) => {
              const busy =
                actionUserId === member.user_id


              return (
                <div
                  className="workspace-member-candidate"
                  key={member.user_id}
                >

                  <div className="workspace-member-candidate-info">

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
                        {isPromote
                          ? 'Member'
                          : 'Administrator'}
                      </span>

                    </div>

                  </div>


                  <button
                    type="button"
                    className={
                      isPromote
                        ? 'workspace-member-modal-action workspace-member-modal-action-promote'
                        : 'workspace-member-modal-action'
                    }
                    onClick={() =>
                      handleAction(member)
                    }
                    disabled={busy}
                  >
                    {busy
                      ? 'Working...'
                      : isPromote
                        ? 'Promote'
                        : 'Demote'}
                  </button>

                </div>
              )
            })

          )}

        </div>


        <div className="workspace-member-modal-footer">

          <button
            type="button"
            className="workspace-member-modal-cancel"
            onClick={onClose}
            disabled={Boolean(actionUserId)}
          >
            Close
          </button>

        </div>

      </div>

    </div>
  )
}


export default MemberManagementModal