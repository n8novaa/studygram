import { useState } from 'react'

import MemberManagementModal from './MemberManagementModal'


function MemberManagement({
  members,
  workspace,
  accessToken,
  isAdmin,
  onMembersChanged,
}) {
  const [roleAction, setRoleAction] = useState(null)


  if (!isAdmin) {
    return null
  }


  return (
    <>
      <div className="workspace-member-management-actions">

        <button
          type="button"
          className="workspace-member-manage-button workspace-member-manage-button-promote"
          onClick={() => setRoleAction('promote')}
        >
          Promote Member
        </button>


        <button
          type="button"
          className="workspace-member-manage-button"
          onClick={() => setRoleAction('demote')}
        >
          Demote Admin
        </button>

      </div>


      {roleAction && (
        <MemberManagementModal
          action={roleAction}
          members={members}
          workspace={workspace}
          accessToken={accessToken}
          onClose={() => setRoleAction(null)}
          onMembersChanged={onMembersChanged}
        />
      )}
    </>
  )
}


export default MemberManagement