import { useEffect, useRef, useState, useMemo } from 'react';
import {
  HashIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  UsersIcon,
  MenuIcon,
} from '../../common/Icons';
import { useToast } from '../../common/ToastContext';
import {
  sendChannelMessage,
  deleteChannelMessage,
} from '../../../services/workspaceChannelService';

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

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function formatDateHeader(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function ChannelChatArea({
  workspace,
  channel,
  messages = [],
  loadingMessages,
  onRefresh,
  accessToken,
  currentUser,
  isAdmin,
  onEditChannel,
  showMembers,
  onToggleMembers,
  onOpenMobileSidebar,
  onMessageSent,
  onMessageDeleted,
}) {
  const { addToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (channel?.id) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channel?.id]);

  // Adjust textarea height dynamically
  function handleInputChange(e) {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }

  async function handleSend(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !channel || sending) return;

    try {
      setSending(true);
      const newMsg = await sendChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        text
      );
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onMessageSent(newMsg);
      
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err) {
      addToast(err?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      await deleteChannelMessage(accessToken, workspace.id, channel.id, messageId);
      addToast('Message deleted.', 'info');
      onMessageDeleted(messageId);
    } catch (err) {
      addToast(err?.message || 'Failed to delete message.', 'error');
    }
  }

  function handleCopyMessage(msg) {
    navigator.clipboard.writeText(msg.body);
    setCopiedMsgId(msg.id);
    addToast('Message copied to clipboard.', 'success');
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  }

  function handleQuickEmoji(emoji) {
    setInputText((prev) => prev + emoji);
    textareaRef.current?.focus();
  }

  // Pre-process messages cleanly in useMemo for Discord grouping & date dividers
  const processedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const msgUser = msg.user?.username || 'user';
      const msgDate = new Date(msg.created);
      const dateKey = msgDate.toDateString();

      const prevMsg = index > 0 ? messages[index - 1] : null;
      const prevDateKey = prevMsg ? new Date(prevMsg.created).toDateString() : null;
      const prevUser = prevMsg ? (prevMsg.user?.username || 'user') : null;
      const prevTime = prevMsg ? new Date(prevMsg.created).getTime() : 0;

      const showDateDivider = index === 0 || dateKey !== prevDateKey;
      const isSameAuthor = index > 0 && prevUser === msgUser;
      const timeDiff = index > 0 ? msgDate.getTime() - prevTime : Infinity;
      const isGrouped = !showDateDivider && isSameAuthor && timeDiff < 5 * 60 * 1000;

      return {
        ...msg,
        renderKey: msg.id || `msg-${index}`,
        msgUser,
        msgDate,
        showDateDivider,
        isGrouped,
      };
    });
  }, [messages]);

  if (!channel) {
    return (
      <section className="channel-chat-pane">
        <div className="channel-empty-state">
          <HashIcon size={36} />
          <h4>No Channel Selected</h4>
          <p>Choose a channel from the left sidebar to start chatting.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="channel-chat-pane" aria-label={`Chat for #${channel.name}`}>
      {/* Channel Header */}
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

      {/* Messages Stream */}
      <div className="channel-messages-stream">
        {/* Welcome hero at top */}
        <div className="channel-welcome-hero">
          <div className="welcome-hash-circle">
            <HashIcon size={28} />
          </div>
          <h3>Welcome to #{channel.name}!</h3>
          <p>
            This is the start of the <strong>#{channel.name}</strong> channel.{' '}
            {channel.description
              ? `Topic: ${channel.description}`
              : 'Collaborate and study together with your workspace members.'}
          </p>
        </div>

        {/* Loading Spinner */}
        {loadingMessages && messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            <span className="spinner" />
          </div>
        ) : null}

        {/* Render Messages */}
        {processedMessages.map((msg) => {
          const { msgUser, msgDate, showDateDivider, isGrouped, renderKey } = msg;
          const isSelf = msgUser === currentUser?.username;
          const initial = msgUser.charAt(0).toUpperCase();
          const avatarColor = getAvatarColor(msgUser);

          // Check if msgUser is Owner or Admin in this workspace
          const isOwner = msgUser === workspace?.owner;
          const memberInfo = workspace?.members?.find(
            (m) => (typeof m.user === 'string' ? m.user : m.user?.username) === msgUser
          );
          const isMsgAdmin = isOwner || memberInfo?.role === 'admin';

          return (
            <div key={renderKey}>
              {showDateDivider && (
                <div className="chat-date-divider">
                  <span className="chat-date-label">
                    {formatDateHeader(msg.created)}
                  </span>
                </div>
              )}

              <div
                className={`discord-message-row ${isGrouped ? 'is-grouped' : ''}`}
              >
                {/* Avatar or Grouped Gutter */}
                <div className="discord-message-gutter">
                  {isGrouped ? (
                    <span className="discord-grouped-time">
                      {msgDate.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <div
                      className="discord-message-avatar"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initial}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="discord-message-body-wrap">
                  {!isGrouped && (
                    <div className="discord-message-header">
                      <span className="discord-message-author">@{msgUser}</span>

                      {isOwner && (
                        <span className="discord-role-pill owner">Owner</span>
                      )}
                      {!isOwner && isMsgAdmin && (
                        <span className="discord-role-pill admin">Admin</span>
                      )}

                      <span className="discord-message-timestamp">
                        {formatMessageTime(msg.created)}
                      </span>
                    </div>
                  )}

                  <div className="discord-message-text">{msg.body}</div>
                </div>

                {/* Floating Action Bar */}
                <div className="discord-hover-actions">
                  <button
                    type="button"
                    className="discord-action-btn"
                    onClick={() => handleCopyMessage(msg)}
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    {copiedMsgId === msg.id ? (
                      <span style={{ color: '#16a34a', display: 'flex' }}>
                        <CheckIcon size={13} />
                      </span>
                    ) : (
                      <CopyIcon size={13} />
                    )}
                  </button>

                  {isSelf && (
                    <button
                      type="button"
                      className="discord-action-btn delete-btn"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete message"
                      aria-label="Delete message"
                    >
                      <TrashIcon size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <footer className="channel-composer-container">
        <form className="channel-composer-box" onSubmit={handleSend}>
          <div className="channel-composer-input-row">
            <textarea
              ref={textareaRef}
              rows={1}
              className="channel-textarea"
              placeholder={`Message #${channel.name}...`}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />

            <div className="composer-actions-right">
              <button
                type="submit"
                className="composer-send-btn"
                disabled={sending || !inputText.trim()}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <SendIcon size={14} />
              </button>
            </div>
          </div>

          {/* Quick Reaction Bar */}
          <div className="composer-quick-bar">
            {['👍', '❤️', '🔥', '🚀', '💡', '📚', '👏'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="quick-emoji-chip"
                onClick={() => handleQuickEmoji(emoji)}
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <span className="composer-hint-text">
              Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
            </span>
          </div>
        </form>
      </footer>
    </section>
  );
}

export default ChannelChatArea;
