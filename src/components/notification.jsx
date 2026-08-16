"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  Bell, BellRing, CheckCheck, CalendarCheck2, Truck, Stethoscope,
  CheckCircle2, XCircle, Trash2, X,
} from "lucide-react";

/* =============================================================
 *  CONFIG — edit these to match your tables / preferences
 * ============================================================= */

const WATCH_TABLES = ["appointments", "borrow-vehicle", "outPatientCheckUp"];

// How often we re-scan (fallback when Realtime is not enabled).
// Lower to 3000 while testing if you want faster feedback.
const POLL_INTERVAL_MS = 20000;

const TOAST_DURATION_MS = 6000;

const MAX_NOTIFICATIONS = 60;

// FIX: true = also notify about records that are ALREADY approved/rejected
// the first time the component sees them. With false, records approved
// BEFORE the bell loads are silently baselined and you'll never see them.
const NOTIFY_ON_FIRST_SEEN = true;

// FIX: print diagnostics to the browser console. Set false in production.
const DEBUG = true;
const dbg = (...args) => { if (DEBUG) console.log("[Notification]", ...args); };

const SUCCESS_STATUSES = ["approved", "confirmed"];
const FAILURE_STATUSES = ["rejected", "declined", "cancelled"];

const STATUS_LABEL = {
  approved: "Approved", confirmed: "Confirmed",
  rejected: "Rejected", declined: "Declined", cancelled: "Cancelled",
};

const TABLE_META = {
  appointments: {
    label: "Appointment",
    icon: CalendarCheck2,
    link: "/track",
    describe: (r) => ({
      title: "Appointment",
      message: [
        r.purpose,
        [r.date, r.time].filter(Boolean).join(" at "),
      ].filter(Boolean).join(" — "),
    }),
  },
  "borrow-vehicle": {
    label: "Vehicle Dispatch Request",
    icon: Truck,
    link: "/home",
    describe: (r) => ({
      title: "Dispatch Request",
      message: [
        r.vehicle ? `Vehicle: ${r.vehicle}` : null,
        r.destination ? `Destination: ${r.destination}` : null,
        [r.date, r.time].filter(Boolean).join(" at "),
      ].filter(Boolean).join(" · "),
    }),
  },
  outPatientCheckUp: {
    label: "Out-Patient Checkup",
    icon: Stethoscope,
    link: "/home",
    describe: (r) => ({
      title: "Checkup Appointment",
      message: [
        r.patientName ? `Patient: ${r.patientName}` : null,
        [r.preferredDate, r.preferredTime].filter(Boolean).join(" at "),
      ].filter(Boolean).join(" · "),
    }),
  },
};

/* =============================================================
 *  Storage helpers (per-user, survives reloads)
 * ============================================================= */

const storageKeys = (userId) => ({
  cache: `mdrrmo_notif_cache_${userId}`,
  list: `mdrrmo_notif_list_${userId}`,
});

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};

const writeJSON = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

/* =============================================================
 *  Identity + matching (mirrors trackAppointment.jsx logic)
 * ============================================================= */

const resolveIdentity = async () => {
  let pendingUserId = null; // UUID from pending_registrations
  let authUserId = null;    // UUID from auth.users
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      const u = JSON.parse(raw);
      pendingUserId = u.id || u.user_id || null;
    }
  } catch { /* ignore */ }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    authUserId = user?.id || null;
  } catch { /* ignore */ }
  return { pendingUserId, authUserId };
};

const matchesUser = (row, ids) =>
  [row.userId, row.user_id, row.user_id_from_auth].some(
    (v) => v && (v === ids.pendingUserId || v === ids.authUserId)
  );

// FIX: build a PostgREST filter for the current user — SAME columns and
// quoting as trackAppointment.jsx ("userId" is camelCase, so double-quoted).
const buildUserFilter = (ids) => {
  if (ids.authUserId && ids.pendingUserId) {
    return `"userId".eq.${ids.pendingUserId},user_id_from_auth.eq.${ids.authUserId}`;
  }
  if (ids.pendingUserId) return `"userId".eq.${ids.pendingUserId}`;
  if (ids.authUserId) return `user_id_from_auth.eq.${ids.authUserId}`;
  return null;
};

/* =============================================================
 *  Component
 * ============================================================= */

export default function Notification() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [noUser, setNoUser] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const idsRef = useRef({ pendingUserId: null, authUserId: null });
  const cacheRef = useRef({});
  const toastTimersRef = useRef({});

  const unreadCount = notifications.filter((n) => !n.read).length;

  const persistCache = useCallback(() => {
    const uid = idsRef.current.authUserId || idsRef.current.pendingUserId;
    if (uid) writeJSON(storageKeys(uid).cache, cacheRef.current);
  }, []);

  const persistList = useCallback((list) => {
    const uid = idsRef.current.authUserId || idsRef.current.pendingUserId;
    if (uid) writeJSON(storageKeys(uid).list, list);
  }, []);

  /* Core: record a status change -> add notification + toast */
  const handleStatusEvent = useCallback((table, row, status) => {
    const meta = TABLE_META[table];
    if (!meta) return;

    const recordId = row.id ?? row.appointmentId ?? row.borrowerId ?? "unknown";
    const key = `${table}::${recordId}`;
    const previous = cacheRef.current[key];

    cacheRef.current[key] = status;
    persistCache();

    // Realtime re-delivers the same row on unrelated updates — dedupe.
    if (previous && previous === status) return;

    const isSuccess = SUCCESS_STATUSES.includes(status);
    const { title, message } = meta.describe(row);
    const notification = {
      id: `${key}::${status}`,
      table,
      recordId,
      status,
      title: `${title} ${STATUS_LABEL[status] || status}`,
      message: message || "Status updated.",
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      const next = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
      persistList(next);
      return next;
    });

    setToasts((prev) => [
      ...prev.filter((t) => t.id !== notification.id),
      { id: notification.id, type: isSuccess ? "success" : "error",
        title: notification.title, message: notification.message },
    ].slice(-3));

    dbg(`Status change → ${table} #${recordId}: ${previous || "(first seen)"} → ${status}`);
  }, [persistCache, persistList]);

  /* FIX: fetch the user's own rows — server-side filter first,
     fallback to a large unfiltered scan + client-side match. */
  const fetchRecentRows = useCallback(async (table, ids) => {
    const filter = buildUserFilter(ids);

    if (filter) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .or(filter)
          .limit(100);
        if (error) throw error;
        return data || [];
      } catch (err) {
        // Table doesn't have one of the filter columns (e.g. no
        // user_id_from_auth) → fall back to client-side matching below.
        dbg(`Filter failed on "${table}" (${err.message}) → client-side fallback`);
      }
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []).filter((r) => matchesUser(r, ids));
    } catch (err) {
      console.warn(`[Notification] Skipping table "${table}":`, err.message);
      return null;
    }
  }, []);

  /* Scan every watched table; fire only on status transitions */
  const scanAllTables = useCallback(async () => {
    const ids = idsRef.current;
    if (!ids.pendingUserId && !ids.authUserId) return;

    for (const table of WATCH_TABLES) {
      const rows = await fetchRecentRows(table, ids);
      if (!rows) continue;
      dbg(`${table}: ${rows.length} row(s) for user`);

      for (const row of rows) {
        const status = String(row.status || "").toLowerCase();
        const isRelevant =
          SUCCESS_STATUSES.includes(status) || FAILURE_STATUSES.includes(status);
        if (!isRelevant) continue;

        const recordId = row.id ?? row.appointmentId ?? row.borrowerId ?? "unknown";
        const key = `${table}::${recordId}`;
        const previous = cacheRef.current[key];

        if (!previous) {
          // Baseline: remember it silently so we only notify on changes.
          if (NOTIFY_ON_FIRST_SEEN) handleStatusEvent(table, row, status);
          else cacheRef.current[key] = status;
          continue;
        }
        if (previous !== status) handleStatusEvent(table, row, status);
      }
    }
    persistCache();
  }, [fetchRecentRows, handleStatusEvent, persistCache]);

  /* ---- init: identity, cache, first silent scan ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ids = await resolveIdentity();
      if (cancelled) return;
      if (!ids.pendingUserId && !ids.authUserId) { setNoUser(true); return; }

      idsRef.current = ids;
      const uid = ids.authUserId || ids.pendingUserId;
      cacheRef.current = readJSON(storageKeys(uid).cache, {});
      setNotifications(readJSON(storageKeys(uid).list, []));
      setReady(true);
      dbg("identity:", ids);

      await scanAllTables();
    })();

    return () => { cancelled = true; };
  }, [scanAllTables]);

  /* ---- polling fallback ---- */
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(scanAllTables, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") scanAllTables();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, scanAllTables]);

  /* ---- Supabase Realtime (instant; ignored if not enabled) ---- */
  useEffect(() => {
    if (!ready) return;
    const channel = supabase
      .channel("mdrrmo-notification-watcher")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const { table, new: row } = payload;
        if (!WATCH_TABLES.includes(table) || !row) return;
        if (!matchesUser(row, idsRef.current)) return;

        const status = String(row.status || "").toLowerCase();
        const isRelevant =
          SUCCESS_STATUSES.includes(status) || FAILURE_STATUSES.includes(status);
        if (!isRelevant) return;

        dbg(`realtime ${payload.eventType} on ${table} #${row.id}`, status);
        handleStatusEvent(table, row, status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ready, handleStatusEvent]);

  /* ---- auto-dismiss toasts (FIX: per-toast timers, not reset-all) ---- */
  useEffect(() => {
    const liveIds = new Set(toasts.map((t) => t.id));
    Object.keys(toastTimersRef.current).forEach((id) => {
      if (!liveIds.has(id)) {
        clearTimeout(toastTimersRef.current[id]);
        delete toastTimersRef.current[id];
      }
    });
    toasts.forEach((t) => {
      if (!toastTimersRef.current[t.id]) {
        toastTimersRef.current[t.id] = setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
          delete toastTimersRef.current[t.id];
        }, TOAST_DURATION_MS);
      }
    });
  }, [toasts]);

  useEffect(() => {
    const ref = toastTimersRef;
    return () => {
      Object.values(ref.current).forEach(clearTimeout);
      ref.current = {};
    };
  }, []);

  if (noUser) return null;

  const markRead = (id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistList(next);
      return next;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistList(next);
      return next;
    });
  };

  const clearAll = () => { setNotifications([]); persistList([]); };

  const openItem = (n) => {
    markRead(n.id);
    setOpen(false);
    const link = TABLE_META[n.table]?.link;
    if (link) navigate(link);
  };

  const timeAgo = (iso) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative">
      {/* ===== Bell button ===== */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative rounded-xl p-2 text-white transition hover:bg-white hover:text-gray-700"
      >
        {unreadCount > 0 ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ===== Dropdown ===== */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount} new
                  </span>
                )}
              </p>
              {notifications.length > 0 && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={markAllRead} title="Mark all as read"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={clearAll} title="Clear all"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <Bell className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No notifications yet</p>
                  <p className="text-xs text-slate-400">
                    You'll be alerted here when a request or appointment is approved.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TABLE_META[n.table];
                  const Icon = meta?.icon || Bell;
                  const isSuccess = SUCCESS_STATUSES.includes(n.status);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openItem(n)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        n.read ? "bg-white" : "bg-blue-50/60"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        isSuccess ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">{n.title}</span>
                          <span className="flex-shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{n.message}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== Toasts ===== */}
      <div className="fixed right-4 top-20 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`notif-toast-in flex items-start gap-3 rounded-xl border bg-white p-3 shadow-xl ${
            t.type === "success" ? "border-green-200" : "border-red-200"
          }`}>
            {t.type === "success"
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              : <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">{t.title}</p>
              <p className="truncate text-xs text-slate-500">{t.message}</p>
            </div>
            <button type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes notifToastIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .notif-toast-in { animation: notifToastIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}