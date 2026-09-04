import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/AuthContext'

import '../../styles/layout/app-layout.css'


function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()


  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }


  return (
    <div className="app-layout">

      <aside className="app-sidebar">

        {/* Brand */}

        <div className="sidebar-brand">
          <h2>StudyGram</h2>
        </div>


        {/* Navigation */}

        <nav className="sidebar-nav">

          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="sidebar-link-icon">
              ⌂
            </span>

            <span>Home</span>
          </NavLink>


          <NavLink
            to="/app/workspaces"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="sidebar-link-icon">
              ▦
            </span>

            <span>Workspaces</span>
          </NavLink>


          <NavLink
            to="/app/discover"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="sidebar-link-icon">
              ◇
            </span>

            <span>Discover</span>
          </NavLink>


          <NavLink
            to="/app/messages"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="sidebar-link-icon">
              ▱
            </span>

            <span>Messages</span>
          </NavLink>

        </nav>


        {/* Account */}

        <div className="sidebar-account">

          <div className="account-info">

            <div className="account-avatar">
              {user?.username
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div className="account-details">

              <span className="account-name">
                {user?.username}
              </span>

              <span className="account-label">
                Account
              </span>

            </div>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </aside>


      {/* Page content */}

      <main className="app-content">
        <Outlet />
      </main>

    </div>
  )
}


export default AppLayout