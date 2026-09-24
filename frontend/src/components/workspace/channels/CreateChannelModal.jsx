import { useState, useEffect } from 'react';
import { createWorkspaceChannel } from '../../../services/workspaceChannelService';
import { HashIcon, CloseIcon } from '../../common/Icons';
import { useToast } from '../../common/ToastContext';

function slugifyChannelName(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');
}

function CreateChannelModal({ workspaceId, accessToken, onClose, onCreated }) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const slugifiedName = slugifyChannelName(name);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!slugifiedName) {
      setError('Channel name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const newChannel = await createWorkspaceChannel(accessToken, workspaceId, {
        name: slugifiedName,
        description: description.trim(),
      });

      addToast(`Channel #${newChannel.name} created!`, 'success');
      onCreated(newChannel);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create channel.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="channel-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="channel-modal-dialog">
        <div className="channel-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HashIcon size={18} />
            <h3>Create Channel</h3>
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

        <form onSubmit={handleSubmit}>
          <div className="channel-modal-body">
            {error && <div className="channel-modal-error">{error}</div>}

            <div className="channel-field-group">
              <label className="channel-field-label" htmlFor="channel-name-input">
                CHANNEL NAME
              </label>
              <div className="channel-name-input-wrapper">
                <span className="channel-name-input-prefix">#</span>
                <input
                  id="channel-name-input"
                  type="text"
                  className="channel-name-input"
                  placeholder="new-channel"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  maxLength={80}
                  disabled={submitting}
                />
              </div>
              <span className="channel-input-hint">
                Will be formatted as: <strong>#{slugifiedName || 'new-channel'}</strong>
              </span>
            </div>

            <div className="channel-field-group">
              <label className="channel-field-label" htmlFor="channel-desc-input">
                TOPIC / DESCRIPTION <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(OPTIONAL)</span>
              </label>
              <textarea
                id="channel-desc-input"
                className="channel-desc-textarea"
                placeholder="What is this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={250}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="channel-modal-footer">
            <button
              type="button"
              className="workspace-btn-action workspace-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workspace-btn-action workspace-btn-primary"
              disabled={submitting || !slugifiedName}
            >
              {submitting ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
