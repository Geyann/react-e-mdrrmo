import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
    const detectRole = () => {
      // 1. Auth / login / admin-login pages → no navbar
      if (
        path === '/admin' || path === '/admin/' ||
        path.startsWith('/admin/register') ||
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/auth/callback')
      ) {
        setUserRole('none');
        setLoading(false);
        return;
      }

      // 2. Admin first (highest priority), then staff
      try {
        const storedStaff = localStorage.getItem('currentStaff');
        if (storedStaff) {
          const parsedStaff = JSON.parse(storedStaff);
          if (parsedStaff?.role === 'admin') {
            setUserRole('admin');
            setLoading(false);
            return;
          }
          if (parsedStaff?.role === 'staff') {
            setUserRole('staff');
            setLoading(false);
            return;
          }
        }
      } catch {
        // invalid JSON — ignore
      }

      // 3. Regular user
      if (localStorage.getItem('currentUser')) {
        setUserRole('user');
        setLoading(false);
        return;
      }

      // 4. Fallback → guest
      setUserRole('guest');
      setLoading(false);
    };

    detectRole();
  }, [path]);

  if (loading) return null;

  switch (userRole) {
    case 'none': return null;
    case 'admin': return <AdminNavbar />;
    case 'staff': return <StaffNavbar />;
    case 'user': return <Navbar />;
    default: return <GuestNavbar />;
  }
}