import WorkspaceCard from './WorkspaceCard';
import '../../styles/components/workspace/list.css';

function WorkspaceList({ workspaces }) {
  return (
    <section className="workspace-grid">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
        />
      ))}
    </section>
  );
}

export default WorkspaceList;