import { CheckIcon, CopyIcon, EditIcon, ReplyIcon, TrashIcon } from '../../../common/Icons';

function ChannelMessageActions({
  message,
  isSelf,
  canDelete,
  copiedMsgId,
  moreMenuMessageId,
  setMoreMenuMessageId,
  setReactionPickerMessageId,
  onReply,
  onCopyMessage,
  onStartEdit,
  onDeleteMessage,
}) {
  return (
    <div className="message-action-buttons">
      <button
        type="button"
        className="discord-action-btn"
        onClick={() => onReply(message)}
        title="Reply"
        aria-label="Reply"
      >
        <ReplyIcon size={13} />
      </button>

      <button
        type="button"
        className={`discord-action-btn more-actions-trigger ${
          moreMenuMessageId === message.id ? 'active' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();

          // Close the emoji picker first.
          setReactionPickerMessageId(null);

          // Toggle the More Actions menu.
          setMoreMenuMessageId(
            moreMenuMessageId === message.id ? null : message.id
          );
        }}
        title="More actions"
        aria-label="More actions"
        aria-expanded={moreMenuMessageId === message.id}
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {moreMenuMessageId === message.id && (
        <div className="message-more-menu">
          <button
            type="button"
            className="message-more-menu-item"
            onClick={() => {
              onCopyMessage(message);
              setMoreMenuMessageId(null);
            }}
            title="Copy message"
            aria-label="Copy message"
          >
            {copiedMsgId === message.id ? (
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
                onStartEdit(message);
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
                onDeleteMessage(message);
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
  );
}

export default ChannelMessageActions;
