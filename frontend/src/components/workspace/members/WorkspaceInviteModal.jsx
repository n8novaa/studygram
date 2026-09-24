import { useState, useEffect } from 'react';
import { createWorkspaceInvitation } from '../../../services/workspaceService';
import { CopyIcon, CheckIcon, CloseIcon, ShareIcon, SparklesIcon } from '../../common/Icons';
import { useToast } from '../../common/ToastContext';

function WorkspaceInviteModal({ workspace, accessToken, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !generating) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [generating, onClose]);

  async function handleGenerateInvitation() {
    try {
      setGenerating(true);
      setError('');
      const data = await createWorkspaceInvitation(accessToken, workspace.id);
      setInvitationToken(data.token || data.key || data.invitation_token || '');
      addToast('Invitation link generated!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to generate invitation.');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!invitationToken) return;
    const inviteLink = `${window.location.origin}/app/discover?invite=${invitationToken}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    addToast('Invitation link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShareIcon size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 650, color: 'var(--text-primary)' }}>Invite Members</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {workspace.name}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Generate an invitation token to share with your classmates or study partners.
          </p>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '6px',
              color: 'var(--danger-text)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {!invitationToken ? (
            <button
              type="button"
              className="workspace-btn-action workspace-btn-primary"
              onClick={handleGenerateInvitation}
              disabled={generating}
              style={{ width: '100%', height: '38px', justifyContent: 'center' }}
            >
              {generating ? (
                <>
                  <span className="spinner" /> Generating Token...
                </>
              ) : (
                <>
                  <SparklesIcon size={15} /> Generate Invitation Token
                </>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                INVITATION TOKEN / CODE
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '6px 10px',
              }}>
                <code style={{
                  flex: 1,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                }}>
                  {invitationToken}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="workspace-btn-action workspace-btn-secondary"
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Share this token with users so they can join this workspace instantly.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            className="workspace-btn-action workspace-btn-secondary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceInviteModal;
