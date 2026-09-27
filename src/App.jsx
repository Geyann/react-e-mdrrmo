import {
  useEffect,
} from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./createClient";

import AdminAppointmentDashboard from "./components/AdminAppointmentDashboard";
import Admin from "./components/AdminDashboard";
import AdminNavbar from "./components/adminNavbar";
import AdminLoginRedirect from "./components/AdminLoginRedirect";

import DynamicNavbar from "./components/dynamicNavbar";
import GuestNavbar from "./components/GuestNavbar";

import StaffNavbar from "./components/StaffNavbar";

import { SettingsProvider } from "./pages/SettingsContext";

import About from "./pages/About";
import AdminHazardMap from "./pages/AdminHazardMap";
import AdminInventory from "./pages/AdminInventory";
import Appointment from "./pages/appointment";
import AuthCallback from "./pages/AuthCallback";
import Borrow from "./pages/Borrow";
import BorrowedVehicles from "./pages/borrowedVehicles";
import CheckUp from "./pages/CheckUp";
import CheckUpTable from "./pages/checkUpTable";
import CreateUser from "./pages/CreateUser";
import CreateUserForOauth from "./components/CreateUserForOauth";
import EditProfile from "./pages/editProfile";
import Guest from "./pages/Guest";
import Hazardmap from "./pages/Hazardmap";
import HazardReport from "./pages/HazardReport";
import Home from "./pages/Home";
import IncidentReported from "./pages/incidentReported";
import LoginPage from "./pages/login";
import MonthlyIncidentTrends from "./pages/MonthlyIncidentTrends";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import RegisterAdmin from "./pages/register-admin";
import Report from "./pages/Report";
import Settings from "./pages/Settings";
import StaffBorrowerSlip from "./pages/StaffBorrowerSlip";
import StaffCheckUpQueue from "./pages/StaffCheckUpQueue";
import StaffHome from "./pages/StaffHome";
import StaffInventory from "./pages/StaffInventory";
import TrackAppointment from "./pages/trackAppointment";
import UserApproval from "./pages/userApproval";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  /* ── Supabase authentication listener ───────────────────────── */

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event !== "SIGNED_IN" || !session) {
          return;
        }

        const currentPath =
          window.location.pathname;

        if (
          !currentPath.startsWith(
            "/auth/callback",
          ) &&
          !currentPath.startsWith(
            "/register/oauth",
          )
        ) {
          navigate("/auth/callback", {
            replace: true,
          });
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  /* ── Navbar categories ──────────────────────────────────────── */

  const isAdminLoginPath = [
    "/admin",
    "/admin/",
    "/admin/login",
    "/admin/register-admin",
  ].includes(path);

  const isAuthPath =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/auth/callback") ||
    isAdminLoginPath;

  const isAdminPath =
    path.startsWith("/admin/") &&
    !isAdminLoginPath;

  const isStaffPath =
    path.startsWith("/staff/");

  const isGuestPath =
    path === "/" ||
    path.startsWith("/guest/");

  const hasNavbar = !isAuthPath;
  const hasDesktopRail =
    hasNavbar &&
    (isAdminPath || isStaffPath);

  const renderNavbar = () => {
    if (isAuthPath) {
      return null;
    }

    if (isAdminPath) {
      return <AdminNavbar />;
    }

    if (isStaffPath) {
      return <StaffNavbar />;
    }

    if (isGuestPath) {
      return <GuestNavbar />;
    }

    return <DynamicNavbar />;
  };

  /* ── Application routes ─────────────────────────────────────── */

  return (
    <SettingsProvider>
      <div className="app-gradient-frame min-h-screen bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 md:p-2">
        <div className="app-surface min-h-[calc(100vh-1rem)] overflow-visible rounded-none bg-slate-50 shadow-2xl md:rounded-[1.75rem] dark:bg-slate-950">
          {renderNavbar()}

          <main
            className={[
              hasNavbar ? "py-16" : "",
              hasDesktopRail
                ? "min-h-screen lg:pl-20"
                : "min-h-screen",
            ]
              .join(" ")
              .trim()}
          >
            <Routes>
              {/* ═══════════════════════════════════════════════
                  PUBLIC ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/"
                element={<Guest />}
              />

              <Route
                path="/login"
                element={<LoginPage />}
              />

              <Route
                path="/register"
                element={<CreateUser />}
              />

              <Route
                path="/register/oauth"
                element={<CreateUserForOauth />}
              />

              <Route
                path="/auth/callback"
                element={<AuthCallback />}
              />

              {/* ═══════════════════════════════════════════════
                  ADMIN LOGIN ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/admin"
                element={<AdminLoginRedirect />}
              />

              <Route
                path="/admin/"
                element={<AdminLoginRedirect />}
              />

              <Route
                path="/admin/login"
                element={<AdminLoginRedirect />}
              />

              <Route
                path="/admin/register-admin"
                element={<RegisterAdmin />}
              />

              {/* ═══════════════════════════════════════════════
                  GUEST ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/guest/hazardmap"
                element={<Hazardmap />}
              />

              <Route
                path="/guest/yearly-incident-trends"
                element={
                  <MonthlyIncidentTrends />
                }
              />

              {/* ═══════════════════════════════════════════════
                  PROTECTED USER ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/track"
                element={
                  <ProtectedRoute>
                    <TrackAppointment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/about"
                element={
                  <ProtectedRoute>
                    <About />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <Report />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hazard-report"
                element={
                  <ProtectedRoute>
                    <HazardReport />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/borrow"
                element={
                  <ProtectedRoute>
                    <Borrow />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/appointment"
                element={
                  <ProtectedRoute>
                    <Appointment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/checkup"
                element={
                  <ProtectedRoute>
                    <CheckUp />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hazardmap"
                element={
                  <ProtectedRoute>
                    <Hazardmap />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/edit-profile"
                element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/yearly-incident-trends"
                element={
                  <ProtectedRoute>
                    <MonthlyIncidentTrends />
                  </ProtectedRoute>
                }
              />

              {/* ═══════════════════════════════════════════════
                  PROTECTED ADMIN ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute adminOnly>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/hazard-map"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminHazardMap />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/pending-account"
                element={
                  <ProtectedRoute adminOnly>
                    <UserApproval />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/report"
                element={
                  <ProtectedRoute adminOnly>
                    <IncidentReported />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/borrow"
                element={
                  <ProtectedRoute adminOnly>
                    <BorrowedVehicles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/appointment"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminAppointmentDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/checkup"
                element={
                  <ProtectedRoute adminOnly>
                    <CheckUpTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/inventory"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminInventory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute adminOnly>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/notification"
                element={
                  <ProtectedRoute adminOnly>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* ═══════════════════════════════════════════════
                  PROTECTED STAFF ROUTES
              ═══════════════════════════════════════════════ */}

              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/borrow"
                element={
                  <ProtectedRoute staffOnly>
                    <Borrow />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/checkup"
                element={
                  <ProtectedRoute staffOnly>
                    <CheckUp />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/checkupqueue"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffCheckUpQueue />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/inventory"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffInventory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/settings"
                element={
                  <ProtectedRoute staffOnly>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/profile"
                element={
                  <ProtectedRoute staffOnly>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/borrower-slip"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffBorrowerSlip />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/notification"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffHome />
                  </ProtectedRoute>
                }
              />

              {/* ═══════════════════════════════════════════════
                  USER NOTIFICATION ROUTE
              ═══════════════════════════════════════════════ */}

              <Route
                path="/notification"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* ═══════════════════════════════════════════════
                  CATCH-ALL
              ═══════════════════════════════════════════════ */}

              <Route
                path="/admin/*"
                element={
                  <Navigate
                    to="/admin/dashboard"
                    replace
                  />
                }
              />

              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
