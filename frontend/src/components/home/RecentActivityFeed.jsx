import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import UserAvatar from '../common/UserAvatar';
import { ArrowRightIcon } from '../common/Icons';
import { getRecentActivity } from '../../services/workspaceService';

const PAGE_SIZE = 25;

function getDayGroup(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const activityDay = new Date(date);
  activityDay.setHours(0, 0, 0, 0);

  if (activityDay.getTime() === today.getTime()) return 'Today';
  if (activityDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
}

function formatRelativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupActivity(items) {
  const groups = new Map([
    ['Today', []],
    ['Yesterday', []],
    ['Earlier', []],
  ]);
  items.forEach((item) => groups.get(getDayGroup(item.created)).push(item));
  return [...groups.entries()].filter(([, groupItems]) => groupItems.length);
}

function RecentActivityItem({ item }) {
  const displayName = item.author_display_name?.trim() || item.author_username;
  const channelPath = `/app/workspaces/${item.workspace_id}?section=channels&channel=${item.channel_id}&message=${item.id}`;

  return (
    <Link
      className="recent-activity-item"
      to={channelPath}
      aria-label={`Open ${displayName}'s message in ${item.workspace_name}, #${item.channel_name}`}
    >
      <UserAvatar
        src={item.author_avatar}
        displayName={displayName}
        username={item.author_username}
        className="recent-activity-avatar"
      />
      <span className="recent-activity-content">
        <span className="recent-activity-heading">
          <strong>{displayName}</strong>
          <span className="recent-activity-location">
            in <b>{item.workspace_name}</b> <span aria-hidden="true">·</span> #{item.channel_name}
          </span>
        </span>
        <span className="recent-activity-preview">{item.preview}</span>
      </span>
      <time className="recent-activity-time" dateTime={item.created}>
        {formatRelativeTime(item.created)}
      </time>
      <ArrowRightIcon className="recent-activity-open-indicator" size={14} />
    </Link>
  );
}

function RecentActivityFeed({ view = 'active', pageSize = PAGE_SIZE, preview = false }) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setItems([]);
    setPage(1);
    setHasMore(false);

    getRecentActivity(accessToken, 1, pageSize, view)
      .then((data) => {
        if (cancelled) return;
        setItems(data.results || []);
        setHasMore(Boolean(data.next));
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Could not load recent activity.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, reloadKey, pageSize, view]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setMoreError('');
    try {
      const data = await getRecentActivity(accessToken, nextPage, pageSize, view);
      setItems((current) => [...current, ...(data.results || [])]);
      setPage(nextPage);
      setHasMore(Boolean(data.next));
    } catch (requestError) {
      setMoreError(requestError.message || 'Could not load more activity.');
    } finally {
      setLoadingMore(false);
    }
  }

  const groups = useMemo(() => groupActivity(items), [items]);

  if (loading) {
    return <div className="recent-activity-state" role="status"><span className="spinner" />Loading recent activity…</div>;
  }

  if (error) {
    return (
      <div className="recent-activity-state is-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="recent-activity-state">
        <strong>{view === 'history' ? 'No messages in your history yet' : 'No new messages yet'}</strong>
        <span>{view === 'history' ? 'Messages from other members will appear here.' : 'New messages from your workspaces will show up here.'}</span>
      </div>
    );
  }

  return (
    <div className={`recent-activity-feed${preview ? ' is-preview' : ''}`}>
      {groups.map(([label, groupItems]) => (
        <section className="recent-activity-group" key={label} aria-label={`${label} activity`}>
          <h3>{label}</h3>
          <div className="recent-activity-list">
            {groupItems.map((item) => <RecentActivityItem item={item} key={item.id} />)}
          </div>
        </section>
      ))}
      {moreError && <p className="recent-activity-more-error" role="alert">{moreError}</p>}
      {hasMore && !preview && (
        <button type="button" className="recent-activity-load-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : moreError ? 'Try loading more' : 'Load more'}
        </button>
      )}
    </div>
  );
}

export default RecentActivityFeed;
