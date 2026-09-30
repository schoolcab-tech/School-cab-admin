import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  isSubAdmin: boolean;
  /** New: school sub-admin role (one per school) */
  isSchoolAdmin: boolean;
  isModerator: boolean;
  /** Moderators row id when role is moderator */
  moderatorId: number | null;
  /** The school this user is bound to (school_admins.school_id). Null for non-school-admins. */
  linkedSchoolId: number | null;
  userRole: UserRole | null;
  isSuspended: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [isSchoolAdmin, setIsSchoolAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorId, setModeratorId] = useState<number | null>(null);
  const [linkedSchoolId, setLinkedSchoolId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    console.log('AuthProvider: Starting auth initialization');
    let isMounted = true;
    let isInitializing = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          throw error;
        }

        console.log('AuthProvider: Initial session:', session ? 'exists' : 'none');

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            console.log('AuthProvider: Checking user role');
            await checkUserRole(session.user.id);
          } else {
            console.log('AuthProvider: No user session, resetting admin states');
            setIsAdmin(false);
            setIsMasterAdmin(false);
            setIsSubAdmin(false);
            setIsSchoolAdmin(false);
            setIsModerator(false);
            setModeratorId(null);
            setLinkedSchoolId(null);
            setUserRole(null);
            setIsSuspended(false);
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error in auth initialization:', error);
        // Reset states on error
        if (isMounted) {
          setIsAdmin(false);
          setIsMasterAdmin(false);
          setIsSubAdmin(false);
          setIsModerator(false);
          setModeratorId(null);
          setUserRole(null);
          setIsSuspended(false);
        }
      } finally {
        if (isMounted) {
          console.log('AuthProvider: Initial auth check complete, setting loading to false');
          setLoading(false);
          isInitializing = false;
        }
      }
    };

    // Set up auth state change listener
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: Auth state changed - ${event}`, { hasSession: !!session });

      // Skip auth state changes during initial load to avoid race conditions
      if (isInitializing || !isMounted) {
        console.log('AuthProvider: Skipping auth state change during initialization');
        return;
      }

      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('AuthProvider: User authenticated, checking role');
          await checkUserRole(session.user.id);
        } else {
          console.log('AuthProvider: No user, resetting admin states');
          setIsAdmin(false);
          setIsMasterAdmin(false);
          setIsSubAdmin(false);
          setIsSchoolAdmin(false);
          setIsModerator(false);
          setModeratorId(null);
          setLinkedSchoolId(null);
          setUserRole(null);
          setIsSuspended(false);
        }
      } catch (error) {
        console.error('AuthProvider: Error in auth state change:', error);
      }
    });

    subscription = data.subscription;
    initializeAuth();

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const checkUserRole = async (userId: string) => {
    if (!userId) {
      console.log('checkUserRole: No user ID provided');
      setIsAdmin(false);
      setIsMasterAdmin(false);
      setIsSubAdmin(false);
      setUserRole(null);
      setIsSuspended(false);
      return;
    }

    try {
      console.log(`checkUserRole: Checking role for user ${userId}`);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('checkUserRole: Error fetching user role:', error);
        setIsAdmin(false);
        setIsMasterAdmin(false);
        setIsSubAdmin(false);
        setUserRole(null);
        setIsSuspended(false);
        return;
      }

      console.log(`checkUserRole: Retrieved role for user ${userId}:`, data?.role);
      // Cast to string for comparison since 'school_admin' may not yet be in generated enum types
      const role = data?.role as UserRole;
      const roleStr = role as unknown as string;
      setUserRole(role);

      // Set admin flags based on role
      const isUserMasterAdmin = roleStr === 'master_admin';
      const isUserSubAdmin = roleStr === 'sub_admin';
      const isUserSchoolAdmin = roleStr === 'school_admin';
      const isUserModerator = roleStr === 'moderator';
      // `isAdmin` is the broad "has admin-style access" flag — includes all elevated roles
      const isUserAdmin =
        roleStr === 'admin' ||
        isUserMasterAdmin ||
        isUserSubAdmin ||
        isUserSchoolAdmin ||
        isUserModerator;

      // Check suspension and resolve linked school
      let suspended = false;
      let schoolId: number | null = null;
      let modId: number | null = null;

      if (isUserSubAdmin) {
        console.log(`checkUserRole: Checking suspension status for fleet-owner sub-admin ${userId}`);
        const { data: fleetOwner, error: ownerError } = await supabase
          .from('fleet_owners')
          .select('is_active')
          .eq('user_id', userId)
          .single();

        if (ownerError) {
          console.error('checkUserRole: Error fetching fleet owner status:', ownerError);
          suspended = true;
        } else {
          suspended = !fleetOwner?.is_active;
        }
      } else if (isUserSchoolAdmin) {
        console.log(`checkUserRole: Checking suspension status for school admin ${userId}`);
        const { data: schoolAdmin, error: schoolAdminError } = await (supabase as any)
          .from('school_admins')
          .select('is_active, school_id')
          .eq('user_id', userId)
          .single();

        if (schoolAdminError) {
          console.error('checkUserRole: Error fetching school admin status:', schoolAdminError);
          suspended = true;
        } else {
          suspended = !schoolAdmin?.is_active;
          schoolId = schoolAdmin?.school_id ?? null;
        }
      } else if (isUserModerator) {
        console.log(`checkUserRole: Checking suspension status for moderator ${userId}`);
        const { data: moderator, error: moderatorError } = await (supabase as any)
          .from('moderators')
          .select('is_active, moderator_id')
          .eq('user_id', userId)
          .single();

        if (moderatorError) {
          console.error('checkUserRole: Error fetching moderator status:', moderatorError);
          suspended = true;
        } else {
          suspended = !moderator?.is_active;
          modId = moderator?.moderator_id ?? null;
        }
      } else if (isUserMasterAdmin || roleStr === 'admin') {
        const { data: platformAdmin } = await (supabase as any)
          .from('platform_admins')
          .select('is_active')
          .eq('user_id', userId)
          .maybeSingle();

        if (platformAdmin && !platformAdmin.is_active) {
          suspended = true;
        }
      }

      setIsAdmin(isUserAdmin);
      setIsMasterAdmin(isUserMasterAdmin);
      setIsSubAdmin(isUserSubAdmin);
      setIsSchoolAdmin(isUserSchoolAdmin);
      setIsModerator(isUserModerator);
      setModeratorId(modId);
      setLinkedSchoolId(schoolId);
      setIsSuspended(suspended);

      // If user is suspended, sign them out
      if (suspended) {
        console.log(`checkUserRole: User ${userId} is suspended, signing out`);
        await supabase.auth.signOut();
        setIsAdmin(false);
        setIsMasterAdmin(false);
        setIsSubAdmin(false);
        setIsSchoolAdmin(false);
        setIsModerator(false);
        setModeratorId(null);
        setLinkedSchoolId(null);
        setUserRole(null);
        return;
      }

      console.log(`checkUserRole: User ${userId} role:`, {
        role,
        isAdmin: isUserAdmin,
        isMasterAdmin: isUserMasterAdmin,
        isSubAdmin: isUserSubAdmin,
        isSchoolAdmin: isUserSchoolAdmin,
        isModerator: isUserModerator,
        moderatorId: modId,
        linkedSchoolId: schoolId,
        isSuspended: suspended,
      });
    } catch (error) {
      console.error('checkUserRole: Unexpected error:', error);
      setIsAdmin(false);
      setIsMasterAdmin(false);
      setIsSubAdmin(false);
      setIsSchoolAdmin(false);
      setIsModerator(false);
      setModeratorId(null);
      setLinkedSchoolId(null);
      setUserRole(null);
      setIsSuspended(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      // AuthSessionMissingError (or any 403 from /logout) means the server-side
      // session is already gone. That's effectively "already logged out" — just
      // clear local state and treat as success rather than throwing.
      if (error) {
        const msg = (error as any)?.message ?? '';
        const status = (error as any)?.status;
        const isSessionMissing =
          (error as any)?.name === 'AuthSessionMissingError' ||
          status === 403 ||
          /session.*missing|not.*authenticated/i.test(msg);
        if (!isSessionMissing) throw error;
        console.warn('signOut: session already missing on server, clearing local state.');
        // Belt and suspenders: clear any cached supabase auth storage entries.
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // ignore
        }
      }
      // Always clear local auth state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsMasterAdmin(false);
      setIsSubAdmin(false);
      setIsSchoolAdmin(false);
      setIsModerator(false);
      setModeratorId(null);
      setLinkedSchoolId(null);
      setUserRole(null);
      setIsSuspended(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isMasterAdmin,
    isSubAdmin,
    isSchoolAdmin,
    isModerator,
    moderatorId,
    linkedSchoolId,
    userRole,
    isSuspended,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
