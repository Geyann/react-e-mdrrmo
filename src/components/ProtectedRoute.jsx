import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../createClient';

export default function ProtectedRoute({ children, adminOnly = false, staffOnly = false }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Check localStorage for regular user login (YOUR MANUAL LOGIN)
        const storedUser = localStorage.getItem('currentUser');
        let parsedUser = null;
        
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch {
            parsedUser = storedUser;
          }
        }

        // 2. Check Supabase Auth session (for staff/admin login)
        const { data: { session } } = await supabase.auth.getSession();

        // 3. No authentication found at all
        if (!session && !parsedUser) {
          setAuthorized(false);
          setLoading(false);
          
          if (adminOnly || staffOnly) {
            navigate('/admin/login', { 
              replace: true,
              state: { error: 'Please log in first.' }
            });
          } else {
            navigate('/login', { 
              replace: true,
              state: { error: 'Please log in first.' }
            });
          }
          return;
        }

        // 4. REGULAR USER FLOW (manual login via localStorage)
        if (parsedUser && !session) {
          // Regular user trying to access admin/staff routes? Block them.
          if (adminOnly || staffOnly) {
            localStorage.removeItem('currentUser');
            setAuthorized(false);
            setLoading(false);
            navigate('/login', { 
              replace: true,
              state: { error: 'Access denied. Please use the admin login portal.' }
            });
            return;
          }
          
          // ✅ Regular user accessing regular user routes — ALLOW
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // 5. SUPABASE SESSION EXISTS (staff or admin logged in via Supabase Auth)
        if (session) {
          const userId = session.user.id;
          const userEmail = session.user.email;
          let userRole = null;

          // Check staff_users table
          const { data: staffData } = await supabase
            .from('staff_users')
            .select('role, is_active')
            .eq('user_id', userId)
            .maybeSingle();

          if (staffData) {
            userRole = staffData.role;
            
            if (!staffData.is_active) {
              setAuthorized(false);
              setLoading(false);
              await supabase.auth.signOut();
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Your account has been deactivated.' }
              });
              return;
            }
          }

          // Check admin_users table
          if (!userRole) {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('id')
              .eq('email', userEmail)
              .maybeSingle();

            if (adminData) userRole = 'admin';
          }

          // Check profiles table
          if (!userRole) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .in('role', ['staff', 'admin'])
              .maybeSingle();

            if (profileData) userRole = profileData.role;
          }

          // Check pending_registrations
          if (!userRole) {
            const { data: regData } = await supabase
              .from('pending_registrations')
              .select('role, status')
              .eq('id', userId)
              .maybeSingle();

            if (regData) {
              if (regData.status === 'pending') {
                setAuthorized(false);
                setLoading(false);
                await supabase.auth.signOut();
                navigate('/admin/login', { 
                  replace: true,
                  state: { error: 'Your account is pending admin approval.' }
                });
                return;
              }

              if (regData.status === 'rejected') {
                setAuthorized(false);
                setLoading(false);
                await supabase.auth.signOut();
                navigate('/admin/login', { 
                  replace: true,
                  state: { error: 'Your registration was rejected.' }
                });
                return;
              }

              if (regData.role === 'admin') userRole = 'admin';
            }
          }

          // --- ROLE-BASED ACCESS CONTROL ---

          // For staff/admin routes
          if (adminOnly || staffOnly) {
            if (!userRole) {
              setAuthorized(false);
              setLoading(false);
              await supabase.auth.signOut();
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Access denied. Staff/Admin only.' }
              });
              return;
            }

            if (adminOnly && userRole !== 'admin') {
              setAuthorized(false);
              setLoading(false);
              await supabase.auth.signOut();
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Access denied. Admins only.' }
              });
              return;
            }

            if (staffOnly && userRole !== 'staff' && userRole !== 'admin') {
              setAuthorized(false);
              setLoading(false);
              await supabase.auth.signOut();
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Access denied. Staff area only.' }
              });
              return;
            }

            // ✅ Staff/Admin accessing their route — ALLOW
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // For REGULAR USER routes with a Supabase session
          // If they have a staff/admin role, redirect them to their dashboard
          if (userRole === 'admin') {
            setAuthorized(false);
            setLoading(false);
            navigate('/admin/dashboard', { replace: true });
            return;
          }

          if (userRole === 'staff') {
            setAuthorized(false);
            setLoading(false);
            navigate('/staff/dashboard', { replace: true });
            return;
          }

          // Regular Supabase user (no staff/admin role) accessing user routes
          // Check if they exist in profiles or pending_registrations
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          const { data: userReg } = await supabase
            .from('pending_registrations')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (userProfile || userReg) {
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // No matching record found — but they're authenticated via Supabase
          // Allow them to user routes anyway (they exist in auth.users)
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // 6. EDGE CASE: localStorage user AND Supabase session both exist
        // This can happen if someone used both login methods
        // For user routes, prefer localStorage user
        if (parsedUser && session) {
          if (!adminOnly && !staffOnly) {
            setAuthorized(true);
            setLoading(false);
            return;
          }
          
          // For staff/admin routes, use Supabase session roles
          const userId = session.user.id;
          const { data: staffData } = await supabase
            .from('staff_users')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

          if (staffData && (staffData.role === 'admin' || staffData.role === 'staff')) {
            if (adminOnly && staffData.role !== 'admin') {
              setAuthorized(false);
              setLoading(false);
              navigate('/admin/login', { replace: true, state: { error: 'Access denied.' } });
              return;
            }
            setAuthorized(true);
            setLoading(false);
            return;
          }

          setAuthorized(false);
          setLoading(false);
          navigate('/login', { replace: true, state: { error: 'Please login through the correct portal.' } });
          return;
        }

        // Fallback
        setAuthorized(false);
        setLoading(false);
        navigate('/login', { replace: true });

      } catch (err) {
        console.error('ProtectedRoute error:', err);
        setAuthorized(false);
        setLoading(false);
        navigate('/login', { replace: true });
      }
    };

    checkAuth();
  }, [navigate, adminOnly, staffOnly, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="mt-4 text-purple-200 font-semibold">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return children;
}