import {
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../createClient";
import logo from "../Images/icon.png";
import Notification from "./notification";

const SIDEBAR_STORAGE_KEY =
  "mdrrmo_portal_sidebar_collapsed";

const SIDEBAR_EXPANDED_WIDTH = "17rem";
const SIDEBAR_COLLAPSED_WIDTH = "5rem";

function readSidebarPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY,
      ) === "true"
    );
  } catch {
    return false;
  }
}

function saveSidebarPreference(collapsed) {
  try {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? "true" : "false",
    );
  } catch {
    // The preference still works in memory when storage
    // is unavailable.
  }
}

export default function PortalNavbar({
  portalTitle,
  links,
  homePath,
  profilePath,
  logoutPath,
  sessionKey,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] =
    useState(readSidebarPreference);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const activeLink = links.find(
    (link) => link.to === location.pathname,
  );

  const pageTitle =
    location.pathname === profilePath
      ? "Profile"
      : activeLink?.label || portalTitle;

  /* =========================================================
     SIDEBAR PREFERENCE AND CONTENT WIDTH
  ========================================================= */

  useLayoutEffect(() => {
    const width = collapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_EXPANDED_WIDTH;

    document.documentElement.style.setProperty(
      "--portal-sidebar-width",
      width,
    );

    saveSidebarPreference(collapsed);
  }, [collapsed]);

  /* =========================================================
     CLOSE MOBILE DRAWER AFTER NAVIGATION
  ========================================================= */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* =========================================================
     CLOSE MOBILE DRAWER WITH ESCAPE
  ========================================================= */

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [mobileOpen]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    const confirmed = window.confirm(
      `Sign out of the ${portalTitle.toLowerCase()}?`,
    );

    if (!confirmed) {
      return;
    }

    setLoggingOut(true);
    setMobileOpen(false);

    try {
      await supabase.auth.signOut();
    } catch {
      // Manual staff sessions may not have a Supabase
      // Auth session.
    }

    try {
      window.localStorage.removeItem(sessionKey);
    } catch {
      // Ignore local storage errors.
    }

    navigate(logoutPath, {
      replace: true,
    });
  };

  /* =========================================================
     NAVIGATION CLASSES
  ========================================================= */

  const getNavigationClass = ({ isActive }) =>
    [
      "group relative flex min-h-11 w-full items-center gap-3 rounded-xl text-sm font-bold transition",
      "justify-start px-3 py-2.5",
      collapsed
        ? "lg:justify-center lg:px-2"
        : "lg:justify-start lg:px-4",
      isActive
        ? "bg-white text-purple-700 shadow-lg"
        : "text-white hover:bg-white/15 hover:text-white",
    ].join(" ");

  const getUtilityClass = () =>
    [
      "flex min-h-11 w-full items-center gap-3 rounded-xl text-sm font-bold transition",
      "justify-start px-3 py-2.5",
      collapsed
        ? "lg:justify-center lg:px-2"
        : "lg:justify-start lg:px-4",
      "text-white hover:bg-white/15 hover:text-white",
      "disabled:cursor-not-allowed disabled:opacity-50",
    ].join(" ");

  return (
    <>
      {/* =====================================================
          TOP NAVIGATION
      ===================================================== */}

      <header className="fixed inset-x-0 top-0 z-[1000] h-16 border-b border-white/20 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl shadow-purple-950/15">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-5">
          {/* Left side */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Mobile open/close button */}
            <button
              type="button"
              onClick={() =>
                setMobileOpen((open) => !open)
              }
              aria-label={
                mobileOpen
                  ? "Close navigation sidebar"
                  : "Open navigation sidebar"
              }
              aria-expanded={mobileOpen}
              aria-controls="portal-navigation-sidebar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/15 lg:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Desktop show/hide button */}
            <button
              type="button"
              onClick={() =>
                setCollapsed((value) => !value)
              }
              aria-label={
                collapsed
                  ? "Show navigation sidebar"
                  : "Hide navigation sidebar"
              }
              aria-expanded={!collapsed}
              aria-controls="portal-navigation-sidebar"
              title={
                collapsed
                  ? "Show sidebar"
                  : "Hide sidebar"
              }
              className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}

              <span className="hidden xl:inline">
                {collapsed
                  ? "Show Sidebar"
                  : "Hide Sidebar"}
              </span>
            </button>

            {/* Brand */}
            <Link
              to={homePath}
              className="flex min-w-0 items-center gap-2.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20">
                <img
                  src={logo}
                  alt="MDRRMO logo"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white sm:text-base">
                  {pageTitle}
                </p>

                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100 sm:block">
                  {portalTitle}
                </p>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Notification />

            <Link
              to={profilePath}
              title="Open profile"
              aria-label="Open profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
            >
              <UserRound className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-16 z-[1010] bg-slate-950/65 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          COLLAPSIBLE SIDEBAR
      ===================================================== */}

      <aside
        id="portal-navigation-sidebar"
        aria-label={`${portalTitle} navigation`}
        className={[
          "fixed bottom-0 left-0 top-16 z-[1020] flex w-[17rem] flex-col overflow-y-auto overflow-x-hidden border-r border-white/15 bg-gradient-to-b from-blue-600 via-blue-600 to-purple-700 p-3 shadow-2xl transition-all duration-300 lg:z-[900]",
          collapsed
            ? "lg:w-20"
            : "lg:w-[17rem]",
          mobileOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full lg:visible lg:translate-x-0",
        ].join(" ")}
      >
        {/* Mobile drawer heading */}
        <div className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white lg:hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
            Navigation
          </p>

          <p className="mt-1 text-sm font-black">
            {portalTitle}
          </p>
        </div>

        {/* Main navigation links */}
        <nav className="flex-1 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={
                  getNavigationClass
                }
                title={link.label}
                aria-label={link.label}
              >
                <Icon className="h-5 w-5 shrink-0" />

                {/* Mobile label */}
                <span className="truncate lg:hidden">
                  {link.label}
                </span>

                {/* Expanded desktop label */}
                <span
                  className={
                    collapsed
                      ? "hidden"
                      : "hidden lg:inline"
                  }
                >
                  {link.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Profile and logout */}
        <div className="mt-5 space-y-1.5 border-t border-white/15 pt-4">
          <NavLink
            to={profilePath}
            onClick={() =>
              setMobileOpen(false)
            }
            className={getUtilityClass()}
            title="Profile"
            aria-label="Profile"
          >
            <UserRound className="h-5 w-5 shrink-0" />

            {/* Mobile label */}
            <span className="truncate lg:hidden">
              Profile
            </span>

            {/* Expanded desktop label */}
            <span
              className={
                collapsed
                  ? "hidden"
                  : "hidden lg:inline"
              }
            >
              Profile
            </span>
          </NavLink>

        
        </div>
      </aside>
    </>
  );
}
