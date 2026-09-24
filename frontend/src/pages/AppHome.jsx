import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getWorkspaces,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../services/workspaceService';

import {
  WorkspacesIcon,
 
  DiscoverIcon,
  CheckIcon,
  CloseIcon,
  ArrowRightIcon,
  SparklesIcon,
  PlusIcon,
} from '../components/common/Icons';
import { useToast } from '../components/common/ToastContext';
import '../styles/pages/home.css';

function AppHome() {
  const { user, accessToken } = useAuth();
  const { addToast } = useToast();

  const [workspaces, setWorkspaces] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);

  useEffect(() => {
    if (!accessToken || !user?.username) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        setError('');

       const wsData = await getWorkspaces(accessToken);

        if (!isMounted) return;

        const allWorkspaces = Array.isArray(wsData)
          ? wsData
          : wsData?.results ?? [];

        setWorkspaces(allWorkspaces);


        const adminWorkspaces = allWorkspaces.filter((ws) => {
          const isOwner = ws.owner === user.username;

          const isAdmin = ws.members?.some(
            (member) =>
              member.user === user.username &&
              member.role === 'admin'
          );

          return isOwner || isAdmin;
        });

        const requestsPromises = adminWorkspaces.map(async (ws) => {
          try {
            const reqs = await getJoinRequests(
              accessToken,
              ws.id
            );

            return reqs.map((request) => ({
              ...request,
              workspaceName: ws.name,
              workspaceId: ws.id,
            }));
          } catch {
            return [];
          }
        });

        const nestedRequests = await Promise.all(
          requestsPromises
        );

        if (isMounted) {
          const pendingRequests = nestedRequests
            .flat()
            .filter((request) => request.status === 'pending');

          setJoinRequests(pendingRequests);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message || 'Failed to load dashboard data.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [accessToken, user?.username]);

  async function handleApprove(request) {
    if (!accessToken) return;

    try {
      setProcessingRequestId(request.id);

      await approveJoinRequest(
        accessToken,
        request.workspaceId,
        request.id
      );

      setJoinRequests((prev) =>
        prev.filter((item) => item.id !== request.id)
      );

      addToast(
        `Approved ${request.user || 'user'} for ${request.workspaceName}!`,
        'success'
      );
    } catch (err) {
      addToast(
        err.message || 'Failed to approve request.',
        'error'
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleReject(request) {
    if (!accessToken) return;

    try {
      setProcessingRequestId(request.id);

      await rejectJoinRequest(
        accessToken,
        request.workspaceId,
        request.id
      );

      setJoinRequests((prev) =>
        prev.filter((item) => item.id !== request.id)
      );

      addToast(
        `Rejected join request for ${request.workspaceName}.`,
        'info'
      );
    } catch (err) {
      addToast(
        err.message || 'Failed to reject request.',
        'error'
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  return (
    <main className="home-page">

      {/* Welcome Header */}
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="home-eyebrow">
            <SparklesIcon size={14} />
            Workspace Dashboard
          </span>

          <h1>
            Welcome back, {user?.username}
          </h1>

          <p className="home-subtitle">
            Manage your study groups, organize course
            materials, and collaborate in real-time.
          </p>
        </div>

        <div className="home-hero-actions">
          <Link
            to="/app/workspaces"
            className="home-primary-action"
          >
            <PlusIcon size={16} />
            New Workspace
          </Link>
        </div>
      </section>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger-text)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              display: 'flex',
              padding: '2px',
            }}
            aria-label="Dismiss error"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Pending Join Requests */}
      <section className="home-section home-requests-section">
        <div className="home-section-header">
          <div className="home-section-title">
            <h2>Pending Join Requests</h2>

            {joinRequests.length > 0 && (
              <span className="section-badge">
                {joinRequests.length} action required
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="home-empty-state">
            <span className="spinner" />
            Loading join requests...
          </div>
        ) : joinRequests.length === 0 ? (
          <div className="home-empty-state">
            <CheckIcon size={28} />

            <p>
              You have no pending join requests to review.
              All caught up.
            </p>
          </div>
        ) : (
          <div className="requests-grid">
            {joinRequests.map((request) => (
              <div
                key={request.id}
                className="request-card"
              >
                <div className="request-card-info">
                  <div className="request-avatar">
                    {(request.user || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="request-details">
                    <span className="request-user">
                      @{request.user}
                    </span>

                    <span className="request-workspace">
                      Requested to join{' '}
                      <strong>
                        {request.workspaceName}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="request-actions">
                  <button
                    type="button"
                    className="btn-approve"
                    onClick={() =>
                      handleApprove(request)
                    }
                    disabled={
                      processingRequestId === request.id
                    }
                  >
                    <CheckIcon size={14} />
                    Approve
                  </button>

                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() =>
                      handleReject(request)
                    }
                    disabled={
                      processingRequestId === request.id
                    }
                  >
                    <CloseIcon size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="home-section home-activity-section">
        <div className="home-section-header">
          <div className="home-section-title">
            <h2>Recent Activity</h2>
          </div>

          <Link
            to="/app/workspaces"
            className="home-section-link"
          >
            View All
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="home-empty-state">
            <span className="spinner" />
            Loading activity...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="home-empty-state">
            <WorkspacesIcon size={28} />

            <p>
              You haven't joined any workspaces yet.
            </p>

            <Link
              to="/app/discover"
              className="home-discover-link"
            >
              <DiscoverIcon size={15} />
              Discover study groups
            </Link>
          </div>
        ) : (
          <div className="activity-list">
            {workspaces.slice(0, 5).map((workspace) => (
              <Link
                key={workspace.id}
                to={`/app/workspaces/${workspace.id}`}
                className="activity-item"
              >
                <div className="activity-icon">
                  <WorkspacesIcon size={16} />
                </div>

                <div className="activity-content">
                  <span className="activity-label">
                    Workspace
                  </span>

                  <strong className="activity-name">
                    {workspace.name}
                  </strong>

                  <span className="activity-description">
                    {workspace.description ||
                      'No description provided.'}
                  </span>
                </div>

                <div className="activity-action">
                  <span>
                    Open
                  </span>
                  <ArrowRightIcon size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}

export default AppHome;