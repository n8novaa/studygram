import { formatFileSize, formatRelativeTime } from '../../../utils/formatters';
import { FileIcon, DownloadIcon, TrashIcon } from '../../common/Icons';

function WorkspaceFileItem({ file, isAdmin, busy, onDownload, onDelete }) {
  return (
    <div className="file-item-card">
      <div className="item-left">
        <div className="item-icon-file">
          <FileIcon size={20} />
        </div>
        <div className="item-details">
          <span className="item-name" title={file.name}>
            {file.name}
          </span>
          <span className="item-meta">
            {formatFileSize(file.size)} &bull; {formatRelativeTime(file.created)}
          </span>
        </div>
      </div>

      <div className="item-actions">
        <button
          type="button"
          className="item-action-btn"
          onClick={() => onDownload(file)}
          disabled={busy}
          title="Download file"
        >
          <DownloadIcon size={14} />
        </button>

        {isAdmin && (
          <button
            type="button"
            className="item-action-btn btn-delete"
            onClick={() => onDelete(file)}
            disabled={busy}
            title="Delete file"
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default WorkspaceFileItem;