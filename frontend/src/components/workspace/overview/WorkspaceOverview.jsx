import { formatRelativeTime } from '../../../utils/dateUtils';
import { GlobeIcon, LockIcon, UsersIcon, ActivityIcon, ShieldIcon } from '../../common/Icons';
import '../../../styles/components/workspace/overview/overview.css';

function WorkspaceOverview({ workspace }) {
  if (!workspace) return null;

  const isPublic = workspace.visibility === 'public';
  const memberCount = workspace.members?.length ?? 0;

  return (
    <section className="workspace-overview">
      <div className="workspace-section-heading">
        <div>
          <h2>Workspace Information</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            General details, accessibility settings, and membership summary.
          </p>
        </div>
      </div>

      <div className="workspace-detail-description">
        <p style={{ margin: 0, fontWeight: 500 }}>
          {workspace.description || 'No description provided for this workspace.'}
        </p>
      </div>

      <div className="workspace-info-grid">
        <div className="workspace-info-item">
          <span>Visibility</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            {isPublic ? <GlobeIcon size={16} /> : <LockIcon size={16} />}
            <strong>{isPublic ? 'Public' : 'Private'}</strong>
          </div>
        </div>

        <div className="workspace-info-item">
          <span>Members</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <UsersIcon size={16} />
            <strong>{memberCount} {memberCount === 1 ? 'member' : 'members'}</strong>
          </div>
        </div>

        <div className="workspace-info-item">
          <span>Owner</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <ShieldIcon size={16} />
            <strong>@{workspace.owner}</strong>
          </div>
        </div>

        <div className="workspace-info-item">
          <span>Last Activity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <ActivityIcon size={16} />
            <strong>{formatRelativeTime(workspace.updated || workspace.created)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceOverview;