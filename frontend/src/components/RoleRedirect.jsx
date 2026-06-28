import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleRedirects } from '../utils/auth';

export default function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login?portal=citizen" replace />;
  return <Navigate to={roleRedirects[user.role] || '/'} replace />;
}

export function WorkerGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login?portal=worker" replace />;
  if (!['worker', 'supervisor', 'admin'].includes(user.role)) return <Navigate to="/login?portal=worker" replace />;
  return children;
}

export function AuthorityGuard({ children }) {
  const { user, loading, isAuthority } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user || !isAuthority) return <Navigate to="/login?portal=authority" replace />;
  return children;
}
