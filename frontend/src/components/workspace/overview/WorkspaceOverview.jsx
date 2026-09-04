import { formatRelativeTime } from '../../../utils/dateUtils'

import "../../../styles/shared/workspace.css";
import "../../../styles/components/workspace/overview/overview.css";

function WorkspaceOverview({
  workspace,
}) {
  if (!workspace) {
    return null
  }


  const createdAt =
    new Date(workspace.created).getTime()

  const updatedAt =
    new Date(workspace.updated).getTime()

  const wasEdited =
    !Number.isNaN(createdAt) &&
    !Number.isNaN(updatedAt) &&
    updatedAt - createdAt > 1000


  return (
    <section className="workspace-detail-card workspace-overview">

      <div className="workspace-section-heading">

        <div>

          <span className="workspace-eyebrow">
            Overview
          </span>

          <h2>
            Workspace information
          </h2>

        </div>

      </div>


      <p className="workspace-detail-description">

        {workspace.description ||
          'No description provided.'}

      </p>


      <div className="workspace-info-grid">

        <div className="workspace-info-item">

          <span>
            Visibility
          </span>

          <strong>
            {workspace.visibility === 'public'
              ? 'Public'
              : 'Private'}
          </strong>

        </div>


        <div className="workspace-info-item">

          <span>
            Members
          </span>

          <strong>
            {workspace.members?.length ?? 0}
          </strong>

        </div>


        <div className="workspace-info-item">

          <span>
            Created
          </span>

          <strong>
            {formatRelativeTime(
              workspace.created,
            )}
          </strong>

        </div>


        <div className="workspace-info-item">

          <span>
            Activity
          </span>

          <strong>

            {wasEdited
              ? `Updated ${formatRelativeTime(
                  workspace.updated,
                )}`
              : `Created ${formatRelativeTime(
                  workspace.created,
                )}`}

          </strong>

        </div>

      </div>

    </section>
  )
}


export default WorkspaceOverview