import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Pages
import Login from './pages/Login';
import DriverDashboard from './pages/driver/Dashboard';
import NewProject from './pages/driver/NewProject';
import ProjectView from './pages/driver/ProjectView';
import AdminDashboard from './pages/admin/Dashboard';
import PlanView from './pages/admin/PlanView';
import ModifyPlan from './pages/admin/ModifyPlan';

// Protected Route component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={
        user ? (
          <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/driver/dashboard'} replace />
        ) : (
          <Login />
        )
      } />

      {/* Driver routes */}
      <Route path="/driver/dashboard" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverDashboard />
        </ProtectedRoute>
      } />
      <Route path="/driver/new-project" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <NewProject />
        </ProtectedRoute>
      } />
      <Route path="/driver/project/:id" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <ProjectView />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/plan/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <PlanView />
        </ProtectedRoute>
      } />
      <Route path="/admin/modify/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ModifyPlan />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
