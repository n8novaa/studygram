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
  onToggleSidebar,
  showChannelDescription,
  onToggleChannelDescription,
  channelNameButtonRef,
}) {
  return (
    <header className="channel-chat-header">
      <div className="channel-header-left">
        {(onToggleSidebar || onOpenMobileSidebar) && (
          <button
            type="button"
            className="chat-header-btn mobile-channels-btn"
            onClick={onToggleSidebar || onOpenMobileSidebar}
            title="Toggle channels sidebar"
            aria-label="Toggle channels sidebar"
          >
            <MenuIcon size={16} />
          </button>
        )}

        <button
          ref={channelNameButtonRef}
          type="button"
          className="channel-header-title-box"
          onClick={onToggleChannelDescription}
          aria-expanded={showChannelDescription}
          aria-label={`Toggle description for ${channel.name}`}
        >
          <HashIcon size={18} />
          <span>{channel.name}</span>
        </button>
      </div>

      <div className="channel-header-actions">
        

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
