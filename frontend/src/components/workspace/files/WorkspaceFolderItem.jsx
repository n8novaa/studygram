function WorkspaceFolderItem({
  folder,
  isAdmin,
  busy,
  onOpen,
  onDelete,
}) {
  return (
    <article
      className="workspace-files-item workspace-files-folder"
      key={`folder-${folder.id}`}
    >
      <button
        type="button"
        className="workspace-files-item-main"
        onClick={() => onOpen(folder)}
      >
        <span
          className="workspace-files-icon"
          aria-hidden="true"
        >
          ▦
        </span>

        <div className="workspace-files-item-details">
          <strong>
            {folder.name}
          </strong>

          <span>
            Folder
            {folder.created_by
              ? ` · ${folder.created_by}`
              : ''}
          </span>
        </div>
      </button>

      {isAdmin && (
        <button
          type="button"
          className="workspace-member-action workspace-member-action-remove"
          onClick={() => onDelete(folder)}
          disabled={busy}
        >
          {busy
            ? '...'
            : 'Delete'}
        </button>
      )}
    </article>
  )
}

export default WorkspaceFolderItem