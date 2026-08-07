import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from './createClient'

import AdminAppointmentDashboard from './components/AdminAppointmentDashboard'
import Home from './pages/Home'
import About from './pages/About'
import Report from './pages/Report'
import Admin from './pages/Admin'
import Borrow from './pages/Borrow'
import Appointment from './pages/appointment'
import CheckUp from './pages/CheckUp'
import LoginPage from './pages/login'
import RegisterAdmin from './pages/register-admin'
import AdminNavbar from './components/adminNavbar'
import HazardReport from './pages/HazardReport'
import UserHazardmap from './pages/Hazardmap'
import Settings from './pages/Settings'
import ReportedIncident from './pages/incidentReported'
import BorrowedVehicles from './pages/borrowedVehicles'
import TrackAppointment from './pages/trackAppointment'
import CheckUpTable from './pages/checkUpTable'
import CreateUser from './pages/CreateUser'
import UserApproval from './pages/userApproval'
import background from './Images/background.png'
import AdminHazardMap from './pages/AdminHazardMap'
import GuestNavbar from './components/GuestNavbar'
import Guest from './pages/Guest'
import MonthlyIncidentTrends from './pages/MonthlyIncidentTrends'
import Profile from './pages/Profile'
import AuthCallback from './pages/AuthCallback'
import CreateUserForOauth from './components/CreateUserForOauth'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLoginRedirect from './components/AdminLoginRedirect'
import StaffNavbar from './components/StaffNavbar'
import StaffHome from './pages/StaffHome'
import StaffInventory from './pages/StaffInventory'
import DynamicNavbar from './components/dynamicNavbar'
import EditProfile from './pages/editProfile'

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const path = location.pathname;
        if (!path.startsWith('/auth/callback') && !path.startsWith('/register/oauth')) {
          navigate('/auth/callback', { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  // ===== Navbar decision (fixed) =====
  const isAdminLoginPath =
    path === '/admin' || path === '/admin/' || path === '/admin/register-admin';
  const isAuthPath =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/auth/callback') ||
    isAdminLoginPath;
  const isAdminPath = path.startsWith('/admin/') && !isAdminLoginPath;
  const isStaffPath = path.startsWith('/staff/');
  const isGuestPath = path === '/' || path.startsWith('/guest/');

  const renderNavbar = () => {
    if (isAuthPath) return null;          // login/register/callback → no navbar
    if (isAdminPath) return <AdminNavbar />;
    if (isStaffPath) return <StaffNavbar />;
    if (isGuestPath) return <GuestNavbar />;
    return <DynamicNavbar />;             // user area → role-aware navbar
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${background})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        minHeight: '100vh',
        maxHeight: '100vh',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {renderNavbar()}

      <div className="content pt-20">
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/" element={<Guest />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<CreateUser />} />
          <Route path="/register/oauth" element={<CreateUserForOauth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* ===== ADMIN LOGIN ROUTES ===== */}
          <Route path="/admin" element={<AdminLoginRedirect />} />
          <Route path="/admin/" element={<AdminLoginRedirect />} />
          <Route path="/admin/register-admin" element={<RegisterAdmin />} />

          {/* ===== GUEST ROUTES ===== */}
          <Route path="/guest/hazardmap" element={<UserHazardmap />} />
          <Route path="/guest/yearly-incident-trends" element={<MonthlyIncidentTrends />} />

          {/* ===== PROTECTED USER ROUTES ===== */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/track" element={<ProtectedRoute><TrackAppointment /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/hazard-report" element={<ProtectedRoute><HazardReport /></ProtectedRoute>} />
          <Route path="/borrow" element={<ProtectedRoute><Borrow /></ProtectedRoute>} />
          <Route path="/appointment" element={<ProtectedRoute><Appointment /></ProtectedRoute>} />
          <Route path="/checkup" element={<ProtectedRoute><CheckUp /></ProtectedRoute>} />
          <Route path="/hazardmap" element={<ProtectedRoute><UserHazardmap /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/yearly-incident-trends" element={<ProtectedRoute><MonthlyIncidentTrends /></ProtectedRoute>} />

          {/* ===== PROTECTED ADMIN ROUTES ===== */}
          <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
          <Route path="/admin/hazard-map" element={<ProtectedRoute adminOnly={true}><AdminHazardMap /></ProtectedRoute>} />
          <Route path="/admin/pending-account" element={<ProtectedRoute adminOnly={true}><UserApproval /></ProtectedRoute>} />
          <Route path="/admin/report" element={<ProtectedRoute adminOnly={true}><ReportedIncident /></ProtectedRoute>} />
          <Route path="/admin/borrow" element={<ProtectedRoute adminOnly={true}><BorrowedVehicles /></ProtectedRoute>} />
          <Route path="/admin/appointment" element={<ProtectedRoute adminOnly={true}><AdminAppointmentDashboard /></ProtectedRoute>} />
          <Route path="/admin/checkup" element={<ProtectedRoute adminOnly={true}><CheckUpTable /></ProtectedRoute>} />

          {/* ===== PROTECTED STAFF ROUTES ===== */}
          <Route path="/staff/dashboard" element={<ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>} />
          <Route path="/staff/borrow" element={<ProtectedRoute staffOnly={true}><Borrow /></ProtectedRoute>} />
          <Route path="/staff/checkup" element={<ProtectedRoute staffOnly={true}><CheckUp /></ProtectedRoute>} />
          <Route path="/staff/inventory" element={<ProtectedRoute staffOnly={true}><StaffInventory /></ProtectedRoute>} />
          <Route path="/staff/borrower-slip" element={<ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>} />
          <Route path="/staff/settings" element={<ProtectedRoute staffOnly={true}><Settings /></ProtectedRoute>} />
          <Route path="/staff/profile" element={<ProtectedRoute staffOnly={true}><Profile /></ProtectedRoute>} />
          <Route path="/staff/notification" element={<ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>} />

          {/* ===== EXTRA ROUTES USED BY NAVBARS (placeholders — swap real pages later) ===== */}
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly={true}><Settings /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute adminOnly={true}><Profile /></ProtectedRoute>} />
          <Route path="/admin/notification" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
          <Route path="/notification" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* ===== CATCH-ALLS ===== */}
          <Route path="/admin/*" element={<Navigate to="/admin" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App