import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { normalizeList } from '../../../utils/apiHelpers';
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
} from '../../../services/workspaceMemberService';
import MemberManagement from './MemberManagement';
import RemoveMemberModal from './RemoveMemberModal'
import { UsersIcon } from '../../common/Icons';
import { useToast } from '../../common/ToastContext';
import '../../../styles/components/workspace/members/members.css';
import '../../../styles/components/workspace/members/management-modal.css'

function WorkspaceMembers({ workspace, isAdmin = false, onInvite }) {
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [members, setMembers] = useState(() => normalizeList(workspace?.members));
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [error, setError] = useState('');
  const [removeMember, setRemoveMember] =
  useState(null)
  const workspaceId = workspace?.id;

  const loadMembers = useCallback(async () => {
    if (!accessToken || !workspaceId) return;

    try {
      setLoading(true);
      setError('');
      const data = await getWorkspaceMembers(accessToken, workspaceId);
      setMembers(normalizeList(data));
    } catch (err) {
      setError(err?.message || 'Failed to load workspace members.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId]);

  useEffect(() => {
    if (!isAdmin) {
      setMembers(normalizeList(workspace?.members));
      return;
    }
    loadMembers();
  }, [workspace?.members, isAdmin, loadMembers]);

  function isCurrentUser(member) {
    return member.user === user?.username;
  }

  function isOwner(member) {
    return member.user === workspace.owner;
  }

function handleRemove(member) {
  if (!isAdmin) {
    return
  }

  setError('')
  setRemoveMember(member)
}

async function confirmRemoveMember() {
  if (!removeMember || !isAdmin) {
    return
  }

  try {
    setActionUserId(removeMember.user_id)
    setError('')

    await removeWorkspaceMember(
      accessToken,
      workspace.id,
      removeMember.user_id,
    )

    setRemoveMember(null)

    await loadMembers()
  } catch (err) {
    throw err
  } finally {
    setActionUserId(null)
  }
}

  return (
    <>
      <section className="workspace-members">
      <div className="workspace-section-heading">
        <div>
          <h2>Community Members</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            People with access to study files and collaborative notes.
          </p>
        </div>

        <div className="workspace-members-heading-actions">
          <span className="workspace-member-count-badge">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>

          <MemberManagement
            members={members}
            workspace={workspace}
            accessToken={accessToken}
            isAdmin={isAdmin}
            onMembersChanged={loadMembers}
            onInvite={onInvite}
          />
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: '8px',
          color: '#fb7185',
          fontSize: '13.5px',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span className="spinner" />
          <p>Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <UsersIcon size={36} />
          <p>No members found.</p>
        </div>
      ) : (
        <div className="workspace-member-list">
          {members.map((member) => {
            const memberOwner = isOwner(member);
            const memberAdmin = member.role === 'admin';
            const currentUser = isCurrentUser(member);
            const busy = actionUserId === member.user_id;

            return (
              <div className="workspace-member" key={member.user_id}>
                <div className="member-profile-left">
                  <div className="workspace-member-avatar">
                    {(member.user || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="workspace-member-details">
                    <span className="workspace-member-name">
                      @{member.user}
                      {currentUser && (
                        <span className="workspace-member-you-pill">You</span>
                      )}
                    </span>
                    <span className="workspace-member-role-subtitle">
                      {memberOwner
                        ? 'Workspace Creator'
                        : memberAdmin
                        ? 'Administrator'
                        : 'Standard Member'}
                    </span>
                  </div>
                </div>

                <div className="workspace-member-actions">
                  <span
                    className={`workspace-role-badge ${
                      memberOwner
                        ? 'role-owner'
                        : memberAdmin
                        ? 'role-admin'
                        : 'role-member'
                    }`}
                  >
                    {memberOwner ? 'Owner' : memberAdmin ? 'Admin' : 'Member'}
                  </span>

                  {isAdmin && !memberOwner && !currentUser && (
                    <button
                      type="button"
                      className="workspace-btn-action workspace-btn-danger"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                      onClick={() => handleRemove(member)}
                      disabled={busy}
                    >
                      {busy ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </section>

      {removeMember && (
        <RemoveMemberModal
          member={removeMember}
          onClose={() => setRemoveMember(null)}
          onConfirm={confirmRemoveMember}
          busy={actionUserId === removeMember.user_id}
        />
      )}
    </>
  )
}

export default WorkspaceMembers;