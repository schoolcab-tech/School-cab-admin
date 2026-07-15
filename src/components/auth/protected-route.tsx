import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

type ProtectedRouteProps = {
  children: ReactNode;
  requireAdmin?: boolean;
};

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, loading, isAdmin, isSuspended } = useAuth();

  useEffect(() => {
    console.log('ProtectedRoute:', {
      loading,
      user: user ? 'authenticated' : 'not authenticated',
      isAdmin,
      isSuspended,
      requireAdmin,
      path: location.pathname
    });
  }, [loading, user, isAdmin, isSuspended, requireAdmin, location.pathname]);

  // Show loading state
  if (loading) {
    console.log('ProtectedRoute: Loading authentication state...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to suspended page if account is suspended
  if (isSuspended && location.pathname !== '/account-suspended') {
    console.log('ProtectedRoute: User is suspended, redirecting to account-suspended');
    return <Navigate to="/account-suspended" replace />;
  }

  // Check admin access if required
  if (requireAdmin && !isAdmin) {
    console.log('ProtectedRoute: Admin access required, redirecting to unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('ProtectedRoute: Access granted');
  return <>{children}</>;
};
