import { useState, useEffect } from 'react';
import {
  updateWorkspaceChannel,
  deleteWorkspaceChannel,
} from '../../../services/workspaceChannelService';
import { HashIcon, CloseIcon, TrashIcon } from '../../common/Icons';
import { useToast } from '../../common/ToastContext';
import ConfirmModal from '../../common/ConfirmModal';

function slugifyChannelName(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');
}

function EditChannelModal({
  workspaceId,
  channel,
  accessToken,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const { addToast } = useToast();
  const [name, setName] = useState(channel.name || '');
  const [description, setDescription] = useState(channel.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting && !deleting) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [submitting, deleting, onClose]);

  const slugifiedName = slugifyChannelName(name);

  async function handleUpdate(e) {
    e.preventDefault();

    if (!slugifiedName) {
      setError('Channel name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const updated = await updateWorkspaceChannel(
        accessToken,
        workspaceId,
        channel.id,
        {
          name: slugifiedName,
          description: description.trim(),
        }
      );

      addToast(`Channel #${updated.name} updated!`, 'success');
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update channel.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError('');

      await deleteWorkspaceChannel(accessToken, workspaceId, channel.id);
      addToast(`Channel #${channel.name} deleted.`, 'info');
      onDeleted(channel.id);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to delete channel.');
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="channel-modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
      <div className="channel-modal-dialog">
        <div className="channel-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HashIcon size={18} />
            <h3>Channel Settings</h3>
          </div>
          <button
            type="button"
            className="channel-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleUpdate}>
          <div className="channel-modal-body">
            {error && <div className="channel-modal-error">{error}</div>}

            <div className="channel-field-group">
              <label className="channel-field-label" htmlFor="edit-channel-name">
                CHANNEL NAME
              </label>
              <div className="channel-name-input-wrapper">
                <span className="channel-name-input-prefix">#</span>
                <input
                  id="edit-channel-name"
                  type="text"
                  className="channel-name-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={80}
                  disabled={submitting || deleting}
                />
              </div>
              <span className="channel-input-hint">
                Will be formatted as: <strong>#{slugifiedName || channel.name}</strong>
              </span>
            </div>

            <div className="channel-field-group">
              <label className="channel-field-label" htmlFor="edit-channel-desc">
                TOPIC / DESCRIPTION
              </label>
              <textarea
                id="edit-channel-desc"
                className="channel-desc-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={250}
                placeholder="What is this channel about?"
                disabled={submitting || deleting}
              />
            </div>
          </div>

          <div
            className="channel-modal-footer"
            style={{ justifyContent: 'space-between' }}
          >
            <button
              type="button"
              className="workspace-btn-action workspace-btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitting || deleting}
            >
              <TrashIcon size={14} />
              <span>Delete Channel</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="workspace-btn-action workspace-btn-secondary"
                onClick={onClose}
                disabled={submitting || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="workspace-btn-action workspace-btn-primary"
                disabled={submitting || deleting || !slugifiedName}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>

      {/* Delete channel confirm modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Channel"
          message={`Are you sure you want to delete #${channel.name}? All messages in this channel will be permanently lost.`}
          confirmText="Delete Channel"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

export default EditChannelModal;
