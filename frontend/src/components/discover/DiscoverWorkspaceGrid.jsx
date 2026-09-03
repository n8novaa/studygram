import DiscoverWorkspaceCard from './DiscoverWorkspacecard'


function DiscoverWorkspaceGrid({
  workspaces,
  joinedWorkspaceIds,
  joiningWorkspaceId,
  onJoin,
}) {
  return (
    <section className="discover-grid">

      {workspaces.map((workspace) => (

        <DiscoverWorkspaceCard
          key={workspace.id}
          workspace={workspace}
          joined={joinedWorkspaceIds.has(
            workspace.id,
          )}
          joining={
            joiningWorkspaceId === workspace.id
          }
          onJoin={onJoin}
        />

      ))}

    </section>
  )
}


export default DiscoverWorkspaceGrid