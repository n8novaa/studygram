import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Login from './pages/Login'
import Register from './pages/Register'
import AppHome from './pages/AppHome'
import Workspaces from './pages/Workspaces'
import Discover from './pages/discover'
import Messages from './pages/Messages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<AppHome />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="discover" element={<Discover />} />
            <Route path="messages" element={<Messages />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App