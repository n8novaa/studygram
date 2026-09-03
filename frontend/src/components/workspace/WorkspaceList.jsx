import WorkspaceCard from './WorkspaceCard'


function WorkspaceList({ workspaces }) {
  if (workspaces.length === 0) {
    return (
      <section className="workspace-empty">

        <div className="workspace-empty-icon">
          ▦
        </div>

        <h2>No workspaces yet</h2>

        <p>
          Create your first workspace to start
          collaborating with other students.
        </p>

      </section>
    )
  }

  return (
    <section className="workspace-list">

      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
        />
      ))}

    </section>
  )
}


export default WorkspaceList