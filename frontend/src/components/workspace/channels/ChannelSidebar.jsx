import { HashIcon, PlusIcon, SettingsIcon, CloseIcon } from '../../common/Icons';

function ChannelSidebar({
  channels = [],
  activeChannel,
  onSelectChannel,
  isAdmin,
  onCreateChannel,
  onEditChannel,
  currentUser,
  currentMemberRole,
  isOwner,
  loading = false,
  mobileOpen = false,
  onCloseMobile,
}) {
  const userInitial = (currentUser?.username || 'U').charAt(0).toUpperCase();

  return (
    <aside
      className={`channel-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Workspace Channels"
    >
      {/* Category Header */}
      <div className="channel-sidebar-header">
        <div className="channel-sidebar-title-row">
          <span className="channel-category-label">Text Channels</span>
          <span className="channel-count-badge">{channels.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isAdmin && (
            <button
              type="button"
              className="channel-add-btn"
              onClick={onCreateChannel}
              title="Create Channel"
              aria-label="Create Channel"
            >
              <PlusIcon size={16} />
            </button>
          )}

          {mobileOpen && onCloseMobile && (
            <button
              type="button"
              className="channel-add-btn"
              onClick={onCloseMobile}
              title="Close channels list"
              aria-label="Close channels list"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Channels List */}
      <div className="channel-list-scroll">
        {loading && channels.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" />
          </div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            No channels yet.
            {isAdmin && ' Click + above to create one!'}
          </div>
        ) : (
          channels.map((channel) => {
            const isActive = activeChannel?.id === channel.id;

            return (
              <div
                key={channel.id}
                className={`channel-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectChannel(channel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectChannel(channel);
                  }
                }}
              >
                <div className="channel-nav-main">
                  <HashIcon size={16} className="channel-nav-hash" />
                  <span className="channel-nav-name">{channel.name}</span>
                </div>

                {isAdmin && (
                  <div className="channel-item-actions">
                    <button
                      type="button"
                      className="channel-action-mini-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditChannel(channel);
                      }}
                      title="Edit channel"
                      aria-label={`Edit channel #${channel.name}`}
                    >
                      <SettingsIcon size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: User profile */}
      <div className="channel-sidebar-footer">
        <div className="channel-user-profile">
          <div className="channel-user-avatar">{userInitial}</div>
          <div className="channel-user-info">
            <span className="channel-user-name">@{currentUser?.username}</span>
            <span className="channel-user-role-badge">
              {isOwner ? 'Workspace Owner' : currentMemberRole || 'Member'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default ChannelSidebar;
