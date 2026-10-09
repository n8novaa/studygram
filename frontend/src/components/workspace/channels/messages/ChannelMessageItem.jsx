import { formatMessageTime, getAvatarColor } from '../chat/messageUtils';
import MessageEditForm from './MessageEditForm';
import ChannelMessageReactions from './ChannelMessageReactions';
import ChannelMessageActions from './ChannelMessageActions';

function ChannelMessageItem({
  message,
  allMessages,
  workspace,
  currentUser,
  isAdmin,
  editingMsgId,
  editingText,
  setEditingText,
  setEditingMsgId,
  copiedMsgId,
  moreMenuMessageId,
  setMoreMenuMessageId,
  reactionPickerMessageId,
  setReactionPickerMessageId,
  reactingMessageId,
  highlightedMessageId,
  setHighlightedMessageId,
  onEditMessage,
  onCopyMessage,
  onDeleteMessage,
  onReaction,
  onReply,
}) {
  const msgUser = message.msgUser || message.user?.username || 'user';
  const msgDate = message.msgDate || new Date(message.created);
  const isGrouped = Boolean(message.isGrouped);
  const isSelf = msgUser === currentUser?.username;
  const canDelete =
    isSelf || isAdmin || workspace?.owner === currentUser?.username;
  const initial = msgUser.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(msgUser);
  const isOwner = msgUser === workspace?.owner;
  const repliedMessage = message.reply_to
    ? allMessages.find((item) => item.id === message.reply_to)
    : null;
  const memberInfo = workspace?.members?.find(
    (member) =>
      (typeof member.user === 'string'
        ? member.user
        : member.user?.username) === msgUser
  );
  const isMsgAdmin = isOwner || memberInfo?.role === 'admin';

  function cancelEdit() {
    setEditingMsgId(null);
    setEditingText('');
  }

  function handleStartEdit(msg) {
    setEditingMsgId(msg.id);
    setEditingText(msg.body);
  }

  function handleReplyPreviewClick() {
    if (!repliedMessage) return;
    const element = document.getElementById(`message-${repliedMessage.id}`);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(repliedMessage.id);
    setTimeout(() => setHighlightedMessageId(null), 1500);
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`discord-message-row ${
        isSelf ? 'own-message' : 'other-message'
      } ${isGrouped ? 'is-grouped' : ''} ${
        highlightedMessageId === message.id ? 'highlighted' : ''
      }`}
    >
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

      <div className="discord-message-body-wrap">
        {!isGrouped && (
          <div className="discord-message-header">
            <span className="discord-message-author">@{msgUser}</span>
            {isOwner && <span className="discord-role-pill owner">Owner</span>}
            {!isOwner && isMsgAdmin && (
              <span className="discord-role-pill admin">Admin</span>
            )}
            <span className="discord-message-timestamp">
              {formatMessageTime(message.created)}
            </span>
          </div>
        )}

        {editingMsgId === message.id ? (
          <MessageEditForm
            editingText={editingText}
            setEditingText={setEditingText}
            onSave={() => onEditMessage(message.id)}
            onCancel={cancelEdit}
          />
        ) : (
          <>
            <div className="discord-message-text">
              {repliedMessage && (
                <div
                  className="discord-replied-message"
                  onClick={handleReplyPreviewClick}
                >
                  <div className="discord-replied-message-author">
                    @{repliedMessage.user?.username}
                  </div>
                  <div className="discord-replied-message-text">
                    {repliedMessage.body}
                  </div>
                </div>
              )}
              {message.body}
              {message.updated &&
                message.created &&
                new Date(message.updated).getTime() >
                  new Date(message.created).getTime() && (
                  <span className="message-edited-label">(edited)</span>
                )}
            </div>

            <ChannelMessageReactions
              message={message}
              currentUser={currentUser}
              reactingMessageId={reactingMessageId}
              reactionPickerMessageId={reactionPickerMessageId}
              setReactionPickerMessageId={setReactionPickerMessageId}
              setMoreMenuMessageId={setMoreMenuMessageId}
              onReaction={onReaction}
              showPicker={false}
            />
          </>
        )}
      

      <div className="discord-hover-actions">
        <ChannelMessageReactions
          message={{ ...message, reactions: [] }}
          currentUser={currentUser}
          reactingMessageId={reactingMessageId}
          reactionPickerMessageId={reactionPickerMessageId}
          setReactionPickerMessageId={setReactionPickerMessageId}
          setMoreMenuMessageId={setMoreMenuMessageId}
          onReaction={onReaction}
        />
        <ChannelMessageActions
          message={message}
          isSelf={isSelf}
          canDelete={canDelete}
          copiedMsgId={copiedMsgId}
          moreMenuMessageId={moreMenuMessageId}
          setMoreMenuMessageId={setMoreMenuMessageId}
          setReactionPickerMessageId={setReactionPickerMessageId}
          onReply={onReply}
          onCopyMessage={onCopyMessage}
          onStartEdit={handleStartEdit}
          onDeleteMessage={onDeleteMessage}
        />
      </div>
    </div>
    </div>
  );
}

export default ChannelMessageItem;
