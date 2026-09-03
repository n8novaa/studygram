import { Link } from 'react-router-dom'


function WorkspaceHeader({
  workspace,
  isOwner,
  isAdmin,
  editing,
  saving,
  deleting,
  onEdit,
  onDelete,
}) {
  const isPublic =
    workspace.visibility === 'public'


  return (
    <>
      <Link
        to="/app/workspaces"
        className="workspace-back-link"
      >
        ← Back to Workspaces
      </Link>


      <section className="workspace-card workspace-header-card">

        <div className="workspace-header-content">

          <div>

            <div className="workspace-title-row">

              <h1>
                {workspace.name}
              </h1>

              <span
                className={`workspace-visibility-badge ${
                  isPublic
                    ? 'workspace-visibility-public'
                    : 'workspace-visibility-private'
                }`}
              >
                {isPublic
                  ? 'Public'
                  : 'Private'}
              </span>

            </div>


            <p className="workspace-owner">
              Owner:{' '}
              <strong>
                {workspace.owner}
              </strong>
            </p>

          </div>


          {(isAdmin || isOwner) && !editing && (
            <div className="workspace-header-actions">

              <button
                type="button"
                className="workspace-button workspace-button-secondary"
                onClick={onEdit}
                disabled={
                  saving || deleting
                }
              >
                Edit
              </button>


              {isOwner && (
                <button
                  type="button"
                  className="workspace-button workspace-button-danger"
                  onClick={onDelete}
                  disabled={
                    saving || deleting
                  }
                >
                  {deleting
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              )}

            </div>
          )}

        </div>


        {workspace.description && (
          <p className="workspace-description">
            {workspace.description}
          </p>
        )}

      </section>
    </>
  )
}


export default WorkspaceHeader