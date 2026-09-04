import { Link } from 'react-router-dom'

import { formatRelativeTime } from '../../utils/dateUtils'

import "../../styles/components/workspace/card.css";

function WorkspaceCard({
  workspace,
}) {
  const isPublic =
    workspace.visibility === 'public'

  const memberCount =
    workspace.members?.length ?? 0

  const createdTime =
    new Date(workspace.created).getTime()

  const updatedTime =
    new Date(workspace.updated).getTime()

  const wasEdited =
    !Number.isNaN(createdTime) &&
    !Number.isNaN(updatedTime) &&
    updatedTime - createdTime > 1000


  return (
    <article className="workspace-card">

      <div className="workspace-card-top">

        <div className="workspace-card-icon">
          {workspace.name
            ?.charAt(0)
            ?.toUpperCase()}
        </div>


        <span
          className={`workspace-visibility-badge ${
            isPublic
              ? 'workspace-visibility-public'
              : 'workspace-visibility-private'
          }`}
        >

          <span className="workspace-visibility-dot" />

          {isPublic
            ? 'Public'
            : 'Private'}

        </span>

      </div>


      <div className="workspace-card-body">

        <h2 className="workspace-card-title">
          {workspace.name}
        </h2>


        <p className="workspace-description">

          {workspace.description ||
            'No description provided.'}

        </p>

      </div>


      <div className="workspace-card-meta">

        <div className="workspace-member-count">

          <span className="workspace-meta-icon">
            👥
          </span>

          <span>

            {memberCount}{' '}

            {memberCount === 1
              ? 'member'
              : 'members'}

          </span>

        </div>


        <span className="workspace-owner">

          Owner: {workspace.owner}

        </span>

      </div>


      <div className="workspace-card-footer">

        <span className="workspace-time">

          {wasEdited
            ? `Updated ${formatRelativeTime(
                workspace.updated,
              )}`
            : `Created ${formatRelativeTime(
                workspace.created,
              )}`}

        </span>


        <Link
          className="workspace-open-link"
          to={`/app/workspaces/${workspace.id}`}
        >
          Open
          <span>→</span>
        </Link>

      </div>

    </article>
  )
}


export default WorkspaceCard