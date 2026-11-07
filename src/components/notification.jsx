// ============================================================
// src/components/notification.jsx
// UI design aligned with PortalNavbar (blue/purple gradient system)
// ============================================================

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
  CalendarCheck2,
  Truck,
  Stethoscope,
  Siren,
  TriangleAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const POLL_MS_USER = 8000;
const POLL_MS_HANDLER = 12000;
const MAX_NOTIFICATIONS = 80;
const QUERY_TIMEOUT_MS = 10000;
const TOAST_DURATION_MS = 6500;
const MAX_VISIBLE_TOASTS = 4;
const DEBUG = import.meta.env?.DEV ?? false;

const dbg = (...a) => {
  if (DEBUG) console.log("[Notif]", ...a);
};

const REFRESH_EVENT = "mdrrmo:notif-refresh";

/* ══════════════════════════════════════════════════════════════════
   NETWORK SAFETY
   ══════════════════════════════════════════════════════════════════ */

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
      if (t && typeof t.unref === "function") t.unref();
    }),
  ]);

const safeQuery = async (builder, fallback, label, ms = QUERY_TIMEOUT_MS) => {
  try {
    const res = await withTimeout(builder, ms, label);
    if (res?.error) {
      dbg(`${label} error:`, res.error.message);
      return fallback;
    }
    return res?.data ?? fallback;
  } catch (e) {
    dbg(`${label} exception:`, e?.message || e);
    return fallback;
  }
};

/* ══════════════════════════════════════════════════════════════════
   TEXT / STATUS HELPERS
   ══════════════════════════════════════════════════════════════════ */

const DECLINED = new Set([
  "declined",
  "rejected",
  "cancelled",
  "canceled",
  "denied",
]);
const APPROVED = new Set([
  "approved",
  "confirmed",
  "dispatched",
  "completed",
  "accepted",
  "resolved",
]);

const prettyStatus = (s) => {
  const v = String(s || "pending")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  return v
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

/* ══════════════════════════════════════════════════════════════════
   SOURCE DEFINITIONS
   ══════════════════════════════════════════════════════════════════ */

const SOURCES = [
  {
    table: "reportIncident",
    label: "Incident Report",
    idField: "reportIncidentId",
    statusField: "status",
    selfTones: {
      Pending: "info",
      pending: "info",
      approved: "success",
      Approved: "success",
      rejected: "error",
      Rejected: "error",
      declined: "error",
    },
    queueTones: {
      Pending: "warning",
      pending: "warning",
    },
    describe: (r) => ({
      title: "Medical / Incident Report",
      message: r.patientName
        ? `Patient: ${r.patientName} • ${r.incidentType || "Emergency"}`
        : r.incidentType || "New incident report",
    }),
    link: {
      user: () => "/track",
      staff: () => "/staff/dashboard",
      admin: () => "/admin/report",
    },
  },
  {
    table: "hazard_reports",
    label: "Hazard Report",
    idField: "id",
    statusField: "review_status",
    selfTones: {
      pending: "info",
      under_review: "info",
      resolved: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: { pending: "warning", under_review: "info" },
    describe: (r) => ({
      title: "Hazard Report",
      message: r.hazard_category
        ? `${r.hazard_category} • ${r.risk_level || ""}`
        : r.address || "New hazard report",
    }),
    link: {
      user: () => "/track",
      staff: () => "/staff/hazard-reports",
      // AdminHazardMap opens the report passed in ?report=
      admin: (_status, id) => `/admin/hazard-map?report=${encodeURIComponent(id)}`,
    },
  },
  {
    table: "outPatientCheckUp",
    label: "Outpatient Check-up",
    idField: "id",
    statusField: "status",
    selfTones: {
      Pending: "info",
      pending: "info",
      approved: "success",
      Approved: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: { Pending: "warning", pending: "warning" },
    describe: (r) => ({
      title: "Outpatient Request",
      message: r.patientName
        ? `${r.patientName} → ${r.hospitalName || "Hospital"}`
        : "New outpatient request",
    }),
    link: {
      user: () => "/track",
      staff: () => "/staff/checkupqueue",
      admin: () => "/admin/checkup",
    },
  },
  {
    table: "borrow-vehicle",
    label: "Vehicle Request",
    idField: "borrowerId",
    statusField: "status",
    selfTones: {
      Pending: "info",
      pending: "info",
      approved: "success",
      Approved: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: { Pending: "warning", pending: "warning" },
    describe: (r) => ({
      title: "Vehicle Borrow Request",
      message: r.vehicle
        ? `${r.vehicle} • ${r.destination || ""}`
        : "New vehicle request",
    }),
    link: {
      user: () => "/track",
      staff: () => "/staff/borrower-slip",
      admin: () => "/admin/borrow",
    },
  },
  {
    table: "appointments",
    label: "Appointment",
    idField: "appointmentId",
    statusField: "status",
    selfTones: {
      pending: "info",
      approved: "success",
      confirmed: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: { pending: "warning" },
    describe: (r) => ({
      title: "Appointment",
      message: r.purpose || r.fullName || "New appointment request",
    }),
    link: {
      user: () => "/track",
      staff: () => "/staff/dashboard",
      // Opens the "Appointments" tab of AdminAppointmentDashboard
      admin: (status, id) =>
        `/admin/appointment?tab=appointments&status=${encodeURIComponent(status)}&id=${encodeURIComponent(id)}`,
    },
  },
];


/* ══════════════════════════════════════════════════════════════════
   LINK RESOLUTION — where the "View" button goes
   ══════════════════════════════════════════════════════════════════ */

const roleKey = (w) => (w?.isAdminRole ? "admin" : w?.isStaffRole ? "staff" : "user");

const resolveSourceLink = (src, w, status, id) => {
  const fn = (src.link || {})[roleKey(w)];
  return typeof fn === "function" ? fn(status, id) : fn || "/home";
};

// Notifications stored in the DB: prefer action_url, else map related_table.
const resolveDbLink = (row, w) => {
  const url = row.action_url;
  if (url && typeof url === "string" && url.startsWith("/")) return url;

  const src = SOURCES.find((x) => x.table === row.related_table);
  if (src) {
    const id = row.related_id != null ? String(row.related_id) : "";
    return resolveSourceLink(src, w, "pending", id);
  }
  return "/home";
};

/* ══════════════════════════════════════════════════════════════════
   TONES & ICONS – aligned with portal palette
   ══════════════════════════════════════════════════════════════════ */

const TONE_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONE_BG = {
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const TONE_TOAST_BORDER = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const TABLE_ICON = {
  reportIncident: Siren,
  hazard_reports: TriangleAlert,
  outPatientCheckUp: Stethoscope,
  "borrow-vehicle": Truck,
  appointments: CalendarCheck2,
  notifications: Bell,
};

/* ══════════════════════════════════════════════════════════════════
   IDENTITY
   ══════════════════════════════════════════════════════════════════ */

const resolveIdentity = async () => {
  const ids = new Set();
  const add = (v) => {
    if (v != null && v !== "") ids.add(String(v));
  };

  let authId = null;
  let profileId = null;
  let email = "";
  let phone = "";
  let name = "Resident";
  let role = "user";
  let exists = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      exists = true;
      authId = user.id;
      add(user.id);
      email = user.email || "";
      name = user.user_metadata?.full_name || email || "Resident";

      const p = await safeQuery(
        supabase
          .from("profiles")
          .select(
            "id, full_name, first_name, last_name, user_id, role, email, mobile_number",
          )
          .eq("id", user.id)
          .maybeSingle(),
        null,
        "profiles/auth",
      );
      if (p) {
        profileId = p.id;
        add(p.id);
        add(p.user_id);
        if (p.email) email = p.email;
        if (p.mobile_number) phone = p.mobile_number;
        if (p.role) role = p.role;
        const n =
          p.full_name ||
          `${p.first_name || ""} ${p.last_name || ""}`.trim();
        if (n) name = n;
      }
    }
  } catch (e) {
    dbg("auth lookup failed:", e?.message);
  }

  try {
    const rawUser = localStorage.getItem("currentUser");
    if (rawUser) {
      const u = JSON.parse(rawUser);
      exists = true;
      add(u.id);
      add(u.user_id);
      if (!email && u.email) email = u.email;
      if (!phone && u.mobile_number) phone = u.mobile_number;
      if (u.role) role = u.role;
      const n =
        u.full_name ||
        `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (n) name = n;
    }
  } catch {
    /* ignore */
  }

  try {
    const rawStaff = localStorage.getItem("currentStaff");
    if (rawStaff) {
      const s = JSON.parse(rawStaff);
      exists = true;
      add(s.id);
      add(s.user_id);
      if (s.email) email = s.email || email;
      if (s.role) role = s.role;
      if (s.full_name) name = s.full_name;
    }
  } catch {
    /* ignore */
  }

  const isStaffRole = role === "staff" || role === "admin";
  const isAdminRole = role === "admin";

  return {
    exists,
    authId,
    profileId,
    ids: Array.from(ids),
    email,
    phone,
    name,
    role,
    isStaffRole,
    isAdminRole,
  };
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function Notification({ className = "" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [who, setWho] = useState(null);
  const [pos, setPos] = useState(null);

  const btnRef = useRef(null);
  const notifRef = useRef([]);
  const whoRef = useRef(null);
  const seenToastIdsRef = useRef(new Set());
  const toastTimersRef = useRef(new Map());
  const seededRef = useRef(false);
  const dismissRef = useRef({});
  const readRef = useRef({});
  const pollRef = useRef(null);

  // ── persistence helpers ───────────────────────────────────────
  const persistAll = useCallback(() => {
    try {
      localStorage.setItem(
        "mdrrmo_notif_read",
        JSON.stringify(readRef.current),
      );
      localStorage.setItem(
        "mdrrmo_notif_dismiss",
        JSON.stringify(dismissRef.current),
      );
    } catch {
      /* ignore quota */
    }
  }, []);

  const loadPersisted = useCallback(() => {
    try {
      readRef.current = JSON.parse(
        localStorage.getItem("mdrrmo_notif_read") || "{}",
      );
      dismissRef.current = JSON.parse(
        localStorage.getItem("mdrrmo_notif_dismiss") || "{}",
      );
    } catch {
      readRef.current = {};
      dismissRef.current = {};
    }
  }, []);

  // ── toast helpers ─────────────────────────────────────────────
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id && t.toastId !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  const enqueueToast = useCallback(
    (item) => {
      if (!item?.id) return;
      if (seenToastIdsRef.current.has(item.id)) return;
      if (dismissRef.current[item.id] !== undefined) return;

      seenToastIdsRef.current.add(item.id);

      setToasts((prev) => {
        const next = [
          { ...item, toastId: `${item.id}-${Date.now()}` },
          ...prev,
        ].slice(0, MAX_VISIBLE_TOASTS);
        return next;
      });

      const timer = setTimeout(() => removeToast(item.id), TOAST_DURATION_MS);
      toastTimersRef.current.set(item.id, timer);
    },
    [removeToast],
  );

  const push = useCallback(
    (p, { silent = false } = {}) => {
      if (dismissRef.current[p.id] !== undefined) return;
      if (notifRef.current.some((x) => x.id === p.id)) return;

      const n = {
        read: !!readRef.current[p.id],
        ...p,
      };
      const next = [n, ...notifRef.current].slice(0, MAX_NOTIFICATIONS);
      notifRef.current = next;
      setNotifications(next);
      persistAll();

      if (!silent && seededRef.current) {
        enqueueToast(n);
      }
    },
    [persistAll, enqueueToast],
  );

  // ── core scan ─────────────────────────────────────────────────
  const scan = useCallback(async () => {
    const w = whoRef.current;
    if (!w || !w.exists) return;

    setLastError(null);
    const isHandler = w.isStaffRole || w.isAdminRole;

    try {
      if (w.authId || w.profileId) {
        const uid = w.authId || w.profileId;
        const rows = await safeQuery(
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(40),
          [],
          "notifications",
        );

        (rows || []).forEach((row) => {
          push(
            {
              id: `db-${row.id}`,
              table: "notifications",
              recordId: String(row.id),
              scope: "self",
              kind: "db",
              tone: row.type || "info",
              label: "Notification",
              iconKey: "notifications",
              title: row.title || "Notification",
              message: row.message || "",
              link: resolveDbLink(row, w),
              createdAt: row.created_at,
              dbRead: row.is_read === true,
            },
            { silent: true },
          );
        });
      }

      for (const src of SOURCES) {
        const builder = supabase
          .from(src.table === "borrow-vehicle" ? "borrow-vehicle" : src.table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(isHandler ? 30 : 15);

        const rows = await safeQuery(builder, [], src.table);

        (rows || []).forEach((row) => {
          const rid = String(row[src.idField] ?? row.id ?? "");
          if (!rid) return;

          const status = String(
            row[src.statusField] || "pending",
          ).toLowerCase();
          const isOwn =
            w.ids.includes(String(row.userId || "")) ||
            w.ids.includes(String(row.user_id || "")) ||
            w.ids.includes(String(row.user_id_from_auth || ""));

          if (!isHandler && !isOwn) return;

          const scope = isHandler && !isOwn ? "queue" : "self";
          const tones = scope === "queue" ? src.queueTones : src.selfTones;
          const tone =
            tones[status] ||
            tones[prettyStatus(status)] ||
            (APPROVED.has(status)
              ? "success"
              : DECLINED.has(status)
                ? "error"
                : "info");

          const { title, message } = src.describe(row);

          push(
            {
              id: `${src.table}-${rid}-${status}`,
              table: src.table,
              recordId: rid,
              scope,
              kind: "status",
              tone,
              label: src.label,
              iconKey: src.table,
              title:
                scope === "queue"
                  ? `New ${title}`
                  : `${title} • ${prettyStatus(status)}`,
              message,
              link: resolveSourceLink(src, w, status, rid),
              createdAt: row.created_at || new Date().toISOString(),
            },
            { silent: true },
          );
        });
      }

      seededRef.current = true;
    } catch (e) {
      console.error("[Notif] scan failed:", e);
      setLastError(e?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [push]);

  // ── positioning ───────────────────────────────────────────────
  const place = useCallback(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const m = 12;
    const w = Math.min(384, window.innerWidth - m * 2);
    const h = Math.min(480, window.innerHeight - m * 2);
    const r = btnRef.current.getBoundingClientRect();

    let left = r.right - w;
    if (left < m) left = m;
    if (left + w > window.innerWidth - m) left = window.innerWidth - w - m;

    const below = r.bottom + 8;
    const fits = below + h <= window.innerHeight - m;
    const top = fits ? below : Math.max(m, r.top - h - 8);

    setPos({ left, top, width: w });
  }, [open]);

  useLayoutEffect(() => {
    place();
    if (!open) return;
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, place]);

  // ── lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    loadPersisted();
    let cancelled = false;

    (async () => {
      const identity = await resolveIdentity();
      if (cancelled) return;
      whoRef.current = identity;
      setWho(identity);
      await scan();
    })();

    const onRefresh = () => scan();
    window.addEventListener(REFRESH_EVENT, onRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [loadPersisted, scan]);

  useEffect(() => {
    if (!who?.exists) return;

    const interval =
      who.isStaffRole || who.isAdminRole ? POLL_MS_HANDLER : POLL_MS_USER;

    pollRef.current = setInterval(scan, interval);
    return () => clearInterval(pollRef.current);
  }, [who, scan]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((t) => clearTimeout(t));
      toastTimersRef.current.clear();
    };
  }, []);

  // ── actions ───────────────────────────────────────────────────
  const markRead = useCallback(
    (id) => {
      readRef.current[id] = Date.now();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      notifRef.current = notifRef.current.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      persistAll();
    },
    [persistAll],
  );

  const markAllRead = useCallback(() => {
    const now = Date.now();
    notifRef.current.forEach((n) => {
      readRef.current[n.id] = now;
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notifRef.current = notifRef.current.map((n) => ({ ...n, read: true }));
    persistAll();
  }, [persistAll]);

  const dismiss = useCallback(
    (id) => {
      dismissRef.current[id] = Date.now();
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notifRef.current = notifRef.current.filter((n) => n.id !== id);
      removeToast(id);
      persistAll();
    },
    [persistAll, removeToast],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // ── render ────────────────────────────────────────────────────
  return (
    <>
      {/* Bell button – matches top-nav icon style */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 ${className}`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-white" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-blue-600/40 tabular-nums">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open &&
        pos &&
        createPortal(
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setOpen(false)}
          >
            <div
              style={{ left: pos.left, top: pos.top, width: pos.width }}
              className="notif-drop fixed z-[99999] overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-purple-950/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header – gradient to match portal top bar */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white flex items-center gap-2">
                    Notifications
                    {who?.role && (
                      <span className="rounded-lg bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {who.role}
                      </span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <p className="mt-0.5 text-[11px] font-bold text-amber-200">
                      {unreadCount} unread
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={scan}
                    title="Refresh"
                    aria-label="Refresh"
                    className="rounded-xl p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      title="Mark all as read"
                      aria-label="Mark all as read"
                      className="rounded-xl p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                 
                </div>
              </div>

              {/* Error banner */}
              {lastError && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
                  {lastError}
                </div>
              )}

              {/* List */}
              <div className="max-h-[min(60vh,420px)] overflow-y-auto bg-white">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-sm font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Loading…
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                      <Bell className="h-6 w-6 text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">
                      No notifications yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      You’re all caught up
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {notifications.map((n) => {
                      const Icon =
                        TABLE_ICON[n.iconKey] || TONE_ICON[n.tone] || Bell;
                      return (
                        <li
                          key={n.id}
                          className={`relative flex gap-3 px-4 py-3.5 transition hover:bg-blue-50/60 ${
                            n.read ? "opacity-70" : ""
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              TONE_BG[n.tone] || TONE_BG.info
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 leading-snug">
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  markRead(n.id);
                                  if (n.link) navigate(n.link);
                                  setOpen(false);
                                }}
                                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 hover:underline"
                              >
                                View
                              </button>
                              {!n.read && (
                                <button
                                  type="button"
                                  onClick={() => markRead(n.id)}
                                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                                >
                                  Mark read
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => dismiss(n.id)}
                                className="text-[11px] font-medium text-slate-500 hover:text-red-600"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>

                          {!n.read && (
                            <span className="absolute right-3.5 top-4 h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-white" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {who?.isStaffRole || who?.isAdminRole
                    ? "Admin / Staff"
                    : "Resident"}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Toasts – consistent with portal style */}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[99999] flex w-[min(100vw-2rem,22rem)] flex-col gap-2.5">
          {toasts.map((t) => {
            const Icon =
              TABLE_ICON[t.iconKey] || TONE_ICON[t.tone] || Bell;
            return (
              <div
                key={t.toastId}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xl shadow-purple-950/10 ${
                  TONE_TOAST_BORDER[t.tone] || "border-l-blue-500"
                } border-l-4`}
                style={{
                  animation: "toastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    TONE_BG[t.tone] || TONE_BG.info
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {t.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="mt-0.5 rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Tiny animation helpers */}
      <style>{`
        @keyframes notifDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-drop {
          animation: notifDrop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  );
}