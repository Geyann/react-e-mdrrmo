import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../createClient';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        navigate(adminOnly ? '/admin' : '/login', { 
          replace: true,
          state: { error: 'Please log in first.' }
        });
        return;
      }

      const userId = session.user.id;

      if (adminOnly) {
        // --- ADMIN CHECK ---
        let isAdmin = false;

        // Check admin_users table
        const { data: adminData, error: adminErr } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle();

        if (!adminErr && adminData) isAdmin = true;

        // Check profiles table
        if (!isAdmin) {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .eq('role', 'admin')
            .maybeSingle();

          if (!profileErr && profileData) isAdmin = true;
        }

        // Check pending_registrations
        if (!isAdmin) {
          const { data: regData, error: regErr } = await supabase
            .from('pending_registrations')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

          if (!regErr && regData && regData.role === 'admin') isAdmin = true;
        }

        if (!isAdmin) {
          setAuthorized(false);
          setLoading(false);
          await supabase.auth.signOut();
          navigate('/admin', { 
            replace: true,
            state: { error: 'Access denied. Admins only.' }
          });
          return;
        }
      } else {
        // --- REGULAR USER CHECK ---
        const { data: registration, error: regError } = await supabase
          .from('pending_registrations')
          .select('status')
          .eq('id', userId)
          .maybeSingle();

        if (regError) {
          console.error('Error checking registration:', regError);
        }

        if (!registration) {
          setAuthorized(false);
          setLoading(false);
          await supabase.auth.signOut();
          navigate('/login', { 
            replace: true,
            state: { error: 'Account not found. Please register first.' }
          });
          return;
        }

        if (registration.status === 'pending') {
          setAuthorized(false);
          setLoading(false);
          await supabase.auth.signOut();
          navigate('/login', { 
            replace: true,
            state: { error: 'Your account is pending admin approval.' }
          });
          return;
        }

        if (registration.status === 'rejected') {
          setAuthorized(false);
          setLoading(false);
          await supabase.auth.signOut();
          navigate('/login', { 
            replace: true,
            state: { error: 'Your registration was rejected.' }
          });
          return;
        }

        // Also make sure this user is NOT an admin trying to access user routes
        const { data: adminCheck } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle();

        if (adminCheck) {
          setAuthorized(false);
          setLoading(false);
          await supabase.auth.signOut();
          navigate('/admin', { 
            replace: true,
            state: { error: 'Admins must use the Admin Portal.' }
          });
          return;
        }
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, adminOnly, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return children;
}