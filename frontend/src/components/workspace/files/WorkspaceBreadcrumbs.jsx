import React from 'react';
import { HomeIcon } from '../../common/Icons';

function WorkspaceBreadcrumbs({ folderPath, onNavigate }) {
  return (
    <nav className="workspace-breadcrumbs" aria-label="Folder Breadcrumbs">
      <button
        type="button"
        className="breadcrumb-item"
        onClick={() => onNavigate(-1)}
      >
        <HomeIcon size={14} />
        <span>Root</span>
      </button>

      {folderPath.map((folder, index) => {
        const isLast = index === folderPath.length - 1;

        return (
          <React.Fragment key={folder.id}>
            <span className="breadcrumb-separator">/</span>
            {isLast ? (
              <span className="breadcrumb-current">{folder.name}</span>
            ) : (
              <button
                type="button"
                className="breadcrumb-item"
                onClick={() => onNavigate(index)}
              >
                {folder.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default WorkspaceBreadcrumbs;