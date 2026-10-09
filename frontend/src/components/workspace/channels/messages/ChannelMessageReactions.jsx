function ChannelMessageReactions({
  message,
  currentUser,
  reactingMessageId,
  reactionPickerMessageId,
  setReactionPickerMessageId,
  setMoreMenuMessageId,
  onReaction,
  showPicker = true,
}) {
  const groupedReactions = Object.entries(
    (message.reactions || []).reduce((groups, reaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) groups[emoji] = [];
      groups[emoji].push(reaction);
      return groups;
    }, {})
  );

  return (
    <>
      {message.reactions?.length > 0 && (
        <div className="message-reactions">
          {groupedReactions.map(([emoji, reactions]) => {
            const hasReacted = reactions.some(
              (reaction) =>
                reaction.user?.username === currentUser?.username
            );

            return (
              <button
                key={emoji}
                type="button"
                className={`message-reaction-badge ${hasReacted ? 'active' : ''}`}
                onClick={() => onReaction(message, emoji)}
                disabled={reactingMessageId === message.id}
                title=""
              >
                <span className="message-reaction-badge-emoji">{emoji}</span>
                <span className="message-reaction-count">{reactions.length}</span>
                <span className="message-reaction-tooltip">
                  <span className="message-reaction-tooltip-emoji">{emoji}</span>
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

      {showPicker && (
        <div className="message-reaction-picker">
          <button
            type="button"
            className={`message-reaction-trigger ${
              reactionPickerMessageId === message.id ? 'active' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();

              // Close the More Actions menu first.
              setMoreMenuMessageId(null);

              // Toggle the emoji picker.
              setReactionPickerMessageId(
                reactionPickerMessageId === message.id ? null : message.id
              );
            }}
            title="Add reaction"
            aria-label="Add reaction"
            aria-expanded={reactionPickerMessageId === message.id}
          >
            ☺
          </button>
  
          {reactionPickerMessageId === message.id && (
            <div className="message-reaction-options">
              {['👍', '❤️', '😂', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="message-reaction-emoji"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReaction(message, emoji);
                    setReactionPickerMessageId(null);
                  }}
                  disabled={reactingMessageId === message.id}
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ChannelMessageReactions;
