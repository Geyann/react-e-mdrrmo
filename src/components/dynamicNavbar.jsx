import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../createClient';
import Navbar from './navbar';
import AdminNavbar from './adminNavbar';
import StaffNavbar from './StaffNavbar';  // Make sure this matches your file name exactly
import GuestNavbar from './GuestNavbar';

export default function DynamicNavbar() {
  const location = useLocation();
  const path = location.pathname;
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectRole = async () => {
      // 1. Public/auth pages — no navbar needed
      if (
        path === '/admin' ||
        path === '/admin/' ||
        path === '/admin/register-admin' ||
        path === '/register' ||
        path === '/login' ||
        path === '/login/' ||
        path === '/auth/callback'
        
      ) {
        setUserRole('none');
        setLoading(false);
        return;
      }

      // 2. Check localStorage for regular user
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUserRole('user');
        setLoading(false);
        return;
      }

      // 3. Check Supabase session for staff/admin
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const userId = session.user.id;

        // Check staff_users first
        const { data: staffData } = await supabase
          .from('staff_users')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (staffData) {
          setUserRole(staffData.role); // 'staff' or 'admin'
          setLoading(false);
          return;
        }

        // Check admin_users
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle();

        if (adminData) {
          setUserRole('admin');
          setLoading(false);
          return;
        }

        // Check profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profileData?.role === 'admin' || profileData?.role === 'staff') {
          setUserRole(profileData.role);
          setLoading(false);
          return;
        }
      }

      // 4. Guest routes
      if (path.includes('/guest/') || path === '/') {
        setUserRole('guest');
        setLoading(false);
        return;
      }

      // 5. Default to guest
      setUserRole('guest');
      setLoading(false);
    };

    detectRole();
  }, [path]);

  if (loading) return null;

  // Render the correct navbar based on role
  if (userRole === 'none') return null;
  if (userRole === 'user') return <Navbar />;
  if (userRole === 'admin') return <AdminNavbar />;
  if (userRole === 'staff') return <StaffNavbar />;
  return <GuestNavbar />;
}