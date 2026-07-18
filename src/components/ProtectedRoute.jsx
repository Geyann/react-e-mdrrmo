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
        // 1. Check localStorage for regular user login
        const storedUser = localStorage.getItem('currentUser');
        let parsedUser = null;
        
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch {
            parsedUser = storedUser;
          }
        }

        // 2. Check localStorage for staff/admin login (manual auth with hashed password)
        const storedStaff = localStorage.getItem('currentStaff');
        let parsedStaff = null;

        if (storedStaff) {
          try {
            parsedStaff = JSON.parse(storedStaff);
          } catch {
            parsedStaff = storedStaff;
          }
        }

        // 3. No authentication found at all
        if (!parsedUser && !parsedStaff) {
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

        // ==================================================================
        // REGULAR USER FLOW (manual login via localStorage 'currentUser')
        // ==================================================================
        if (parsedUser && !parsedStaff) {
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

        // ==================================================================
        // STAFF/ADMIN FLOW (manual login via localStorage 'currentStaff')
        // ==================================================================
        if (parsedStaff) {
          const staffRole = parsedStaff.role;
          const isActive = parsedStaff.is_active;

          // Check if account is deactivated
          if (isActive === false) {
            localStorage.removeItem('currentStaff');
            setAuthorized(false);
            setLoading(false);
            navigate('/admin/login', { 
              replace: true,
              state: { error: 'Your account has been deactivated.' }
            });
            return;
          }

          // ACCESS CHECK: For admin-only routes
          if (adminOnly) {
            if (staffRole !== 'admin') {
              setAuthorized(false);
              setLoading(false);
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Access denied. Admins only.' }
              });
              return;
            }
            // ✅ Admin accessing admin route
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // ACCESS CHECK: For staff-only routes (admins can also access staff routes)
          if (staffOnly) {
            if (staffRole !== 'staff' && staffRole !== 'admin') {
              setAuthorized(false);
              setLoading(false);
              navigate('/admin/login', { 
                replace: true,
                state: { error: 'Access denied. Staff area only.' }
              });
              return;
            }
            // ✅ Staff/Admin accessing staff route
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // ✅ Staff/Admin accessing a route that accepts both staff AND admin
          // (Like a generic protected route with no specific role requirement)
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // ==================================================================
        // BOTH exist — edge case (regular user AND staff logged in)
        // For user routes, prefer the regular user
        // ==================================================================
        if (parsedUser && parsedStaff) {
          if (!adminOnly && !staffOnly) {
            // User route — prefer regular user
            setAuthorized(true);
            setLoading(false);
            return;
          }
          
          // Staff/Admin route — use staff role
          const staffRole = parsedStaff.role;
          
          if (adminOnly && staffRole !== 'admin') {
            setAuthorized(false);
            setLoading(false);
            navigate('/admin/login', { 
              replace: true,
              state: { error: 'Access denied. Admins only.' }
            });
            return;
          }

          if (staffOnly && staffRole !== 'staff' && staffRole !== 'admin') {
            setAuthorized(false);
            setLoading(false);
            navigate('/admin/login', { 
              replace: true,
              state: { error: 'Access denied.' }
            });
            return;
          }

          setAuthorized(true);
          setLoading(false);
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