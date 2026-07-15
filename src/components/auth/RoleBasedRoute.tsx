import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

type RoleBasedRouteProps = {
  children: ReactNode;
  allowedRoles: UserRole[];
};

export const RoleBasedRoute = ({ children, allowedRoles }: RoleBasedRouteProps) => {
  const location = useLocation();
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to suspended page if account is suspended
  if (isSuspended && location.pathname !== '/account-suspended') {
    return <Navigate to="/account-suspended" replace />;
  }

  // Check if user's role is in the allowed roles list
  if (userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
