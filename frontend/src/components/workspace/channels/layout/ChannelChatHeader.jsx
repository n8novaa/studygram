import {
  HashIcon,
  RefreshIcon,
  SettingsIcon,
  UsersIcon,
  MenuIcon,
} from '../../../common/Icons';

function ChannelChatHeader({
  channel,
  isAdmin,
  showMembers,
  onRefresh,
  onEditChannel,
  onToggleMembers,
  onOpenMobileSidebar,
}) {
  return (
    <header className="channel-chat-header">
      <div className="channel-header-left">
        {onOpenMobileSidebar && (
          <button
            type="button"
            className="chat-header-btn mobile-channels-btn"
            onClick={onOpenMobileSidebar}
            title="View channels"
            aria-label="View channels"
          >
            <MenuIcon size={16} />
          </button>
        )}

        <div className="channel-header-title-box">
          <HashIcon size={18} />
          <span>{channel.name}</span>
        </div>

        {channel.description && (
          <>
            <div className="channel-header-divider" />
            <span className="channel-header-topic" title={channel.description}>
              {channel.description}
            </span>
          </>
        )}
      </div>

      <div className="channel-header-actions">
        <button
          type="button"
          className="chat-header-btn"
          onClick={onRefresh}
          title="Refresh messages"
          aria-label="Refresh messages"
        >
          <RefreshIcon size={14} />
        </button>

        {isAdmin && (
          <button
            type="button"
            className="chat-header-btn"
            onClick={() => onEditChannel(channel)}
            title="Channel Settings"
            aria-label="Channel Settings"
          >
            <SettingsIcon size={14} />
          </button>
        )}

        <button
          type="button"
          className={`chat-header-btn ${showMembers ? 'active' : ''}`}
          onClick={onToggleMembers}
          title={showMembers ? 'Hide member list' : 'Show member list'}
          aria-label="Toggle member list"
        >
          <UsersIcon size={15} />
          <span style={{ fontSize: '11px' }}>Members</span>
        </button>
      </div>
    </header>
  );
}

export default ChannelChatHeader;
