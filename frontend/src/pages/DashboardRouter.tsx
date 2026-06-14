import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DashboardRouter() {
  const { role, loading, requiresPasswordChange } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (requiresPasswordChange) return <Navigate to="/change-password" replace />;

  switch (role) {
    case 'student':
      return <Navigate to="/dashboard/student" replace />;
    case 'tutor':
      return <Navigate to="/dashboard/tutor" replace />;
    case 'owner':
      return <Navigate to="/dashboard/tutor" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
