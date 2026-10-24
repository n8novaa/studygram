import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getDiscoveredWorkspaces,
  joinWorkspace,
  acceptInvitation,
} from '../services/workspaceService';
import DiscoverWorkspaceGrid from '../components/discover/DiscoverWorkspaceGrid';
import {
  DiscoverIcon,
  SearchIcon,
  ShareIcon,
  CloseIcon,
} from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/discover.css';

function Discover() {
  const { accessToken } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningWorkspaceId, setJoiningWorkspaceId] = useState(null);
  const [joinedWorkspaceIds, setJoinedWorkspaceIds] = useState(new Set());
  const [requestedWorkspaceIds, setRequestedWorkspaceIds] = useState(new Set());

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'public' | 'private'

  // Invitation token redeem state
  const [inviteTokenInput, setInviteTokenInput] = useState(searchParams.get('invite') || '');
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaces() {
      if (!accessToken) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getDiscoveredWorkspaces(accessToken, searchQuery);

        if (isMounted) {
          const discovered = Array.isArray(data) ? data : data?.results ?? [];
          setWorkspaces(discovered);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load discoverable workspaces.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, [accessToken, searchQuery]);

  function handleSearch(event) {
    event.preventDefault();
    setSearchQuery(search.trim());
  }

  async function handleJoin(workspace) {
    if (!accessToken || joiningWorkspaceId === workspace.id) return;

    try {
      setJoiningWorkspaceId(workspace.id);
      setError('');

      await joinWorkspace(accessToken, workspace.id);
      if (workspace.visibility === 'public') {
        window.dispatchEvent(new Event('studygram:workspace-navigation-change'));
      }

      if (workspace.visibility === 'public') {
        setJoinedWorkspaceIds((prev) => new Set(prev).add(workspace.id));
        addToast(`Successfully joined "${workspace.name}"!`, 'success');
      } else {
        setRequestedWorkspaceIds((prev) => new Set(prev).add(workspace.id));
        addToast(`Join request submitted for "${workspace.name}". Waiting for admin review.`, 'info');
      }
    } catch (err) {
      addToast(err?.message || 'Failed to join workspace.', 'error');
    } finally {
      setJoiningWorkspaceId(null);
    }
  }

  async function handleAcceptInvite(e) {
    e.preventDefault();
    if (!inviteTokenInput.trim() || !accessToken) return;

    try {
      setAcceptingInvite(true);
      await acceptInvitation(accessToken, inviteTokenInput.trim());
      window.dispatchEvent(new Event('studygram:workspace-navigation-change'));
      addToast('Invitation accepted! You are now a member.', 'success');
      setInviteTokenInput('');
      // Reload discovery list
      const data = await getDiscoveredWorkspaces(accessToken, searchQuery);
      setWorkspaces(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      addToast(err?.message || 'Invalid or expired invitation token.', 'error');
    } finally {
      setAcceptingInvite(false);
    }
  }

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => {
      if (filterType === 'public') return ws.visibility === 'public';
      if (filterType === 'private') return ws.visibility === 'private';
      return true;
    });
  }, [workspaces, filterType]);

  return (
    <main className="discover-page">
      {/* Header */}
      <header className="discover-header">
        <h1>Discover Workspaces</h1>
        <p>Browse public workspaces by name or subject.</p>
      </header>

      {/* Invite Code Quick Box */}
      <section className="discover-invite-box">
        <div className="discover-invite-prompt">
          <ShareIcon size={16} />
          <span>Have a private invite token or link?</span>
        </div>

        <form onSubmit={handleAcceptInvite} className="discover-invite-form">
          <input
            type="text"
            className="discover-invite-input"
            value={inviteTokenInput}
            onChange={(e) => setInviteTokenInput(e.target.value)}
            placeholder="Paste invite token here..."
          />
          <button
            type="submit"
            className="workspace-btn-action workspace-btn-primary"
            disabled={acceptingInvite || !inviteTokenInput.trim()}
            style={{ height: '36px', fontSize: '13px', padding: '0 14px' }}
          >
            {acceptingInvite ? 'Joining...' : 'Accept Invite'}
          </button>
        </form>
      </section>

      {/* Toolbar: Search and Filter Tabs */}
      <section className="discover-toolbar">
        <form className="discover-search-form" onSubmit={handleSearch}>
          <span className="discover-search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="discover-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces by title or description..."
            aria-label="Search workspaces"
          />
        </form>

        <div className="workspaces-filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Types ({workspaces.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterType === 'public' ? 'active' : ''}`}
            onClick={() => setFilterType('public')}
          >
            Public
          </button>
          <button
            type="button"
            className={`filter-tab ${filterType === 'private' ? 'active' : ''}`}
            onClick={() => setFilterType('private')}
          >
            Private
          </button>
        </div>
      </section>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger-text)',
          fontSize: '13.5px',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="workspace-state-card">
          <span className="spinner" />
          <p>Discovering workspaces...</p>
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="workspace-state-card">
          <DiscoverIcon size={36} />
          <h3>No workspaces available</h3>
          <p>
            {searchQuery
              ? `No workspaces match "${searchQuery}". Try a different keyword.`
              : 'There are currently no public workspaces matching your filter.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              className="workspace-btn-action workspace-btn-secondary"
              onClick={() => {
                setSearch('');
                setSearchQuery('');
              }}
              style={{ marginTop: '10px' }}
            >
              <CloseIcon size={14} /> Clear Search
            </button>
          )}
        </div>
      ) : (
        <DiscoverWorkspaceGrid
          workspaces={filteredWorkspaces}
          joinedWorkspaceIds={joinedWorkspaceIds}
          requestedWorkspaceIds={requestedWorkspaceIds}
          joiningWorkspaceId={joiningWorkspaceId}
          onJoin={handleJoin}
        />
      )}
    </main>
  );
}

export default Discover;
