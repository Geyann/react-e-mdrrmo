import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
import { useDialog } from "../components/AppDialog";
import { supabase } from "../createClient";
import logo from "../Images/logo.png";
import Notification from "./notification";

const SIDEBAR_STORAGE_KEY = "mdrrmo_portal_sidebar_collapsed";
const SIDEBAR_EXPANDED_WIDTH = "17rem";
const SIDEBAR_COLLAPSED_WIDTH = "5rem";
const BADGE_POLL_MS = 15000;
const BADGE_REFRESH_EVENT = "mdrrmo:badge-refresh";

function readSidebarPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
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
    // Preference still works in memory when storage is unavailable.
  }
}
/**
 * Normalize status for case-insensitive comparison.
 */
function normStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Fetch pending count for a single badge config.
 * Returns 0 on any error so the UI stays quiet.
 *
 * Special handling for pending_registrations:
 * A registration is only counted as pending when:
 * 1. Its status is truly "pending" / "pending approval"
 * 2. There is NO matching account already in profiles, staff_users, or admin_users
 */
async function fetchBadgeCount(badge) {
  // Support multiple badge sources on one link
  if (Array.isArray(badge)) {
    const counts = await Promise.all(badge.map((b) => fetchBadgeCount(b)));
    return counts.reduce((sum, n) => sum + n, 0);
  }

  if (!badge?.table || !badge?.statusField) return 0;

  try {
    const statuses = (badge.statuses || ["pending"]).map(normStatus);

    // ─────────────────────────────────────────────────────────────
    // SPECIAL CASE: pending_registrations
    // ─────────────────────────────────────────────────────────────
    if (badge.table === "pending_registrations") {
      // 1. Get all pending_registrations
      const { data: pendingRows, error: pendingError } = await supabase
        .from("pending_registrations")
        .select("id, email, username, user_id, status")
        .limit(1000);

      if (pendingError || !Array.isArray(pendingRows)) return 0;

      // Keep only rows that are still marked pending
      const trulyPending = pendingRows.filter((row) => {
        const s = normStatus(row.status);
        return s === "pending" || s === "pending approval";
      });

      if (trulyPending.length === 0) return 0;

      // 2. Collect possible identities
      const emails = [
        ...new Set(
          trulyPending
            .map((r) => String(r.email || "").trim().toLowerCase())
            .filter(Boolean),
        ),
      ];

      const usernames = [
        ...new Set(
          trulyPending
            .map((r) => String(r.username || "").trim().toLowerCase())
            .filter(Boolean),
        ),
      ];

      const workIds = [
        ...new Set(
          trulyPending
            .map((r) => String(r.user_id || "").trim())
            .filter(Boolean),
        ),
      ];

      // 3. Check if any of these already exist in the real account tables
      const [profilesRes, staffRes, adminRes] = await Promise.all([
        emails.length
          ? supabase.from("profiles").select("email, user_id, username").in("email", emails)
          : Promise.resolve({ data: [] }),
        workIds.length
          ? supabase.from("staff_users").select("email, user_id, username").in("user_id", workIds)
          : Promise.resolve({ data: [] }),
        emails.length
          ? supabase.from("admin_users").select("email, username").in("email", emails)
          : Promise.resolve({ data: [] }),
      ]);

      const existingEmails = new Set();
      const existingUsernames = new Set();
      const existingWorkIds = new Set();

      const collect = (rows = []) => {
        rows.forEach((row) => {
          if (row.email) existingEmails.add(String(row.email).trim().toLowerCase());
          if (row.username) existingUsernames.add(String(row.username).trim().toLowerCase());
          if (row.user_id) existingWorkIds.add(String(row.user_id).trim());
        });
      };

      collect(profilesRes?.data);
      collect(staffRes?.data);
      collect(adminRes?.data);

      // 4. Only count a pending row if NONE of its identities already exist
      const realPendingCount = trulyPending.filter((row) => {
        const email = String(row.email || "").trim().toLowerCase();
        const username = String(row.username || "").trim().toLowerCase();
        const workId = String(row.user_id || "").trim();

        const alreadyExists =
          (email && existingEmails.has(email)) ||
          (username && existingUsernames.has(username)) ||
          (workId && existingWorkIds.has(workId));

        return !alreadyExists;
      }).length;

      return realPendingCount;
    }

    // ─────────────────────────────────────────────────────────────
    // DEFAULT PATH (incidents, vehicles, appointments, etc.)
    // ─────────────────────────────────────────────────────────────
    if (statuses.length === 1) {
      const { count, error } = await supabase
        .from(badge.table)
        .select("*", { count: "exact", head: true })
        .ilike(badge.statusField, statuses[0]);

      if (error) return 0;
      return typeof count === "number" ? count : 0;
    }

    // Multiple status spellings
    const { data, error } = await supabase
      .from(badge.table)
      .select(badge.statusField)
      .limit(500);

    if (error || !Array.isArray(data)) return 0;

    return data.filter((row) =>
      statuses.includes(normStatus(row[badge.statusField])),
    ).length;
  } catch {
    return 0;
  }
}
const { data } = await supabase
  .from("pending_registrations")
  .select("id, email, username, user_id, status")
  .limit(20);

console.table(data);

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
  const { showAlert, showConfirm } = useDialog();

  const [collapsed, setCollapsed] = useState(readSidebarPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Badge counts keyed by link.to
  const [badgeCounts, setBadgeCounts] = useState({});
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const activeLink = links.find((link) => link.to === location.pathname);
  const pageTitle =
    location.pathname === profilePath
      ? "Profile"
      : activeLink?.label || portalTitle;

  // Links that need badge polling
  const badgeLinks = useMemo(
    () => links.filter((link) => link.badge),
    [links],
  );

  /* =========================================================
     BADGE COUNTS — poll + refresh on focus / custom event
  ========================================================= */
  const loadBadges = useCallback(async () => {
    if (!badgeLinks.length) return;

    const results = await Promise.all(
      badgeLinks.map(async (link) => {
        const count = await fetchBadgeCount(link.badge);
        return [link.to, count];
      }),
    );

    if (!mountedRef.current) return;

    setBadgeCounts((prev) => {
      const next = { ...prev };
      for (const [to, count] of results) {
        next[to] = count;
      }
      return next;
    });
  }, [badgeLinks]);

  useEffect(() => {
    mountedRef.current = true;
    loadBadges();

    // Poll while the portal is open
    pollRef.current = window.setInterval(loadBadges, BADGE_POLL_MS);

    const onFocus = () => loadBadges();
    const onCustomRefresh = () => loadBadges();

    window.addEventListener("focus", onFocus);
    window.addEventListener(BADGE_REFRESH_EVENT, onCustomRefresh);

    // Also refresh when the existing notification system signals a change
    window.addEventListener("mdrrmo:notif-refresh", onCustomRefresh);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(BADGE_REFRESH_EVENT, onCustomRefresh);
      window.removeEventListener("mdrrmo:notif-refresh", onCustomRefresh);
    };
  }, [loadBadges]);

  // Refresh badges when the user navigates (e.g. after opening a queue page)
  useEffect(() => {
    loadBadges();
  }, [location.pathname, loadBadges]);

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
    if (!mobileOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  /* =========================================================
     LOGOUT
  ========================================================= */
  const handleLogout = async () => {
    if (loggingOut) return;

    const confirmed = await showConfirm(
      `Sign out of the ${portalTitle.toLowerCase()}?`,
    );
    if (!confirmed) return;

    setLoggingOut(true);
    setMobileOpen(false);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Manual staff sessions may not have a Supabase Auth session.
    }

    try {
      window.localStorage.removeItem(sessionKey);
    } catch {
      // Ignore local storage errors.
    }

    navigate(logoutPath, { replace: true });
  };

  /* =========================================================
     NAVIGATION CLASSES
  ========================================================= */
  const getNavigationClass = ({ isActive }) =>
    [
      "group relative flex min-h-11 w-full items-center gap-3 rounded-xl text-sm font-bold transition",
      "justify-start px-3 py-2.5",
      collapsed ? "lg:justify-center lg:px-2" : "lg:justify-start lg:px-4",
      isActive
        ? "bg-white text-purple-700 shadow-lg"
        : "text-white hover:bg-white/15 hover:text-white",
    ].join(" ");

  const getUtilityClass = () =>
    [
      "flex min-h-11 w-full items-center gap-3 rounded-xl text-sm font-bold transition",
      "justify-start px-3 py-2.5",
      collapsed ? "lg:justify-center lg:px-2" : "lg:justify-start lg:px-4",
      "text-white hover:bg-white/15 hover:text-white",
      "disabled:cursor-not-allowed disabled:opacity-50",
    ].join(" ");

  /**
   * Small red badge shown on the nav item.
   * Works in both expanded and collapsed sidebar states.
   */
  const renderBadge = (count, isActive) => {
    if (!count || count < 1) return null;

    const display = count > 99 ? "99+" : String(count);

    return (
      <span
        className={[
          "absolute flex items-center justify-center rounded-full font-extrabold leading-none tabular-nums shadow-sm",
          // Position: top-right of the icon area when collapsed, right side when expanded
          collapsed
            ? "right-1 top-1 h-4 min-w-4 px-1 text-[9px] lg:right-1.5 lg:top-1.5"
            : "right-2 top-1/2 h-5 min-w-5 -translate-y-1/2 px-1.5 text-[10px]",
          isActive
            ? "bg-red-600 text-white"
            : "bg-red-500 text-white ring-2 ring-blue-600/40",
        ].join(" ")}
        aria-label={`${count} pending`}
      >
        {display}
      </span>
    );
  };

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
              onClick={() => setMobileOpen((open) => !open)}
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
              onClick={() => setCollapsed((value) => !value)}
              aria-label={
                collapsed
                  ? "Show navigation sidebar"
                  : "Hide navigation sidebar"
              }
              aria-expanded={!collapsed}
              aria-controls="portal-navigation-sidebar"
              className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="hidden xl:inline" />
            </button>

            {/* Brand */}
            <Link to={homePath} className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center">
                <img
                  src={logo}
                  alt="MDRRMO logo"
                  className="h-13 w-13 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white sm:text-base">
                  {pageTitle}
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
          collapsed ? "lg:w-20" : "lg:w-[17rem]",
          mobileOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full lg:visible lg:translate-x-0",
        ].join(" ")}
      >
        {/* Mobile drawer heading */}
        <div className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-center text-white lg:hidden">
          <p className="mt-1 text-sm font-black">{portalTitle}</p>
        </div>

        {/* Main navigation links */}
        <nav className="flex-1 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const count = badgeCounts[link.to] || 0;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={getNavigationClass}
                title={
                  count > 0
                    ? `${link.label} (${count} pending)`
                    : link.label
                }
                aria-label={
                  count > 0
                    ? `${link.label}, ${count} pending`
                    : link.label
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative shrink-0">
                      <Icon className="h-5 w-5" />
                      {/* Compact badge on the icon when sidebar is collapsed */}
                      {collapsed && renderBadge(count, isActive)}
                    </span>

                    {/* Label — hidden on large screens when collapsed */}
                    <span
                      className={[
                        "truncate",
                        collapsed ? "lg:hidden" : "",
                      ].join(" ")}
                    >
                      {link.label}
                    </span>

                    {/* Expanded-state badge (right side of the row) */}
                    {!collapsed && renderBadge(count, isActive)}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Profile and logout */}
        <div className="mt-5 space-y-1.5 border-t border-white/15 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={[
              getUtilityClass(),
              collapsed ? "lg:hidden" : "",
            ].join(" ")}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">
              {loggingOut ? "Signing out..." : "Sign out"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * Call this after approving / rejecting / updating a report so the
 * sidebar badges refresh immediately instead of waiting for the next poll.
 *
 * Example (inside an admin action handler):
 *   window.dispatchEvent(new Event("mdrrmo:badge-refresh"));
 */
export function refreshPortalBadges() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BADGE_REFRESH_EVENT));
  }
}