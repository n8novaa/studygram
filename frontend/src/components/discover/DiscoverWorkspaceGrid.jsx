import DiscoverWorkspaceCard from './DiscoverWorkspaceCard';

function DiscoverWorkspaceGrid({
  workspaces,
  joinedWorkspaceIds,
  requestedWorkspaceIds = new Set(),
  joiningWorkspaceId,
  onJoin,
}) {
  return (
    <section className="discover-grid">
      {workspaces.map((workspace) => (
        <DiscoverWorkspaceCard
          key={workspace.id}
          workspace={workspace}
          joined={joinedWorkspaceIds.has(workspace.id)}
          requested={requestedWorkspaceIds.has(workspace.id)}
          joining={joiningWorkspaceId === workspace.id}
          onJoin={onJoin}
        />
      ))}
    </section>
  );
}

export default DiscoverWorkspaceGrid;