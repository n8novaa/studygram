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
  EditIcon,
  ReplyIcon,
} from '../../common/Icons';
import { useToast } from '../../common/ToastContext';
import {
  sendChannelMessage,
  deleteChannelMessage,
  updateChannelMessage,
  addChannelMessageReaction,
  removeChannelMessageReaction,
} from '../../../services/workspaceChannelService';
import DeleteMessageModal from './DeleteMessageModal';

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
  onMessageUpdated,
  onMessageDeleted,
}) {
  const { addToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [deleting, setDeleting] = useState(false); 
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [moreMenuMessageId, setMoreMenuMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
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
    if (!text) {
      addToast('Message cannot be empty.', 'error');
      return;
    }

    if (!channel) return;

    try {
      setSending(true);
      const newMsg = await sendChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        text,
        replyingTo?.id
      );
      setInputText('');
      setReplyingTo(null);
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

  function handleDeleteMessage(message) {
      setDeletingMessage(message);
    }

  async function confirmDeleteMessage() {
    if (!deletingMessage || !channel) return;

    try {
      setDeleting(true);

      await deleteChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        deletingMessage.id
      );

      addToast('Message deleted.', 'info');
      onMessageDeleted(deletingMessage.id);
      setDeletingMessage(null);
    } catch (err) {
      throw err;
    } finally {
      setDeleting(false);
    }
  }

  async function handleEditMessage(messageId) {
    if (!channel) return;

    const text = editingText.trim();

    if (!text) {
      addToast('Message cannot be empty.', 'error');
      return;
    }

    try {
      const updatedMsg = await updateChannelMessage(
        accessToken,
        workspace.id,
        channel.id,
        messageId,
        text
      );

      setEditingMsgId(null);
      setEditingText('');

      onMessageUpdated(updatedMsg);
      addToast('Message edited.', 'success');
    } catch (err) {
      addToast(
        err?.message || 'Failed to edit message.',
        'error'
      );
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

  async function handleReaction(msg, emoji) {
    if (!channel || reactingMessageId === msg.id) return;

    try {
      setReactingMessageId(msg.id);

      const existingReaction = msg.reactions?.find(
        (reaction) =>
          reaction.user?.username === currentUser?.username
      );

      if (existingReaction?.emoji === emoji) {
        await removeChannelMessageReaction(
          accessToken,
          workspace.id,
          channel.id,
          msg.id
        );

        addToast('Reaction removed.', 'info');
      } else {
        await addChannelMessageReaction(
          accessToken,
          workspace.id,
          channel.id,
          msg.id,
          emoji
        );

        addToast('Reaction added.', 'success');
      }

      await onRefresh();
    } catch (err) {
      addToast(
        err?.message || 'Failed to update reaction.',
        'error'
      );
    } finally {
      setReactingMessageId(null);
    }
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
          const canDelete = isSelf || isAdmin || workspace?.owner === currentUser?.username;
          const initial = msgUser.charAt(0).toUpperCase();
          const avatarColor = getAvatarColor(msgUser);

          // Check if msgUser is Owner or Admin in this workspace
          const isOwner = msgUser === workspace?.owner;
          const repliedMessage = msg.reply_to
          ? messages.find((message) => message.id === msg.reply_to)
          : null;
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
                id={`message-${msg.id}`}
                className={`discord-message-row ${
                isSelf ? 'own-message' : 'other-message'
              } ${isGrouped ? 'is-grouped' : ''} ${
                highlightedMessageId === msg.id ? 'highlighted' : ''
              }`}
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
                      <span className="discord-message-author">{msgUser}</span>

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

                  {editingMsgId === msg.id ? (
                    <div className="message-edit-container">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingMsgId(null);
                            setEditingText('');
                            return;
                          }

                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleEditMessage(msg.id);
                          }
                        }}
                        autoFocus
                        rows={2}
                      />

                      <div className="message-edit-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMsgId(null);
                            setEditingText('');
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditMessage(msg.id)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="discord-message-text">
                        {repliedMessage && (
                          <div
                            className="discord-replied-message"
                           onClick={() => {
                              const element = document.getElementById(
                                `message-${repliedMessage.id}`
                              );

                              if (!element) return;

                              element.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                              });

                              setHighlightedMessageId(repliedMessage.id);

                              setTimeout(() => {
                                setHighlightedMessageId(null);
                              }, 1500);
                            }}
                          >
                            <div className="discord-replied-message-author">
                              @{repliedMessage.user?.username}
                            </div>

                            <div className="discord-replied-message-text">
                              {repliedMessage.body}
                            </div>
                          </div>
                        )}
                        {msg.body}
                        {msg.updated &&
                          msg.created &&
                          new Date(msg.updated).getTime() >
                            new Date(msg.created).getTime() && (
                            <span className="message-edited-label">(edited)</span>
                          )}
                      </div>

                      {msg.reactions?.length > 0 && (
                        <div className="message-reactions">
                          {Object.entries(
                            msg.reactions.reduce((groups, reaction) => {
                              const emoji = reaction.emoji;

                              if (!groups[emoji]) {
                                groups[emoji] = [];
                              }

                              groups[emoji].push(reaction);

                              return groups;
                            }, {})
                          ).map(([emoji, reactions]) => {
                            const hasReacted = reactions.some(
                              (reaction) =>
                                reaction.user?.username === currentUser?.username
                            );

                            return (
                              <button
                                key={emoji}
                                type="button"
                                className={`message-reaction-badge ${
                                  hasReacted ? 'active' : ''
                                }`}
                                onClick={() => handleReaction(msg, emoji)}
                                disabled={reactingMessageId === msg.id}
                                title=""
                              >
                                <span className="message-reaction-badge-emoji">
                                  {emoji}
                                </span>

                                <span className="message-reaction-count">
                                  {reactions.length}
                                </span>

                                <span className="message-reaction-tooltip">
                                  <span className="message-reaction-tooltip-emoji">
                                    {emoji}
                                  </span>

                                  <span className="message-reaction-tooltip-users">
                                    {reactions.map((reaction) => (
                                      <span
                                        key={reaction.id}
                                        className="message-reaction-tooltip-user"
                                      >
                                        @{reaction.user?.username}
                                      </span>
                                    ))}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Floating Action Bar */}
                <div className="discord-hover-actions">
                    {/* Reaction picker */}
                    <div className="message-reaction-picker">
                      <button
                        type="button"
                        className={`message-reaction-trigger ${
                          reactionPickerMessageId === msg.id ? 'active' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const isOpen = reactionPickerMessageId === msg.id;
                          setReactionPickerMessageId(isOpen ? null : msg.id);
                          if (!isOpen) setMoreMenuMessageId(null);
                        }}
                        title="Add reaction"
                        aria-label="Add reaction"
                        aria-expanded={reactionPickerMessageId === msg.id}
                      >
                        ☺
                      </button>

                      {reactionPickerMessageId === msg.id && (
                        <div className="message-reaction-options">
                          {['👍', '❤️', '😂', '🔥'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="message-reaction-emoji"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(msg, emoji);
                                setReactionPickerMessageId(null);
                              }}
                              disabled={reactingMessageId === msg.id}
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Direct reply action */}
                    <div className="message-action-buttons">
                      <button
                        type="button"
                        className="discord-action-btn"
                        onClick={() => setReplyingTo(msg)}
                        title="Reply"
                        aria-label="Reply"
                      >
                        <ReplyIcon size={13} />
                      </button>

                      {/* More actions */}
                      <button
                        type="button"
                        className={`discord-action-btn more-actions-trigger ${
                          moreMenuMessageId === msg.id ? 'active' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const isOpen = moreMenuMessageId === msg.id;
                          setMoreMenuMessageId(isOpen ? null : msg.id);
                          if (!isOpen) setReactionPickerMessageId(null);
                        }}
                        title="More actions"
                        aria-label="More actions"
                        aria-expanded={moreMenuMessageId === msg.id}
                      >
                        <span aria-hidden="true">⋮</span>
                      </button>

                      {/* Copy, Edit and Delete are inside More */}
                      {moreMenuMessageId === msg.id && (
                        <div className="message-more-menu">
                          <button
                            type="button"
                            className="message-more-menu-item"
                            onClick={() => {
                              handleCopyMessage(msg);
                              setMoreMenuMessageId(null);
                            }}
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            {copiedMsgId === msg.id ? (
                              <CheckIcon size={14} />
                            ) : (
                              <CopyIcon size={14} />
                            )}
                          </button>

                          {isSelf && (
                            <button
                              type="button"
                              className="message-more-menu-item"
                              onClick={() => {
                                setEditingMsgId(msg.id);
                                setEditingText(msg.body);
                                setMoreMenuMessageId(null);
                              }}
                              title="Edit message"
                              aria-label="Edit message"
                            >
                              <EditIcon size={14} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="message-more-menu-item danger"
                              onClick={() => {
                                handleDeleteMessage(msg);
                                setMoreMenuMessageId(null);
                              }}
                              title="Delete message"
                              aria-label="Delete message"
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <footer className="channel-composer-container">
        {replyingTo && (
            <div className="channel-reply-preview">
              <div className="channel-reply-preview-content">
                <span>
                  Replying to <strong>@{replyingTo.user?.username}</strong>
                </span>

                <span className="channel-reply-preview-text">
                  {replyingTo.body}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
                title="Cancel reply"
              >
                ×
              </button>
            </div>
          )}
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

      {deletingMessage && (
        <DeleteMessageModal
          message={deletingMessage}
          onClose={() => setDeletingMessage(null)}
          onConfirm={confirmDeleteMessage}
          busy={deleting}
        />
      )}
    </section>
  );
}

export default ChannelChatArea;
