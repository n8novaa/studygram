function DiscoverWorkspaceCard({
  workspace,
  joined,
  joining,
  onJoin,
}) {
  const memberCount =
    workspace.member_count ?? 0

  return (
    <article className="discover-card">

      <div className="discover-card-header">

        <div>

          <span className="discover-visibility">
            {workspace.visibility === 'public'
              ? 'Public'
              : 'Private'}
          </span>

          <h2>
            {workspace.name}
          </h2>

        </div>

      </div>


      <p className="discover-description">
        {workspace.description ||
          'No description provided.'}
      </p>


      <div className="discover-meta">

        <span>
          {memberCount}{' '}
          {memberCount === 1
            ? 'member'
            : 'members'}
        </span>


        {workspace.owner && (
          <span>
            Owner: {workspace.owner}
          </span>
        )}

      </div>


      <button
        type="button"
        className="discover-join-button"
        onClick={() => onJoin(workspace)}
        disabled={joined || joining}
      >
        {joining
          ? 'Joining...'
          : joined
            ? 'Joined'
            : 'Join Workspace'}
      </button>

    </article>
  )
}


export default DiscoverWorkspaceCard