import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../createClient';
import Navbar from './navbar';
import AdminNavbar from './adminNavbar';
import StaffNavbar from './StaffNavbar';
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
        path === '/admin/login' ||
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

      // 2. Check localStorage for staff/admin (priority — highest role)
      const storedStaff = localStorage.getItem('currentStaff');
      if (storedStaff) {
        try {
          const parsedStaff = JSON.parse(storedStaff);
          if (parsedStaff.role === 'admin') {
            setUserRole('admin');
            setLoading(false);
            return;
          }
          if (parsedStaff.role === 'staff') {
            setUserRole('staff');
            setLoading(false);
            return;
          }
        } catch {
          // Invalid JSON, ignore
        }
      }

      // 3. Check localStorage for regular user
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUserRole('user');
        setLoading(false);
        return;
      }

      // 4. Guest routes
      if (path === '/' || path.startsWith('/guest/') || path === '/guest/hazardmap' || path === '/guest/yearly-incident-trends') {
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
  if (userRole === 'admin') return <AdminNavbar />;
  if (userRole === 'staff') return <StaffNavbar />;
  if (userRole === 'user') return <Navbar />;
  return <GuestNavbar />;
}