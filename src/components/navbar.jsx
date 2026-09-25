"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import imgLogo from "../Images/icon.png";
import { supabase } from "../createClient";
import {
  User2Icon,
  MenuIcon,
  XIcon,
  LogOut,
  LayoutDashboard,
  Siren,
  TriangleAlert,
  Truck,
  CalendarCheck2,
  Stethoscope,
  ClipboardList,
  MapPinned,
  TrendingUp,
  Info,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Notification from "./notification";

/* =============================================================
 *  NAVIGATION CONFIG
 * ============================================================= */

const USER_GROUPS = [
  {
    label: "Services",
    links: [
      { to: "/home", label: "Dashboard", icon: LayoutDashboard },
      { to: "/hazard-report", label: "Hazard Report", icon: TriangleAlert },
      { to: "/report", label: "Report Incident", icon: Siren },
      { to: "/borrow", label: "Borrow Vehicle", icon: Truck },
      { to: "/appointment", label: "Book Appointment", icon: CalendarCheck2 },
      { to: "/checkup", label: "OPD Check-up", icon: Stethoscope },
    ],
  },
  {
    label: "My Records",
    links: [
      { to: "/track", label: "My Requests", icon: ClipboardList },
      { to: "/hazardmap", label: "Hazard Map", icon: MapPinned },
      { to: "/yearly-incident-trends", label: "Incident Trends", icon: TrendingUp },
    ],
  },
  {
    label: "Account",
    links: [
      { to: "/about", label: "About", icon: Info },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "mdrrmo_sidebar_collapsed";
const SIDEBAR_EVENT = "mdrrmo:sidebar-toggle";

/* =============================================================
 *  FLOATING LABEL
 *  Rendered into document.body because the sidebar clips overflow
 *  to allow vertical scrolling. Fixed positioning keeps it clear of
 *  the nav and gives it the correct stacking order.
 * ============================================================= */

const FloatingLabel = ({ data }) => {
  if (!data) return null;
  if (typeof document === "undefined") return null;

  const { label, top, left, muted } = data;

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[99999] pointer-events-none select-none"
      style={{ top, left }}
    >
      <div
        className={`relative px-3 py-1.5 rounded-lg shadow-xl border text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
          muted
            ? "bg-white text-blue-700 border-blue-200"
            : "bg-slate-900 text-white border-slate-700"
        }`}
      >
        {label}
        {muted && (
          <span className="ml-2 font-normal normal-case opacity-60">
            — current
          </span>
        )}
        {/* Arrow */}
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-l ${
            muted
              ? "bg-white border-blue-200"
              : "bg-slate-900 border-slate-700"
          }`}
        />
      </div>
    </div>,
    document.body
  );
};

/* =============================================================
 *  SIDE LINK
 *     current page → static, never clickable
 *     expanded      → icon + inline label
 *     collapsed     → icon only + floating label on hover/focus
 * ============================================================= */

const SideLink = ({
  to,
  label,
  icon: Icon,
  current,
  onClick,
  collapsed,
  onShowLabel,
  onHideLabel,
}) => {
  const ref = useRef(null);

  const reveal = () => {
    if (!collapsed || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    onShowLabel({
      label,
      top: r.top + r.height / 2,
      left: r.right + 10,
      muted: current,
    });
  };

  const conceal = () => onHideLabel();

  useEffect(() => {
    return () => onHideLabel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base =
    "relative flex w-full items-center gap-3 py-3 px-6 text-left text-sm font-semibold uppercase transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset";

  if (current) {
    return (
      <span
        ref={ref}
        onMouseEnter={reveal}
        onMouseLeave={conceal}
        onFocus={reveal}
        onBlur={conceal}
        aria-current="page"
        aria-label={`${label} — current page`}
        className={`${base} bg-white text-blue-700 cursor-default ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link
      ref={ref}
      to={to}
      onClick={onClick}
      onMouseEnter={reveal}
      onMouseLeave={conceal}
      onFocus={reveal}
      onBlur={conceal}
      title={collapsed ? undefined : label}
      aria-label={label}
      className={`${base} text-white hover:bg-white hover:text-blue-600 ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
};

/* =============================================================
 *  COMPONENT
 * ============================================================= */

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(null);

  const isCurrent = useCallback(
    (to) => Boolean(to) && to === path,
    [path]
  );

  const close = useCallback(() => setIsOpen(false), []);

  const toggleMobile = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_EVENT, {
          detail: { collapsed: next },
        })
      );
      return next;
    });
  }, []);

  const showLabel = useCallback((data) => setHovered(data), []);
  const hideLabel = useCallback(() => setHovered(null), []);

  /* ── Logout ────────────────────────────────────────────────────
     Session keys only. Preferences and notification read-state stay. */
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* no Supabase session */
    }
    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentStaff");
    } catch {
      /* private mode */
    }
    setIsOpen(false);
    navigate("/login", { replace: true });
  }, [navigate]);

  /* Close the drawer and any tooltip on navigation */
  useEffect(() => {
    setIsOpen(false);
    setHovered(null);
  }, [path]);

  /* Escape closes the drawer and dismisses the tooltip */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (isOpen) setIsOpen(false);
      setHovered(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  /* Restore the saved collapse preference */
  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
      );
    } catch {
      setCollapsed(false);
    }
  }, []);

  /* Persist the collapse preference */
  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        collapsed ? "1" : "0"
      );
    } catch {
      /* private mode */
    }
  }, [collapsed]);

  /* Shared brand markup */
  const brandInner = (
    <>
      <img
        src={imgLogo}
        alt="MDRRMO logo"
        className="h-9 w-auto shrink-0"
      />
      <span className="hidden sm:inline text-white text-base sm:text-lg font-bold truncate">
        SafeResponse
      </span>
    </>
  );

  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          TOP BAR
          ════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 h-16 z-[60] bg-gradient-to-r from-blue-600 to-purple-600 border-b border-purple-500/40 shadow-lg flex items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile burger */}
          <button
            type="button"
            onClick={toggleMobile}
            aria-label={
              isOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isOpen}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/15 active:scale-95 transition shrink-0"
          >
            {isOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>

          {/* Desktop collapse burger */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!collapsed}
            className="hidden lg:flex p-2 rounded-lg text-white hover:bg-white/15 active:scale-95 transition shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>

          {/* Brand */}
          {isCurrent("/home") ? (
            <span
              title="SafeResponse — current page"
              className="flex items-center gap-2 min-w-0"
            >
              {brandInner}
            </span>
          ) : (
            <Link
              to="/home"
              title="Go to Dashboard"
              className="flex items-center gap-2 min-w-0 shrink-0"
            >
              {brandInner}
            </Link>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Notification />

          {isCurrent("/profile") ? (
            <span
              title="Profile — current page"
              aria-label="Profile — current page"
              className="p-2 rounded-xl text-white bg-white/20 cursor-default"
            >
              <User2Icon size={22} />
            </span>
          ) : (
            <Link
              to="/profile"
              title="Profile"
              aria-label="View profile"
              className="p-2 rounded-xl text-white hover:bg-white/15 active:scale-95 transition"
            >
              <User2Icon size={22} />
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-bold uppercase hover:bg-white/15 active:scale-95 transition"
            title="Log out"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          OVERLAY — mobile only
          ════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ════════════════════════════════════════════════════════════
          LEFT SIDEBAR
            • below lg  → off-canvas
            • lg and up → pinned, 16rem / 4rem
          ════════════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-16 bottom-0 left-0 z-5000 bg-gradient-to-b from-blue-600 to-purple-600 shadow-xl transform transition-transform transition-[width] duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "w-16" : "w-64"}`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          {USER_GROUPS.map((group, gi) => (
            <div
              key={group.label}
              className={`shrink-0 ${
                collapsed && gi > 0
                  ? "border-t border-white/15"
                  : ""
              }`}
            >
              {!collapsed && (
                <div className="py-4 px-6 border-b border-purple-400/40">
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">
                    {group.label}
                  </p>
                </div>
              )}

              {/* Group tooltip when collapsed — anchor is the divider */}
              {collapsed && gi > 0 && (
                <div
                  className="h-0"
                  aria-hidden="true"
                />
              )}

              <div className="flex flex-col py-1">
                {group.links.map((l) => (
                  <SideLink
                    key={l.to}
                    to={l.to}
                    label={l.label}
                    icon={l.icon}
                    current={isCurrent(l.to)}
                    onClick={close}
                    collapsed={collapsed}
                    onShowLabel={showLabel}
                    onHideLabel={hideLabel}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Mobile-only logout */}
          <div className="p-4 border-t border-purple-400/40 shrink-0 sm:hidden mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold uppercase hover:bg-white/15 transition"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          SIDEBAR FOOTER — desktop collapse control
          ════════════════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={toggleCollapse}
        aria-label={
          collapsed ? "Expand sidebar" : "Collapse sidebar"
        }
        className={`hidden lg:flex fixed bottom-0 left-0 z-[55] h-11 items-center justify-center gap-2 text-white/80 hover:text-white hover:bg-white/10 transition ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <PanelLeftClose
          size={18}
          className={collapsed ? "rotate-180" : ""}
        />
        {!collapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Collapse
          </span>
        )}
      </button>

      {/* Hover label for the collapsed rail */}
      <FloatingLabel data={hovered} />
    </>
  );
}
