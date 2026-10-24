import { formatDateHeader } from '../chat/messageUtils';
import ChannelMessageItem from './ChannelMessageItem';
import React, { useEffect } from 'react';

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
  messageScrollRootRef,
  onMessageViewed,
}) {
  useEffect(() => {
    if (!onMessageViewed || !messageScrollRootRef?.current || typeof IntersectionObserver === 'undefined') return undefined;
    let highestVisible = 0;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        const id = Number(entry.target.id.replace('message-', ''));
        if (Number.isSafeInteger(id)) highestVisible = Math.max(highestVisible, id);
      });
      if (highestVisible) onMessageViewed(highestVisible);
    }, { root: messageScrollRootRef.current, threshold: [0.35] });
    const rows = messageScrollRootRef.current.querySelectorAll('.discord-message-row[id^="message-"]');
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [messages, messageScrollRootRef, onMessageViewed]);

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
        <React.Fragment key={message.renderKey}>
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
        </React.Fragment>
      ))}

      <div ref={messagesEndRef} />
    </>
  );
}

export default ChannelMessageList;
