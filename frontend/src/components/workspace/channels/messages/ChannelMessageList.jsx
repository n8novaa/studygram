import { formatDateHeader } from '../chat/messageUtils';
import ChannelMessageItem from './ChannelMessageItem';

function ChannelMessageList({
  workspace,
  messages,
  processedMessages,
  loadingMessages,
  currentUser,
  isAdmin,
  editingMsgId,
  editingText,
  setEditingText,
  setEditingMsgId,
  setMoreMenuMessageId,
  copiedMsgId,
  moreMenuMessageId,
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
  messagesEndRef,
}) {
  return (
    <>
      {loadingMessages && messages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '30px',
            color: 'var(--text-muted)',
          }}
        >
          <span className="spinner" />
        </div>
      ) : null}

      {processedMessages.map((message) => (
        <div key={message.renderKey}>
          {message.showDateDivider && (
            <div className="chat-date-divider">
              <span className="chat-date-label">
                {formatDateHeader(message.created)}
              </span>
            </div>
          )}

          <ChannelMessageItem
            message={message}
            allMessages={messages}
            workspace={workspace}
            currentUser={currentUser}
            isAdmin={isAdmin}
            editingMsgId={editingMsgId}
            editingText={editingText}
            setEditingText={setEditingText}
            setEditingMsgId={setEditingMsgId}
            copiedMsgId={copiedMsgId}
            moreMenuMessageId={moreMenuMessageId}
            setMoreMenuMessageId={setMoreMenuMessageId}
            reactionPickerMessageId={reactionPickerMessageId}
            setReactionPickerMessageId={setReactionPickerMessageId}
            reactingMessageId={reactingMessageId}
            highlightedMessageId={highlightedMessageId}
            setHighlightedMessageId={setHighlightedMessageId}
            onEditMessage={onEditMessage}
            onCopyMessage={onCopyMessage}
            onDeleteMessage={onDeleteMessage}
            onReaction={onReaction}
            onReply={onReply}
          />
        </div>
      ))}

      <div ref={messagesEndRef} />
    </>
  );
}

export default ChannelMessageList;
