import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from '../services/workspaceService';
import WorkspaceHeader from '../components/workspace/WorkspaceHeader';
import WorkspaceOverview from '../components/workspace/overview/WorkspaceOverview';
import WorkspaceEditForm from '../components/workspace/overview/WorkspaceEditForm';
import WorkspaceMembers from '../components/workspace/members/workspaceMembers';
import WorkspaceFiles from '../components/workspace/files/WorkspaceFiles';
import WorkspaceChannels from '../components/workspace/channels/WorkspaceChannels';
import WorkspaceInviteModal from '../components/workspace/members/WorkspaceInviteModal';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  FolderIcon,
  UsersIcon,
  SparklesIcon,
  HashIcon,
} from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/workspace-detail.css';

function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { addToast } = useToast();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [formError, setFormError] = useState('');

  // Default to 'overview' so content is immediately visible on mount
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    async function loadWorkspace() {
      if (!accessToken) return;

      try {
        setLoading(true);
        setError('');
        const data = await getWorkspace(accessToken, id);

        setWorkspace(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setVisibility(data.visibility || 'private');
      } catch (err) {
        setError(err?.message || 'Failed to load workspace.');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [accessToken, id]);

  function startEditing() {
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setVisibility(workspace.visibility || 'private');
    setFormError('');
    setEditing(true);
  }

  function cancelEditing() {
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setVisibility(workspace.visibility || 'private');
    setFormError('');
    setEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!name.trim()) {
      setFormError('Workspace name is required.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const updatedWorkspace = await updateWorkspace(accessToken, id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });

      setWorkspace(updatedWorkspace);
      setEditing(false);
      addToast('Workspace updated successfully!', 'success');
    } catch (err) {
      setFormError(err?.message || 'Failed to update workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError('');

      await deleteWorkspace(accessToken, id);
      addToast('Workspace deleted.', 'info');
      setShowDeleteModal(false);
      navigate('/app/workspaces', { replace: true });
    } catch (err) {
      setError(err?.message || 'Failed to delete workspace.');
      setDeleting(false);
    }
  }

  function handleSectionChange(section) {
    setEditing(false);
    setFormError('');
    setActiveSection(section);
  }

  if (loading) {
    return (
      <main className="workspace-detail-page">
        <div className="workspace-detail-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Loading workspace details...</p>
        </div>
      </main>
    );
  }

  if (error || !workspace) {
    return (
      <main className="workspace-detail-page">
        <div className="workspace-detail-card" style={{ borderColor: 'var(--danger-border)', alignItems: 'center' }}>
          <p style={{ color: 'var(--danger-text)' }}>{error || 'Workspace not found.'}</p>
        </div>
      </main>
    );
  }

  const currentUsername = user?.username;
  const isOwner = workspace.owner === currentUsername;
  const currentMember = workspace.members?.find((m) => m.user === currentUsername);
  const isAdmin = isOwner || currentMember?.role === 'admin';

  return (
    <main className="workspace-detail-page">
      {/* Header with real permissions and invite trigger */}
      <WorkspaceHeader
        workspace={workspace}
        isOwner={isOwner}
        isAdmin={isAdmin}
        editing={editing}
        saving={saving}
        deleting={deleting}
        onEdit={startEditing}
        onDelete={() => setShowDeleteModal(true)}
        onInvite={() => setShowInviteModal(true)}
      />

      {/* Tabs Navigation */}
      <nav className="workspace-tabs-nav" aria-label="Workspace sections">
        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => handleSectionChange('overview')}
        >
          <SparklesIcon size={16} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'channels' ? 'active' : ''}`}
          onClick={() => handleSectionChange('channels')}
        >
          <HashIcon size={16} />
          <span>Channels</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'files' ? 'active' : ''}`}
          onClick={() => handleSectionChange('files')}
        >
          <FolderIcon size={16} />
          <span>Files & Storage</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'members' ? 'active' : ''}`}
          onClick={() => handleSectionChange('members')}
        >
          <UsersIcon size={16} />
          <span>Members ({workspace.members?.length ?? 0})</span>
        </button>
      </nav>

      {/* Content Area */}
      {activeSection === 'channels' ? (
        <WorkspaceChannels workspace={workspace} isAdmin={isAdmin} />
      ) : (
        <div className="workspace-detail-card">
          {activeSection === 'overview' && (
            <>
              {editing ? (
                <WorkspaceEditForm
                  name={name}
                  description={description}
                  visibility={visibility}
                  saving={saving}
                  formError={formError}
                  onNameChange={(e) => setName(e.target.value)}
                  onDescriptionChange={(e) => setDescription(e.target.value)}
                  onVisibilityChange={(e) => setVisibility(e.target.value)}
                  onSave={handleSave}
                  onCancel={cancelEditing}
                />
              ) : (
                <WorkspaceOverview workspace={workspace} />
              )}
            </>
          )}

          {activeSection === 'files' && (
            <WorkspaceFiles workspaceId={workspace.id} isAdmin={isAdmin} />
          )}

          {activeSection === 'members' && (
            <WorkspaceMembers
              workspace={workspace}
              isAdmin={isAdmin}
              onInvite={() => setShowInviteModal(true)}
            />
          )}
        </div>
      )}

      {/* Delete Workspace Confirm Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Workspace"
          message="Are you sure you want to delete this workspace? All uploaded files, channels, and notes will be permanently lost. This action cannot be undone."
          confirmText="Delete Workspace"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <WorkspaceInviteModal
          workspace={workspace}
          accessToken={accessToken}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </main>
  );
}

export default WorkspaceDetail;