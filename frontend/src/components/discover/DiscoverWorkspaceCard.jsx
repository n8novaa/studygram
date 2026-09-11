import { UsersIcon, GlobeIcon, LockIcon, CheckIcon, PlusIcon, ShieldIcon } from '../common/Icons';
import '../../styles/components/discover/workspace-card.css';

function DiscoverWorkspaceCard({ workspace, joined, requested, joining, onJoin }) {
  const isPublic = workspace.visibility === 'public';
  const memberCount = workspace.member_count ?? workspace.members?.length ?? 0;

  return (
    <article className="discover-card">
      <div className="discover-card-top">
        <div className="discover-card-icon">
          {workspace.name?.charAt(0)?.toUpperCase() || 'D'}
        </div>

        <span
          className={`workspace-visibility-badge ${
            isPublic ? 'workspace-visibility-public' : 'workspace-visibility-private'
          }`}
        >
          {isPublic ? <GlobeIcon size={13} /> : <LockIcon size={13} />}
          <span>{isPublic ? 'Public' : 'Private'}</span>
        </span>
      </div>

      <div>
        <h2 className="discover-card-title">{workspace.name}</h2>
        <p className="discover-card-description">
          {workspace.description || 'No description provided.'}
        </p>
      </div>

      <div className="discover-card-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UsersIcon size={15} />
          <span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {workspace.owner && (
          <span style={{ color: 'var(--text-muted)' }}>
            Owner: <strong>@{workspace.owner}</strong>
          </span>
        )}
      </div>

      <button
        type="button"
        className={`discover-join-btn ${
          joined ? 'btn-joined' : requested ? 'btn-requested' : ''
        }`}
        onClick={() => onJoin(workspace)}
        disabled={joined || requested || joining}
      >
        {joining ? (
          <>
            <span className="spinner" /> Joining...
          </>
        ) : joined ? (
          <>
            <CheckIcon size={15} /> Joined Workspace
          </>
        ) : requested ? (
          <>
            <ShieldIcon size={15} /> Request Pending
          </>
        ) : isPublic ? (
          <>
            <PlusIcon size={15} /> Join Workspace
          </>
        ) : (
          <>
            <LockIcon size={15} /> Request to Join
          </>
        )}
      </button>
    </article>
  );
}

export default DiscoverWorkspaceCard;