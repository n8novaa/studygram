import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveMediaUrl } from '../../services/api';
import ProfileImageViewer from './ProfileImageViewer';
import { getAvatarColor } from '../../utils/avatarColors';
import '../../styles/components/common/user-avatar.css';

export default function UserAvatar({
  src,
  displayName = '',
  username = '',
  className = 'user-avatar',
  title,
  online = false,
  fallbackColor,
  loading = 'lazy',
  viewable = false,
}) {
  const imageUrls = (Array.isArray(src) ? src : [src])
    .map(resolveMediaUrl)
    .filter((url, index, urls) => url && urls.indexOf(url) === index);
  const imageKey = JSON.stringify(imageUrls);
  const [failedUrls, setFailedUrls] = useState(() => new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const avatarRef = useRef(null);
  const imageUrl = imageUrls.find((url) => !failedUrls.has(url)) || '';
  const label = displayName || username || 'User';
  const initial = label.trim().charAt(0).toUpperCase() || 'U';
  const closeViewer = useCallback(() => setViewerOpen(false), [setViewerOpen]);
  const canView = Boolean(viewable && imageUrl);

  useEffect(() => setFailedUrls(new Set()), [imageKey]);

  return (
    <div
      ref={avatarRef}
      className={`${className} user-avatar`}
      title={title || (online ? `${label} is online` : label)}
      style={{ backgroundColor: fallbackColor || getAvatarColor(username) }}
      role={canView ? 'button' : 'img'}
      tabIndex={canView ? 0 : undefined}
      aria-haspopup={canView ? 'dialog' : undefined}
      aria-label={`${label}${online ? ', online' : ''}`}
      onClick={canView ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus();
        setViewerOpen(true);
      } : undefined}
      onKeyDown={canView ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.focus();
          setViewerOpen(true);
        }
      } : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading={loading}
          onError={() => setFailedUrls((current) => new Set(current).add(imageUrl))}
        />
      ) : initial}
      {online && <span className="user-avatar-presence" role="img" aria-label="Online" />}
      {viewerOpen && imageUrl && (
        <ProfileImageViewer src={imageUrl} label={label} onClose={closeViewer} returnFocusRef={avatarRef} />
      )}
    </div>
  );
}
