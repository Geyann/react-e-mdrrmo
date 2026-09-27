import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CalendarCheck2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../createClient";
import imgLogo from "../Images/icon.png";
import Notification from "./notification";

const ADMIN_LINKS = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/hazard-map",
    label: "Hazard Map",
    icon: TriangleAlert,
  },
  {
    to: "/admin/pending-account",
    label: "User Accounts",
    icon: ShieldCheck,
  },
  {
    to: "/admin/report",
    label: "Incidents",
    icon: Siren,
  },
  {
    to: "/admin/borrow",
    label: "Vehicles",
    icon: Truck,
  },
  {
    to: "/admin/appointment",
    label: "Appointments",
    icon: CalendarCheck2,
  },
  {
    to: "/admin/checkup",
    label: "Check-Ups",
    icon: Stethoscope,
  },
  {
    to: "/admin/inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    to: "/admin/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

function getPageTitle(pathname) {
  const active = ADMIN_LINKS.find(
    (link) => link.to === pathname,
  );

  return active?.label || "Admin Portal";
}

export default function AdminNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = getPageTitle(
    location.pathname,
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    if (loggingOut) return;

    const confirmed = window.confirm(
      "Sign out of the administrator portal?",
    );

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
    } catch {
      // The local session can still be cleared if no
      // Supabase Auth session exists.
    }

    localStorage.removeItem(
      "currentStaff",
    );

    navigate("/admin", {
      replace: true,
    });
  };

  const getRailClass = ({ isActive }) =>
    [
      "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition",
      isActive
        ? "bg-white text-purple-700 shadow-lg"
        : "text-white/80 hover:bg-white/15 hover:text-white",
    ].join(" ");

  const getMobileClass = ({ isActive }) =>
    [
      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
      isActive
        ? "bg-white text-purple-700 shadow-lg"
        : "text-white hover:bg-white/15",
    ].join(" ");

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          TOP NAVIGATION
      ═══════════════════════════════════════════════════════ */}

      <header className="fixed inset-x-0 top-0 z-[1000] h-16 border-b border-white/20 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl shadow-purple-950/15">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-5">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMenuOpen((open) => !open)
              }
              aria-label={
                menuOpen
                  ? "Close admin menu"
                  : "Open admin menu"
              }
              aria-expanded={menuOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/15 lg:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <Link
              to="/admin/dashboard"
              className="flex min-w-0 items-center gap-2.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20">
                <img
                  src={imgLogo}
                  alt="MDRRMO logo"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white sm:text-base">
                  {pageTitle}
                </p>

                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100 sm:block">
                  Administrator Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Notification />

            <Link
              to="/admin/profile"
              title="Profile"
              aria-label="Open administrator profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
            >
              <UserRound className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50 sm:flex"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MOBILE OVERLAY
      ═══════════════════════════════════════════════════════ */}

      {menuOpen && (
        <button
          type="button"
          aria-label="Close admin menu overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 top-16 z-[1010] bg-slate-950/65 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ═══════════════════════════════════════════════════════
          MOBILE DRAWER
      ═══════════════════════════════════════════════════════ */}

      <aside
        className={[
          "fixed bottom-0 left-0 top-16 z-[1020] w-72 overflow-y-auto bg-gradient-to-b from-blue-600 via-blue-600 to-purple-700 p-4 shadow-2xl transition-transform duration-300 lg:hidden",
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
        aria-label="Administrator navigation"
      >
        <div className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
            Administration
          </p>

          <p className="mt-1 text-sm font-black">
            E-MDRRMO Management
          </p>
        </div>

        <nav className="space-y-1.5">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={getMobileClass}
                title={link.label}
              >
                <Icon className="h-5 w-5 shrink-0" />

                <span className="truncate">
                  {link.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />

          {loggingOut
            ? "Signing out..."
            : "Sign out"}
        </button>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP NAVIGATION RAIL
      ═══════════════════════════════════════════════════════ */}

      <nav
        aria-label="Administrator desktop navigation"
        className="fixed bottom-0 left-0 top-16 z-[900] hidden w-20 flex-col items-center overflow-y-auto border-r border-white/15 bg-gradient-to-b from-blue-600 via-blue-600 to-purple-700 py-4 shadow-2xl shadow-purple-950/20 lg:flex"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>

        <div className="flex w-full flex-1 flex-col items-center gap-2 px-2">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={getRailClass}
                title={link.label}
                aria-label={link.label}
              >
                <Icon className="h-5 w-5" />

                <span className="pointer-events-none absolute left-[4.5rem] z-[1100] hidden whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
                  {link.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          aria-label="Sign out"
          className="mt-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </nav>
    </>
  );
}
