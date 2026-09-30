import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Component that redirects users to their role-specific dashboard
 * Used for the base "/" route to ensure proper role-based navigation
 */
export const RoleBasedRedirect = () => {
  const { user, loading, userRole, isSuspended } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to suspended page if account is suspended
  if (isSuspended) {
    return <Navigate to="/account-suspended" replace />;
  }

  // Redirect based on user role
  switch (userRole as string) {
    case 'sub_admin':
      return <Navigate to="/sub-admin/dashboard" replace />;
    case 'school_admin':
      return <Navigate to="/school-admin/dashboard" replace />;
    case 'moderator':
      return <Navigate to="/moderator/dashboard" replace />;
    case 'master_admin':
    case 'admin':
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};
