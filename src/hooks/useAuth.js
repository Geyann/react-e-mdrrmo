import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../createClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // Will hold our unified user object
  const [loading, setLoading] = useState(true);

  const resolveUser = useCallback(async (authSession) => {
    // 1. Handle Staff/Admin from localStorage FIRST (as they don't have a Supabase Auth session)
    const storedStaff = localStorage.getItem('currentStaff');
    if (storedStaff) {
      const staffData = JSON.parse(storedStaff);
      if (staffData?.id && staffData?.role) {
        setUser({ ...staffData, type: 'staff_or_admin' });
        setLoading(false);
        return;
      }
    }

    // 2. Handle Supabase Auth user (Resident)
    if (!authSession?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const authUser = authSession.user;
    // Fetch the associated profile to get role and other details
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      // This is a user with an auth account but no profile, maybe pending approval
      setUser({ ...authUser, role: 'pending', type: 'supabase' });
    } else if (profile.is_active === false) {
        setUser({ ...profile, ...authUser, role: 'inactive', type: 'supabase' });
    } else {
      // Standard resident user
      setUser({ ...profile, ...authUser, type: 'supabase' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      await resolveUser(session);
    };
    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // We must clear the custom staff session if a Supabase auth event happens
      localStorage.removeItem('currentStaff');
      setSession(session);
      await resolveUser(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [resolveUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentStaff');
    localStorage.removeItem('currentUser');
    setUser(null);
    setSession(null);
  };

  const value = { user, session, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};