import { useState } from 'react';
import MemberManagementModal from './MemberManagementModal';
import { ShieldIcon, ShareIcon } from '../../common/Icons';
import '../../../styles/components/workspace/members/management.css';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          className="workspace-btn-action workspace-btn-secondary"
          onClick={() => setRoleAction('promote')}
          style={{ height: '34px', padding: '0 14px', fontSize: '13px' }}
        >
          <ShieldIcon size={14} /> Promote
        </button>

        <button
          type="button"
          className="workspace-btn-action workspace-btn-secondary"
          onClick={() => setRoleAction('demote')}
          style={{ height: '34px', padding: '0 14px', fontSize: '13px' }}
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