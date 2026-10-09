function MessageEditForm({
  editingText,
  setEditingText,
  onSave,
  onCancel,
}) {
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onCancel();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
  }

  return (
    <div className="message-edit-container">
      <textarea
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        rows={2}
      />

      <div className="message-edit-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export default MessageEditForm;
