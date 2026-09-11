import { FolderIcon, TrashIcon } from '../../common/Icons';

function WorkspaceFolderItem({ folder, isAdmin, busy, onOpen, onDelete }) {
  return (
    <div className="folder-item-card">
      <div
        className="item-left"
        onClick={() => onOpen(folder)}
        style={{ cursor: 'pointer' }}
      >
        <div className="item-icon-folder">
          <FolderIcon size={20} />
        </div>
        <div className="item-details">
          <span className="item-name" title={folder.name}>
            {folder.name}
          </span>
          <span className="item-meta">Folder &bull; Click to open</span>
        </div>
      </div>

      {isAdmin && (
        <div className="item-actions">
          <button
            type="button"
            className="item-action-btn btn-delete"
            onClick={() => onDelete(folder)}
            disabled={busy}
            title="Delete folder"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceFolderItem;