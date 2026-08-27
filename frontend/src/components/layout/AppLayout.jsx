import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <aside>
        <h2>StudyGram</h2>

        <nav>
          <NavLink to="/app" end>
            Home
          </NavLink>

          <NavLink to="/app/workspaces">
            Workspaces
          </NavLink>

          <NavLink to="/app/discover">
            Discover
          </NavLink>

          <NavLink to="/app/messages">
            Messages
          </NavLink>
        </nav>

        <div>
          <p>{user?.username}</p>

          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout