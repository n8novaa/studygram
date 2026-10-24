import { useState } from 'react';
import MemberManagementModal from './MemberManagementModal';
import { ShieldIcon, ShareIcon } from '../../common/Icons';
import '../../../styles/components/workspace/members/management.css';
import '../../../styles/components/workspace/members/management-modal.css';

function MemberManagement({
  members,
  workspace,
  accessToken,
  isAdmin,
  onMembersChanged,
  onInvite,
}) {
  const [roleAction, setRoleAction] = useState(null);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="workspace-member-management-actions">
        {onInvite && (
          <button
            type="button"
            className="workspace-btn-action workspace-btn-primary"
            onClick={onInvite}
            style={{ height: '34px', padding: '0 14px', fontSize: '13px' }}
          >
            <ShareIcon size={14} /> Invite
          </button>
        )}

        <button
          type="button"
          className="workspace-member-manage-button workspace-member-manage-button-promote"
          onClick={() => setRoleAction('promote')}
          
        >
          <ShieldIcon size={14} /> Promote
        </button>

        <button
          type="button"
          className="workspace-member-manage-button"
          onClick={() => setRoleAction('demote')}
          
        >
          Demote
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
  );
}

export default MemberManagement;
