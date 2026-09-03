function WorkspaceBreadcrumbs({
  folderPath,
  onNavigate,
}) {
  return (
    <nav
      className="workspace-files-breadcrumb"
      aria-label="Folder path"
    >
      <button
        type="button"
        className="workspace-breadcrumb-link"
        onClick={() => onNavigate(-1)}
      >
        Root
      </button>

      {folderPath.map((folder, index) => (
        <span
          className="workspace-breadcrumb-segment"
          key={folder.id}
        >
          <span
            className="workspace-breadcrumb-separator"
            aria-hidden="true"
          >
            /
          </span>

          <button
            type="button"
            className="workspace-breadcrumb-link"
            onClick={() => onNavigate(index)}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  )
}

export default WorkspaceBreadcrumbs