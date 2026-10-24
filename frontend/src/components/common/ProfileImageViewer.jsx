import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ProfileImageViewer({ src, label, onClose, returnFocusRef }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const returnFocusElement = returnFocusRef?.current;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [onClose, returnFocusRef]);

  return createPortal((
    <div
      className="profile-image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${label}'s profile photo`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="profile-image-viewer-card">
        <button
          ref={closeButtonRef}
          type="button"
          className="profile-image-viewer-close"
          aria-label="Close profile photo"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >×</button>
        <img
          className="profile-image-viewer-image"
          src={src}
          alt={`${label}'s profile photo`}
          onMouseDown={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  ), document.body);
}
