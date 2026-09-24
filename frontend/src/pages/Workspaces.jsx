import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  createWorkspace,
  getWorkspaces,
} from '../services/workspaceService';
import { normalizeList } from '../utils/apiHelpers';
import WorkspaceCreateForm from '../components/workspace/WorkspaceCreateForm';
import WorkspaceList from '../components/workspace/WorkspaceList';
import {
  WorkspacesIcon,
  PlusIcon,
  SearchIcon,
  CloseIcon,
} from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/workspaces.css';

function Workspaces() {
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'owned' | 'member'

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!accessToken) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getWorkspaces(accessToken);

        if (isMounted) {
          setWorkspaces(normalizeList(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load workspaces.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  function resetCreateForm() {
    setName('');
    setDescription('');
    setVisibility('private');
    setCreateError('');
  }

  function handleToggleCreateForm() {
    setShowCreateForm((prev) => !prev);
    setCreateError('');
  }

  async function handleCreateWorkspace(event) {
    event.preventDefault();

    if (!accessToken) {
      setCreateError('You must be logged in to create a workspace.');
      return;
    }

    if (!name.trim()) {
      setCreateError('Workspace name is required.');
      return;
    }

    try {
      setCreating(true);
      setCreateError('');

      await createWorkspace(accessToken, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });

      const updatedList = await getWorkspaces(accessToken);
      setWorkspaces(normalizeList(updatedList));

      addToast(`Workspace "${name.trim()}" created successfully!`, 'success');
      resetCreateForm();
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err?.message || 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  }

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => {
      // Search match
      const matchesSearch =
        ws.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.owner?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter tab
      if (filterTab === 'owned') {
        return ws.owner === user?.username;
      }
      if (filterTab === 'member') {
        return ws.owner !== user?.username;
      }

      return true;
    });
  }, [workspaces, searchQuery, filterTab, user?.username]);

  return (
    <main className="workspaces-page">
      {/* Header */}
      <header className="workspaces-header">
        <div>
          <h1>My Workspaces</h1>
          <p className="workspaces-subtitle">
            Organize study materials, notes, and discussions with your peers.
          </p>
        </div>

        <button
          type="button"
          className={`workspace-create-toggle-btn ${
            showCreateForm ? 'btn-cancel' : ''
          }`}
          onClick={handleToggleCreateForm}
          disabled={creating}
        >
          {showCreateForm ? (
            <>
              <CloseIcon size={16} /> Cancel
            </>
          ) : (
            <>
              <PlusIcon size={16} /> Create Workspace
            </>
          )}
        </button>
      </header>

      {/* Create Form Dropdown/Collapsible */}
      {showCreateForm && (
        <WorkspaceCreateForm
          name={name}
          description={description}
          visibility={visibility}
          creating={creating}
          createError={createError}
          onNameChange={(e) => setName(e.target.value)}
          onDescriptionChange={(e) => setDescription(e.target.value)}
          onVisibilityChange={(e) => setVisibility(e.target.value)}
          onSubmit={handleCreateWorkspace}
        />
      )}

      {/* Toolbar: Search and Filter Tabs */}
      {!loading && workspaces.length > 0 && (
        <section className="workspaces-toolbar">
          <div className="workspaces-search-wrapper">
            <span className="workspaces-search-icon">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              className="workspaces-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your workspaces..."
            />
          </div>

          <div className="workspaces-filter-tabs">
            <button
              type="button"
              className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({workspaces.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${filterTab === 'owned' ? 'active' : ''}`}
              onClick={() => setFilterTab('owned')}
            >
              Created by Me
            </button>
            <button
              type="button"
              className={`filter-tab ${filterTab === 'member' ? 'active' : ''}`}
              onClick={() => setFilterTab('member')}
            >
              Joined
            </button>
          </div>
        </section>
      )}

      {/* Content State */}
      {loading ? (
        <div className="workspace-state-card">
          <span className="spinner" />
          <p>Loading your study spaces...</p>
        </div>
      ) : error ? (
        <div className="workspace-state-card" style={{ borderColor: 'var(--danger-border)' }}>
          <p style={{ color: 'var(--danger-text)' }}>{error}</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="workspace-state-card">
          <WorkspacesIcon size={36} />
          <h3>No workspaces yet</h3>
          <p>
            Create your first workspace to start uploading documents, lecture notes, and inviting classmates.
          </p>
          <button
            type="button"
            className="workspace-create-toggle-btn"
            onClick={handleToggleCreateForm}
            style={{ marginTop: '12px' }}
          >
            <PlusIcon size={16} /> Create Workspace
          </button>
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="workspace-state-card">
          <SearchIcon size={32} />
          <h3>No matching workspaces found</h3>
          <p>Try adjusting your search keyword or filter options.</p>
        </div>
      ) : (
        <WorkspaceList workspaces={filteredWorkspaces} />
      )}
    </main>
  );
}

export default Workspaces;