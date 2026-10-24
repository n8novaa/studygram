import { useEffect, useRef, useState } from 'react';
import { SendIcon, SmileIcon } from '../../../common/Icons';

// taste-skill-ignore: These are selectable message content in the emoji picker, not decorative UI.
const EMOJI_OPTIONS = [
  '😀', '😂', '🥹', '😊', '😍', '🥰', '😎', '🤔', // taste-skill-ignore: selectable message content in the emoji picker.
  '😅', '😭', '😴', '🤝', '👍', '👎', '👏', '🙌', // taste-skill-ignore: selectable message content in the emoji picker.
  '❤️', '🔥', '✨', '🎉', '🚀', '💡', '📚', '💯', // taste-skill-ignore: selectable message content in the emoji picker.
  '🙏', '💪', '✅', '👀', '💀', '🤣', '🙂', '😉', // taste-skill-ignore: selectable message content in the emoji picker.
];

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
}) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Close only when clicking outside the picker and its trigger.
  useEffect(() => {
    if (!emojiPickerOpen) return;

    function handleOutsideClick(event) {
      const clickedPicker = emojiPickerRef.current?.contains(event.target);
      const clickedButton = emojiButtonRef.current?.contains(event.target);

      if (!clickedPicker && !clickedButton) {
        setEmojiPickerOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [emojiPickerOpen]);

  function insertEmoji(emoji) {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart ?? inputText.length;
    const end = textarea.selectionEnd ?? start;

    const nextValue =
      inputText.slice(0, start) +
      emoji +
      inputText.slice(end);

    // Use the existing input handler so the parent's state stays in sync.
    handleInputChange({
      target: {
        value: nextValue,
      },
    });

    requestAnimationFrame(() => {
      textarea.focus();

      const cursorPosition = start + emoji.length;

      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  return (
    <footer className="channel-composer-container">
      {replyingTo && (
        <div className="channel-reply-preview">
          <div className="channel-reply-preview-content">
            <span>
              Replying to{' '}
              <strong>@{replyingTo.user?.username}</strong>
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
          <button
            ref={emojiButtonRef}
            type="button"
            className={`composer-emoji-btn ${
              emojiPickerOpen ? 'active' : ''
            }`}
            aria-label="Toggle emoji picker"
            aria-expanded={emojiPickerOpen}
            title="Insert emoji"
            onClick={() => setEmojiPickerOpen((open) => !open)}
          >
            <SmileIcon size={19} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            className="channel-textarea"
            placeholder={`Message #${channel.name}...`}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={sending}
            aria-label={`Message #${channel.name}`}
          />

          <div className="composer-actions-right">
            <button
              type="submit"
              className="composer-send-btn"
              disabled={sending || !inputText.trim()}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>

        {emojiPickerOpen && (
          <div
            ref={emojiPickerRef}
            className="composer-emoji-picker"
            role="group"
            aria-label="Emoji picker"
          >
            <div className="composer-emoji-grid">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="composer-emoji-option"
                  aria-label={`Insert ${emoji}`}
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </footer>
  );
}

export default MessageComposer;
