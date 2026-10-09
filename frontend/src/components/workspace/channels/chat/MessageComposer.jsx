import { SendIcon } from '../../../common/Icons';

function MessageComposer({
  channel,
  replyingTo,
  setReplyingTo,
  inputText,
  sending,
  textareaRef,
  handleSend,
  handleInputChange,
  handleKeyDown,
  handleQuickEmoji,
}) {
  return (
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
  );
}

export default MessageComposer;
