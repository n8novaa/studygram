import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateUtils';
import { UsersIcon, LockIcon, GlobeIcon, ArrowRightIcon } from '../common/Icons';
import '../../styles/components/workspace/card.css';

function WorkspaceCard({ workspace }) {
  const isPublic = workspace.visibility === 'public';
  const memberCount = workspace.members?.length ?? 0;

  return (
    <article className="workspace-card">
      <div className="workspace-card-top">
        <h2 className="workspace-card-title">{workspace.name}</h2>

        <span
          className={`workspace-visibility-badge ${
            isPublic
              ? 'workspace-visibility-public'
              : 'workspace-visibility-private'
          }`}
        >
          {isPublic ? <GlobeIcon size={13} /> : <LockIcon size={13} />}
          <span>{isPublic ? 'Public' : 'Private'}</span>
        </span>
      </div>

      <div className="workspace-card-body">
        <p className="workspace-card-description">
          {workspace.description || 'No description provided.'}
        </p>
      </div>

      <div className="workspace-card-meta">
        <div className="workspace-member-count">
          <UsersIcon size={15} />
          <span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        <span className="workspace-owner-tag">
          Owner: <strong>{workspace.owner}</strong>
        </span>
      </div>

      <div className="workspace-card-footer">
        <span className="workspace-time">
          Updated {formatRelativeTime(workspace.updated || workspace.created)}
        </span>

        <Link
          className="workspace-open-link"
          to={`/app/workspaces/${workspace.id}`}
        >
          <span>Open workspace</span>
          <ArrowRightIcon size={13} />
        </Link>
      </div>
    </article>
  );
}

export default WorkspaceCard;
