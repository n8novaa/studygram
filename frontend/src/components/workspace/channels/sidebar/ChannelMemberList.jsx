import { useMemo } from 'react';
import { ShieldIcon, UsersIcon } from '../../../common/Icons';

function getAvatarColor(username = '') {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#10b981', // emerald
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#6366f1', // indigo
  ];

  let hash = 0;

  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;

  return colors[index];
}

function ChannelMemberList({
  members = [],
  ownerUsername,
  onClose,
}) {
  const { admins, regulars } = useMemo(() => {
    const adminList = [];
    const regularList = [];

    members.forEach((m) => {
      const username =
        typeof m.user === 'string'
          ? m.user
          : m.user?.username || 'user';

      const isOwner = username === ownerUsername;
      const isAdmin = isOwner || m.role === 'admin';

      const memberObj = {
        ...m,
        username,
        isOwner,
        isAdmin,
      };

      if (isAdmin) {
        adminList.push(memberObj);
      } else {
        regularList.push(memberObj);
      }
    });

    return {
      admins: adminList,
      regulars: regularList,
    };
  }, [members, ownerUsername]);

  return (
    <aside
      className="channel-members-sidebar"
      aria-label="Workspace Members"
    >
      <div className="channel-members-header">
        <UsersIcon size={16} />

        <span>Members</span>

        <span className="channel-members-count">
          {members.length}
        </span>

        <button
          type="button"
          className="channel-members-close"
          onClick={onClose}
          aria-label="Close members panel"
          title="Close members panel"
        >
          ×
        </button>
      </div>

      {/* Admins Group */}
      {admins.length > 0 && (
        <div className="members-group">
          <div className="members-group-heading">
            Admins — {admins.length}
          </div>

          {admins.map((member, idx) => {
            const initial = member.username.charAt(0).toUpperCase();
            const color = getAvatarColor(member.username);

            return (
              <div
                key={member.user_id || `admin-${idx}`}
                className="member-row-item"
              >
                <div className="member-avatar-wrap">
                  <div
                    className="member-avatar"
                    style={{ backgroundColor: color }}
                  >
                    {initial}
                  </div>
                </div>

                <div className="member-info">
                  <span className="member-name">
                    @{member.username}
                  </span>

                  {member.isOwner ? (
                    <span
                      className="discord-role-pill owner"
                      title="Workspace Owner"
                      style={{
                        fontSize: '9px',
                        padding: '0 5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ShieldIcon size={10} />
                      <span>Owner</span>
                    </span>
                  ) : (
                    <span
                      className="discord-role-pill admin"
                      title="Workspace Admin"
                      style={{
                        fontSize: '9px',
                        padding: '0 5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ShieldIcon size={10} />
                      <span>Admin</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Regular Members Group */}
      {regulars.length > 0 && (
        <div className="members-group">
          <div className="members-group-heading">
            Members — {regulars.length}
          </div>

          {regulars.map((member, idx) => {
            const initial = member.username.charAt(0).toUpperCase();
            const color = getAvatarColor(member.username);

            return (
              <div
                key={member.user_id || `member-${idx}`}
                className="member-row-item"
              >
                <div className="member-avatar-wrap">
                  <div
                    className="member-avatar"
                    style={{ backgroundColor: color }}
                  >
                    {initial}
                  </div>
                </div>

                <div className="member-info">
                  <span className="member-name">
                    @{member.username}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {members.length === 0 && (
        <div
          style={{
            padding: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          No members found.
        </div>
      )}
    </aside>
  );
}

export default ChannelMemberList;