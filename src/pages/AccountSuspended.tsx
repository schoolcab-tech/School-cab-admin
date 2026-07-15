import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AccountSuspended() {
  const { signOut, isSuspended } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is not suspended, redirect to home
    if (!isSuspended) {
      navigate('/');
    }
  }, [isSuspended, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription className="mt-2">
            Your account has been temporarily suspended by the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium mb-2">Access Restricted</p>
            <p>
              You no longer have access to the admin panel. If you believe this
              is an error, please contact the master administrator for assistance.
            </p>
          </div>
          <Button
            onClick={handleSignOut}
            className="w-full"
            variant="outline"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
