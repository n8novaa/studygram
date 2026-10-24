import { useMemo } from 'react';
import { ShieldIcon, UsersIcon } from '../../../common/Icons';
import UserAvatar from '../../../common/UserAvatar';
import { getAvatarColor } from '../chat/messageUtils';

function MemberAvatar({ member, initial, color, online, currentUser }) {
  const isCurrentUser = member.username === currentUser?.username;
  const displayName = isCurrentUser
    ? currentUser?.profile?.display_name || member.display_name || member.username
    : member.display_name || member.username;

  return (
    <div className="member-avatar-wrap" title={online ? `${member.username} is online` : member.username}>
      <UserAvatar
        src={isCurrentUser ? [currentUser?.profile?.avatar] : [member.avatar, member.user?.profile?.avatar]}
        displayName={displayName || initial}
        username={member.username}
        className="member-avatar"
        fallbackColor={color}
        online={online}
      />
    </div>
  );
}

function ChannelMemberList({
  members = [],
  currentUser,
  onlineUserIds = new Set(),
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
        <span className="channel-members-online-count">
          <span className="channel-members-online-dot" />
          {onlineUserIds.size} online
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
            const online = onlineUserIds.has(member.user_id);

            return (
              <div
                key={member.user_id || `admin-${idx}`}
                className="member-row-item"
              >
                <MemberAvatar member={member} initial={initial} color={color} online={online} currentUser={currentUser} />

                <div className="member-info">
                  <span className="member-name">
                    {member.display_name || member.username}
                  </span>
                  {member.display_name && <span className="member-handle">@{member.username}</span>}

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
            const online = onlineUserIds.has(member.user_id);

            return (
              <div
                key={member.user_id || `member-${idx}`}
                className="member-row-item"
              >
                <MemberAvatar member={member} initial={initial} color={color} online={online} currentUser={currentUser} />

                <div className="member-info">
                  <span className="member-name">
                    {member.display_name || member.username}
                  </span>
                  {member.display_name && <span className="member-handle">@{member.username}</span>}
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
