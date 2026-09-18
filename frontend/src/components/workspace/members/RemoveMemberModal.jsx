import { useState } from 'react';

function RemoveMemberModal({
  member,
  onClose,
  onConfirm,
  busy,
}) {
  const [error, setError] = useState('');

  async function handleConfirm() {
    setError('');

    try {
      await onConfirm();
    } catch (err) {
      setError(err?.message || 'Failed to remove member.');
    }
  }

  return (
    <div
      className="workspace-member-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        className="workspace-member-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-member-title"
      >
        <div className="workspace-member-modal-header">
          <div>
            <h2 id="remove-member-title">
              Remove Member
            </h2>
          </div>

          <button
            type="button"
            className="workspace-member-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="workspace-member-modal-description">
          Are you sure you want to remove{' '}
          <strong>@{member.user}</strong> from this workspace?
        </p>

        {error && (
          <p className="workspace-member-modal-error">
            {error}
          </p>
        )}

        <div className="workspace-member-modal-footer">
          <button
            type="button"
            className="workspace-member-modal-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="workspace-member-modal-remove"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Removing...' : 'Remove Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RemoveMemberModal;