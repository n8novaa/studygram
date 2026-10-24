import { formatRelativeTime } from '../../../utils/dateUtils';
import '../../../styles/components/workspace/overview/overview.css';

function WorkspaceOverview({ workspace }) {
  if (!workspace) return null;

  const isPublic = workspace.visibility === 'public';
  const memberCount = workspace.members?.length ?? 0;

  return (
    <section className="workspace-overview">
      <div className="workspace-section-heading">
        <div>
          <h2>Workspace details</h2>
          <p>Access, membership, and recent activity.</p>
        </div>
      </div>

      <div className="workspace-detail-description">
        <p>{workspace.description || 'No description provided for this workspace.'}</p>
      </div>

      <dl className="workspace-info-grid">
        <div className="workspace-info-item">
          <dt>Visibility</dt>
          <dd>{isPublic ? 'Public' : 'Private'}</dd>
        </div>
        <div className="workspace-info-item">
          <dt>Members</dt>
          <dd>{memberCount} {memberCount === 1 ? 'member' : 'members'}</dd>
        </div>
        <div className="workspace-info-item">
          <dt>Owner</dt>
          <dd>@{workspace.owner}</dd>
        </div>
        <div className="workspace-info-item">
          <dt>Last active</dt>
          <dd>{formatRelativeTime(workspace.updated || workspace.created)}</dd>
        </div>
      </dl>
    </section>
  );
}

export default WorkspaceOverview;
