import { FolderIcon } from '../../common/Icons';
import WorkspaceItemActions from './WorkspaceItemActions';

function WorkspaceFolderItem({ folder, isAdmin, busy, onOpen, onDelete, onCopy, onMove }) {
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
          <WorkspaceItemActions
            item={folder}
            busy={busy}
            onCopy={onCopy}
            onMove={onMove}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}

export default WorkspaceFolderItem;
