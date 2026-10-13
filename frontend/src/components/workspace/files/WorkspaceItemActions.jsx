import { useEffect, useRef, useState } from 'react';
import { CopyIcon, MoveIcon, MoreVerticalIcon, TrashIcon } from '../../common/Icons';

function WorkspaceItemActions({ item, busy, onCopy, onMove, onDelete }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function runAction(action) {
    setOpen(false);
    action(item);
  }

  return (
    <div className="workspace-item-menu" ref={rootRef}>
      <button
        type="button"
        className="item-action-btn workspace-item-menu-trigger"
        aria-label={`More actions for ${item.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVerticalIcon size={18} />
      </button>
      {open && (
        <div className="workspace-item-menu-popover" role="menu">
          <button type="button" role="menuitem" onClick={() => runAction(onCopy)} disabled={busy}>
            <CopyIcon size={15} /><span>Copy</span>
          </button>
          <button type="button" role="menuitem" onClick={() => runAction(onMove)} disabled={busy}>
            <MoveIcon size={15} /><span>Move</span>
          </button>
          <button type="button" role="menuitem" className="workspace-item-menu-delete" onClick={() => runAction(onDelete)} disabled={busy}>
            <TrashIcon size={15} /><span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceItemActions;
