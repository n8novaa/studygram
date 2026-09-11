import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  GlobeIcon,
  LockIcon,
  EditIcon,
  TrashIcon,
  ShareIcon,
} from '../common/Icons';
import '../../styles/components/workspace/header.css';

function WorkspaceHeader({
  workspace,
  isOwner,
  isAdmin,
  editing,
  saving,
  deleting,
  onEdit,
  onDelete,
  onInvite,
}) {
  const isPublic = workspace.visibility === 'public';
  const memberCount = workspace.members?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Link to="/app/workspaces" className="workspace-back-link">
        <ArrowLeftIcon size={16} /> Back to Workspaces
      </Link>

      <section className="workspace-header-card">
        <div className="workspace-header-content">
          <div>
            <div className="workspace-title-row">
              <h1>{workspace.name}</h1>
              <span
                className={`workspace-visibility-badge ${
                  isPublic
                    ? 'workspace-visibility-public'
                    : 'workspace-visibility-private'
                }`}
              >
                {isPublic ? <GlobeIcon size={13} /> : <LockIcon size={13} />}
                <span>{isPublic ? 'Public Workspace' : 'Private Workspace'}</span>
              </span>
            </div>

            <p className="workspace-owner-info">
              Owned by <strong>@{workspace.owner}</strong> &bull; {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>

          <div className="workspace-header-actions">
            {isAdmin && onInvite && (
              <button
                type="button"
                className="workspace-btn-action workspace-btn-primary"
                onClick={onInvite}
              >
                <ShareIcon size={15} /> Invite Members
              </button>
            )}

            {(isAdmin || isOwner) && !editing && (
              <button
                type="button"
                className="workspace-btn-action workspace-btn-secondary"
                onClick={onEdit}
                disabled={saving || deleting}
              >
                <EditIcon size={15} /> Edit
              </button>
            )}

            {isOwner && !editing && (
              <button
                type="button"
                className="workspace-btn-action workspace-btn-danger"
                onClick={onDelete}
                disabled={saving || deleting}
              >
                <TrashIcon size={15} /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {workspace.description && (
          <p className="workspace-header-desc">{workspace.description}</p>
        )}
      </section>
    </div>
  );
}

export default WorkspaceHeader;