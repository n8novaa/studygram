import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../common/ToastContext';
import { getWorkspaces } from '../../services/workspaceService';
import { getWorkspaceChannels } from '../../services/workspaceChannelService';
import { getWorkspaceFolders } from '../../services/workspaceFileService';
import {
  ChevronDownIcon,
  FolderIcon,
  HomeIcon,
  WorkspacesIcon,
  DiscoverIcon,
  LogOutIcon,
} from '../common/Icons';
import '../../styles/layout/app-layout.css';

function AppLayout() {
  const { user, logout, accessToken } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [workspaceContents, setWorkspaceContents] = useState({ channels: [], folders: [] });
  const [workspaceContentsLoading, setWorkspaceContentsLoading] = useState(false);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const activeWorkspaceId = location.pathname.match(/^\/app\/workspaces\/(\d+)/)?.[1];
  const [workspaceTreeOpen, setWorkspaceTreeOpen] = useState(
    () => location.pathname === '/app/workspaces' || Boolean(activeWorkspaceId),
  );
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState(activeWorkspaceId);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(Boolean(searchParams.get('folder')));
  const navigationWorkspaceId = workspaceTreeOpen
    ? (expandedWorkspaceId || activeWorkspaceId)
    : null;
  const selectedWorkspaceId = activeWorkspaceId || expandedWorkspaceId;
  const selectedWorkspace = workspaces.find(
    (workspace) => String(workspace.id) === String(selectedWorkspaceId),
  );
  const filteredWorkspaces = workspaces.filter((workspace) => (
    workspace.name?.toLowerCase().includes(workspaceSearch.trim().toLowerCase())
  ));

  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedWorkspaceId(activeWorkspaceId);
      setWorkspaceTreeOpen(true);
    } else if (location.pathname === '/app/workspaces') {
      setWorkspaceTreeOpen(true);
      setExpandedWorkspaceId(null);
    } else {
      setWorkspaceTreeOpen(false);
      setExpandedWorkspaceId(null);
    }
  }, [activeWorkspaceId, location.pathname]);

  useEffect(() => {
    if (searchParams.get('section') === 'channels') setChannelsOpen(true);
    if (searchParams.get('folder')) setFoldersOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const refreshNavigation = () => setNavigationVersion((version) => version + 1);
    window.addEventListener('studygram:workspace-navigation-change', refreshNavigation);
    return () => window.removeEventListener('studygram:workspace-navigation-change', refreshNavigation);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) {
      setWorkspaces([]);
      setWorkspacesLoading(false);
      return undefined;
    }
    setWorkspacesLoading(true);
    getWorkspaces(accessToken)
      .then((data) => {
        if (!cancelled) setWorkspaces(Array.isArray(data) ? data : data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([]);
      })
      .finally(() => {
        if (!cancelled) setWorkspacesLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, location.pathname, navigationVersion]);

  useEffect(() => {
    if (!workspacePickerOpen) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setWorkspacePickerOpen(false);
        setWorkspaceSearch('');
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [workspacePickerOpen]);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken || !navigationWorkspaceId) {
      setWorkspaceContents({ channels: [], folders: [] });
      setWorkspaceContentsLoading(false);
      return undefined;
    }
    setWorkspaceContents({ channels: [], folders: [] });
    setWorkspaceContentsLoading(true);
    async function loadWorkspaceNavigation() {
      try {
        const [channels, roots] = await Promise.all([
          getWorkspaceChannels(accessToken, navigationWorkspaceId),
          getWorkspaceFolders(accessToken, navigationWorkspaceId),
        ]);
        const folders = [];
        let frontier = (Array.isArray(roots) ? roots : []).map((folder) => ({ folder, depth: 0 }));
        while (frontier.length && folders.length < 150) {
          const current = frontier.slice(0, 150 - folders.length);
          folders.push(...current);
          const expandable = current.filter(({ depth }) => depth < 5);
          const next = [];
          for (let index = 0; index < expandable.length; index += 10) {
            const batch = expandable.slice(index, index + 10);
            const childrenByParent = await Promise.all(batch.map(({ folder }) => (
              getWorkspaceFolders(accessToken, navigationWorkspaceId, folder.id).catch(() => [])
            )));
            childrenByParent.forEach((children, batchIndex) => {
              (Array.isArray(children) ? children : []).forEach((folder) => {
                next.push({ folder, depth: batch[batchIndex].depth + 1 });
              });
            });
          }
          frontier = next;
        }
        if (!cancelled) {
          setWorkspaceContents({ channels: Array.isArray(channels) ? channels : [], folders: folders.map(({ folder, depth }) => ({ ...folder, depth })) });
        }
      } catch {
        if (!cancelled) setWorkspaceContents({ channels: [], folders: [] });
      } finally {
        if (!cancelled) setWorkspaceContentsLoading(false);
      }
    }
    loadWorkspaceNavigation();
    return () => { cancelled = true; };
  }, [accessToken, navigationWorkspaceId, navigationVersion]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      addToast(
        'Signed out locally, but the server could not revoke this session token.',
        'error',
      );
    } finally {
      navigate('/login', { replace: true });
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="brand-logo-icon">S</div>
          <span className="brand-title">StudyGram</span>
        </div>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </header>

      {/* Sidebar Overlay for mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={closeMobileMenu} />
      )}

      {/* Main Sidebar */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">S</div>
          <div className="brand-info">
            <h2 className="brand-title">StudyGram</h2>
            <span className="brand-tag">Workspace Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-label">Main Menu</div>

          <NavLink
            to="/app"
            end
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <HomeIcon size={19} />
            </span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/app/workspaces"
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <WorkspacesIcon size={19} />
            </span>
            <span>Workspaces</span>
          </NavLink>

          <section className="sidebar-workspace-tree" aria-label="Workspace navigation">
            <div className="sidebar-switcher-label">CURRENT WORKSPACE</div>
            <div
              className="sidebar-workspace-switcher"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setWorkspacePickerOpen(false);
                  setWorkspaceSearch('');
                }
              }}
            >
              <button
                type="button"
                className={`sidebar-workspace-switcher-trigger ${workspacePickerOpen ? 'is-open' : ''}`}
                onClick={() => setWorkspacePickerOpen((open) => !open)}
                aria-expanded={workspacePickerOpen}
                aria-haspopup="dialog"
              >
                <span className="sidebar-workspace-mark" aria-hidden="true">
                  {selectedWorkspace?.name?.trim()?.charAt(0)?.toUpperCase() || <WorkspacesIcon size={14} />}
                </span>
                <span className="sidebar-switcher-copy">
                  <span className="sidebar-switcher-name">{selectedWorkspace?.name || 'Choose a workspace'}</span>
                  <span className="sidebar-switcher-caption">
                    {selectedWorkspace ? 'Workspace' : workspacesLoading ? 'Loading workspaces…' : `${workspaces.length} available`}
                  </span>
                </span>
                <ChevronDownIcon className={workspacePickerOpen ? 'is-open' : ''} />
              </button>

              {workspacePickerOpen && (
                <div className="sidebar-workspace-picker" role="dialog" aria-label="Switch workspace">
                  <div className="sidebar-picker-heading">
                    <span>Switch workspace</span>
                    <span className="sidebar-tree-heading-meta">{workspaces.length}</span>
                  </div>
                  <input
                    className="sidebar-workspace-search"
                    type="search"
                    value={workspaceSearch}
                    onChange={(event) => setWorkspaceSearch(event.target.value)}
                    placeholder="Find a workspace"
                    aria-label="Search workspaces"
                    autoFocus
                  />
                  <div className="sidebar-workspace-picker-list" role="listbox" aria-label="Workspaces">
                    {workspacesLoading ? (
                      <span className="sidebar-tree-hint">Loading workspaces…</span>
                    ) : filteredWorkspaces.length ? filteredWorkspaces.map((workspace) => (
                      <NavLink
                        key={workspace.id}
                        to={`/app/workspaces/${workspace.id}?section=overview`}
                        onClick={() => {
                          setExpandedWorkspaceId(String(workspace.id));
                          setWorkspacePickerOpen(false);
                          setWorkspaceSearch('');
                          closeMobileMenu();
                        }}
                        role="option"
                        aria-selected={String(workspace.id) === String(selectedWorkspaceId)}
                        className={({ isActive }) => `sidebar-picker-option ${isActive ? 'active' : ''}`}
                      >
                        <span className="sidebar-workspace-mark" aria-hidden="true">
                          {workspace.name?.trim()?.charAt(0)?.toUpperCase() || 'W'}
                        </span>
                        <span className="sidebar-tree-name">{workspace.name}</span>
                      </NavLink>
                    )) : (
                      <span className="sidebar-tree-hint">
                        {workspaces.length ? 'No matching workspaces' : 'No workspaces yet'}
                      </span>
                    )}
                  </div>
                  <NavLink to="/app/workspaces" className="sidebar-picker-footer" onClick={() => { setWorkspacePickerOpen(false); closeMobileMenu(); }}>
                    Manage workspaces
                  </NavLink>
                </div>
              )}
            </div>

            {workspaceTreeOpen && selectedWorkspace && (
              <div className="sidebar-workspace-children">
                <NavLink to={`/app/workspaces/${selectedWorkspace.id}?section=overview`} onClick={closeMobileMenu} className={({ isActive }) => `sidebar-child-link ${isActive && (searchParams.get('section') || 'overview') === 'overview' ? 'active' : ''}`}>
                  <span className="sidebar-child-dot" />Overview
                </NavLink>

                <div className="sidebar-tree-group">
                  <button type="button" className="sidebar-tree-group-toggle" aria-expanded={channelsOpen} onClick={() => setChannelsOpen((open) => !open)}>
                    <ChevronDownIcon className={channelsOpen ? 'is-open' : ''} />
                    <span>Channels</span>
                    <span className="sidebar-tree-count">{workspaceContents.channels.length}</span>
                  </button>
                  {channelsOpen && (
                    <div className="sidebar-tree-group-items">
                      {workspaceContentsLoading ? (
                        <span className="sidebar-tree-hint">Loading channels…</span>
                      ) : workspaceContents.channels.length ? workspaceContents.channels.map((channel) => (
                        <NavLink key={channel.id} to={`/app/workspaces/${selectedWorkspace.id}?section=channels&channel=${channel.id}`} onClick={closeMobileMenu} className={({ isActive }) => `sidebar-child-link sidebar-channel-link ${isActive && searchParams.get('channel') === String(channel.id) ? 'active' : ''}`}>
                          <span className="sidebar-channel-hash">#</span>{channel.name}
                        </NavLink>
                      )) : <span className="sidebar-tree-hint">No channels yet</span>}
                    </div>
                  )}
                </div>

                <NavLink to={`/app/workspaces/${selectedWorkspace.id}?section=files`} onClick={closeMobileMenu} className={({ isActive }) => `sidebar-child-link sidebar-files-link ${isActive && searchParams.get('section') === 'files' && !searchParams.get('folder') ? 'active' : ''}`}>
                  <FolderIcon size={14} />All files
                </NavLink>

                <div className="sidebar-tree-group">
                  <button type="button" className="sidebar-tree-group-toggle" aria-expanded={foldersOpen} onClick={() => setFoldersOpen((open) => !open)}>
                    <ChevronDownIcon className={foldersOpen ? 'is-open' : ''} />
                    <span>Folders</span>
                    <span className="sidebar-tree-count">{workspaceContents.folders.length}</span>
                  </button>
                  {foldersOpen && (
                    <div className="sidebar-tree-group-items">
                      {workspaceContentsLoading ? (
                        <span className="sidebar-tree-hint">Loading folders…</span>
                      ) : workspaceContents.folders.length ? workspaceContents.folders.map((folder) => (
                        <NavLink key={folder.id} to={`/app/workspaces/${selectedWorkspace.id}?section=files&folder=${folder.id}`} onClick={closeMobileMenu} className={({ isActive }) => `sidebar-child-link sidebar-folder-link ${isActive && searchParams.get('folder') === String(folder.id) ? 'active' : ''}`} style={{ '--folder-depth': folder.depth }}>
                          <FolderIcon size={13} />{folder.name}
                        </NavLink>
                      )) : <span className="sidebar-tree-hint">No folders yet</span>}
                    </div>
                  )}
                </div>

                <NavLink to={`/app/workspaces/${selectedWorkspace.id}?section=members`} onClick={closeMobileMenu} className={({ isActive }) => `sidebar-child-link ${isActive && searchParams.get('section') === 'members' ? 'active' : ''}`}>
                  <span className="sidebar-child-dot" />Members
                </NavLink>
              </div>
            )}
          </section>

          <NavLink
            to="/app/discover"
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <DiscoverIcon size={19} />
            </span>
            <span>Discover</span>
          </NavLink>

        </nav>

        {/* User Account Section */}
        <div className="sidebar-account">
          <div className="account-info">
            <div className="account-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="account-details">
              <span className="account-name">{user?.username}</span>
              <span className="account-label">Online</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Logout from StudyGram"
          >
            <LogOutIcon size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Page Content Area */}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
