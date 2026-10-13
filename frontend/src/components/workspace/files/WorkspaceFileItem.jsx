import { formatFileSize, formatRelativeTime } from '../../../utils/formatters';
import { FileIcon, DownloadIcon } from '../../common/Icons';
import WorkspaceItemActions from './WorkspaceItemActions';

function WorkspaceFileItem({ file, isAdmin, busy, onDownload, onDelete, onCopy, onMove }) {
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
          <WorkspaceItemActions
            item={file}
            busy={busy}
            onCopy={onCopy}
            onMove={onMove}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

export default WorkspaceFileItem;
