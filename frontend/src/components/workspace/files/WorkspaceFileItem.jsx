import { formatRelativeTime } from '../../../utils/dateUtils'


function formatFileSize(bytes) {
  if (!bytes || bytes < 0) {
    return '0 Bytes'
  }

  if (bytes < 1024) {
    return `${bytes} Bytes`
  }

  const kilobytes = bytes / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  const megabytes = kilobytes / 1024

  if (megabytes < 1024) {
    return `${megabytes.toFixed(1)} MB`
  }

  const gigabytes = megabytes / 1024

  return `${gigabytes.toFixed(1)} GB`
}


function WorkspaceFileItem({
  file,
  isAdmin,
  busy,
  onDownload,
  onDelete,
}) {
  return (
    <article
      className="workspace-files-item workspace-files-file"
    >
      <div className="workspace-files-item-main">

        <span
          className="workspace-files-icon"
          aria-hidden="true"
        >
          ▱
        </span>


        <div className="workspace-files-item-details">

          <strong>
            {file.name}
          </strong>


          <span>
            {formatFileSize(file.size)}

            {file.created_at &&
              ` · ${formatRelativeTime(
                file.created_at,
              )}`}

            {file.created_by &&
              ` · ${file.created_by}`}
          </span>

        </div>

      </div>


      <div className="workspace-member-action-buttons">

        <button
          type="button"
          className="workspace-member-action"
          onClick={() => onDownload(file)}
          disabled={busy}
        >
          {busy
            ? '...'
            : 'Download'}
        </button>


        {isAdmin && (
          <button
            type="button"
            className="workspace-member-action workspace-member-action-remove"
            onClick={() => onDelete(file)}
            disabled={busy}
          >
            {busy
              ? '...'
              : 'Delete'}
          </button>
        )}

      </div>

    </article>
  )
}


export default WorkspaceFileItem