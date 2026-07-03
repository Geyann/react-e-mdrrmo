import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import Adminlogin from '../pages/adminlogin';

export default function AdminLoginRedirect() {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in — show the login page
        setChecking(false);
        return;
      }

      // Has a session — check if they're an admin
      let isAdmin = false;

      // Check admin_users table
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle();

      if (adminData) isAdmin = true;

      // Check profiles table
      if (!isAdmin) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (profileData) isAdmin = true;
      }

      // Check pending_registrations
      if (!isAdmin) {
        const { data: regData } = await supabase
          .from('pending_registrations')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (regData && regData.role === 'admin') isAdmin = true;
      }

      if (isAdmin) {
        // Already logged in as admin — go straight to dashboard
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Has a session but not an admin — sign them out and show login
        await supabase.auth.signOut();
        setChecking(false);
      }
    };

    checkSession();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Checking session...</p>
        </div>
      </div>
    );
  }

  return <Adminlogin />;
}