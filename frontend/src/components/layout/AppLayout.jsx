import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  HomeIcon,
  WorkspacesIcon,
  DiscoverIcon,
  MessagesIcon,
  LogOutIcon,
} from '../common/Icons';
import '../../styles/layout/app-layout.css';

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
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

          <NavLink
            to="/app/messages"
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <MessagesIcon size={19} />
            </span>
            <span>Study Rooms</span>
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