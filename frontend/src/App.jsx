import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { ToastProvider } from './components/common/ToastContext';

import Login from './pages/Login';
import Register from './pages/Register';
import AppHome from './pages/AppHome';
import Workspaces from './pages/Workspaces';
import Discover from './pages/Discover';
import Messages from './pages/Messages';
import WorkspaceDetail from './pages/WorkspaceDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import './styles/global.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password/:uid/:token"
            element={<ResetPassword />}
          />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<AppHome />} />
              <Route path="workspaces" element={<Workspaces />} />
              <Route path="workspaces/:id" element={<WorkspaceDetail />} />
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
    </ToastProvider>
  );
}

export default App;
