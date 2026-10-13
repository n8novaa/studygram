import { useEffect, useState } from 'react';
import { CloseIcon } from '../../../common/Icons';

function DeleteMessageModal({
  message,
  onClose,
  onConfirm,
  busy,
}) {
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, onClose]);

  async function handleConfirm() {
    setError('');

    try {
      await onConfirm();
    } catch (err) {
      setError(err?.message || 'Failed to delete message.');
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
        aria-labelledby="delete-message-title"
      >
        <div className="workspace-member-modal-header">
          <div>
            <h2 id="delete-message-title">
              Delete Message
            </h2>
          </div>

          <button
            type="button"
            className="workspace-member-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="workspace-member-modal-description">
          Are you sure you want to delete this message
          {message?.body ? `: “${message.body}”` : ''}?
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
            {busy ? 'Deleting...' : 'Delete Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteMessageModal;
