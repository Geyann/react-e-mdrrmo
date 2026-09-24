"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  LayoutDashboard, Siren, TriangleAlert, CalendarCheck2, Truck,
  Stethoscope, UserPlus, FileText, Ambulance, Package, Wrench,
  AlertTriangle, Loader2, RefreshCw, ChevronRight, CheckCircle2,
  Clock, Activity, Radio, ArrowUpRight, CircleSlash, ClipboardList,
  ClipboardCheck, XCircle, Eye, ShieldCheck, CalendarClock, MapPin,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

/* =============================================================
 *  CONFIG
 * ============================================================= */

const TABLES = {
  incidents: "reportIncident",
  hazards: "hazard_reports",
  appointments: "appointments",
  vehicles: "borrow-vehicle",
  checkups: "outPatientCheckUp",
  registrations: "pending_registrations",
  inventory: "inventory_reports",
  ambulances: "ambulances",
  supplies: "medical_supplies",
  tools: "tools_inventory",
  slips: "borrower_slip",
  usage: "ambulance_usage",
};

const ROW_LIMIT = 1000;
const AUTO_REFRESH_MS = 30000;

const readAuto = () => {
  try {
    return localStorage.getItem("mdrrmo_dash_auto") !== "off";
  } catch {
    return true;
  }
};
const writeAuto = (on) => {
  try {
    localStorage.setItem("mdrrmo_dash_auto", on ? "on" : "off");
  } catch {
    /* private mode */
  }
};

/* =============================================================
 *  STATUS HELPERS
 * ============================================================= */

const norm = (v) => String(v || "").trim().toLowerCase();

const INCIDENT_OPEN = new Set(["pending", "in progress", "dispatched", "active"]);

/* hazard_reports has TWO overlapping status columns that different admin
   screens write to. Treat a row as approved/rejected if EITHER column
   says so, otherwise pending. */
const hazardStatus = (r) => {
  const s = norm(r.status);
  const rs = norm(r.report_status);
  if (rs === "approved" || s === "approved") return "approved";
  if (rs === "rejected" || s === "rejected") return "rejected";
  return "pending";
};

const TONE = {
  amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  indigo: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  red: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  slate: "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300",
  purple: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
};

const STATUS_TONE = {
  pending: "amber",
  "pending approval": "amber",
  pending_approval: "amber",
  active: "blue",
  "in progress": "blue",
  dispatched: "indigo",
  ongoing: "blue",
  confirmed: "emerald",
  approved: "emerald",
  available: "emerald",
  "in service": "blue",
  in_service: "blue",
  completed: "emerald",
  resolved: "emerald",
  maintenance: "amber",
  rejected: "red",
  declined: "red",
  cancelled: "slate",
  "out of service": "red",
  out_of_service: "red",
};

const toneFor = (s) => STATUS_TONE[norm(s)] || "slate";

const pretty = (s) => {
  const n = norm(s);
  if (!n) return "Unknown";
  return n
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const PIE_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#64748b",
];

const countBy = (rows, fn) => {
  const out = {};
  rows.forEach((r) => {
    const k = fn(r);
    if (k === null || k === undefined || k === "") return;
    out[k] = (out[k] || 0) + 1;
  });
  return out;
};

const localDayKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dayKeyOf = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? null : localDayKey(t);
};

const timeOf = (v) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const fmtWhen = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* =============================================================
 *  NETWORK
 * ============================================================= */

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      );
      if (t && typeof t.unref === "function") t.unref();
    }),
  ]);

const safeFetch = async (table, orderCol, label) => {
  try {
    let q = supabase.from(table).select("*").limit(ROW_LIMIT);
    if (orderCol) q = q.order(orderCol, { ascending: false });
    const res = await withTimeout(q, 10000, label);
    if (res.error) return { table, rows: [], error: res.error.message };
    return { table, rows: res.data || [], error: null };
  } catch (e) {
    return { table, rows: [], error: e?.message || "request failed" };
  }
};

/* =============================================================
 *  SESSION
 *  Staff sign-in writes localStorage.currentStaff and never creates a
 *  Supabase Auth session, so auth.uid() is null. Everything here reads
 *  localStorage and collects every id the staff member may appear as.
 * ============================================================= */

const resolveSession = async () => {
  let parsed = null;
  try {
    const raw = localStorage.getItem("currentStaff");
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return { exists: false };
  }

  const role = norm(parsed.role);
  if (role !== "admin" && role !== "staff" && role !== "moderator") {
    return { exists: false, badRole: true };
  }

  const isAdmin = role === "admin";
  const ids = new Set();
  const add = (v) => {
    if (v === null || v === undefined || v === "") return;
    ids.add(String(v));
  };

  add(parsed.id);
  add(parsed.user_id);
  if (parsed.email) add(parsed.email);

  let staffId = null;
  let fullName = parsed.full_name || parsed.username || parsed.user_id || "";
  let department = parsed.department || "";
  let finalRole = role;

  if (parsed.user_id) {
    try {
      const res = await withTimeout(
        supabase
          .from("staff_users")
          .select("id, full_name, role, department")
          .eq("user_id", parsed.user_id)
          .maybeSingle(),
        6000,
        "staff_users"
      );
      if (res.data) {
        staffId = res.data.id;
        add(res.data.id);
        finalRole = norm(res.data.role) || role;
        fullName = res.data.full_name || fullName;
        department = res.data.department || department;
      }
    } catch {
      /* RLS may block this — local values are enough to render */
    }
  }

  return {
    exists: true,
    isAdmin,
    role: finalRole,
    ids,
    staffId,
    workId: parsed.user_id || "",
    fullName,
    department,
  };
};

/* =============================================================
 *  UI PARTS
 * ============================================================= */

const StatCard = ({ icon: Icon, label, value, sub, accent, tone, to }) => {
  const body = (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 sm:p-5 flex items-center gap-4 h-full hover:border-purple-300 dark:hover:border-purple-600 transition">
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide truncate">
          {label}
        </p>
        {value === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-1" />
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-100 leading-tight">
              {value}
            </p>
            {sub && (
              <p
                className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded ${
                  TONE[tone] || "text-gray-400"
                }`}
              >
                {sub}
              </p>
            )}
          </>
        )}
      </div>
      {to && (
        <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-slate-600 flex-shrink-0" />
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
};

const Panel = ({ title, subtitle, action, children, className = "" }) => (
  <div
    className={`bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-5 ${className}`}
  >
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && (
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

const StatusPill = ({ status }) => {
  const tone = toneFor(status);
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${TONE[tone]}`}
    >
      {pretty(status)}
    </span>
  );
};

const EmptyState = ({ icon: Icon = CircleSlash, text, sub }) => (
  <div className="flex flex-col items-center gap-2 py-10 text-center">
    <Icon className="w-9 h-9 text-gray-300 dark:text-slate-600" />
    <p className="text-sm text-gray-400 dark:text-slate-500">{text}</p>
    {sub && <p className="text-[11px] text-gray-400 dark:text-slate-600 max-w-[16rem]">{sub}</p>}
  </div>
);

const AllClear = ({ text = "All clear" }) => (
  <div className="flex flex-col items-center gap-2 py-6 text-center">
    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
    <p className="text-xs text-gray-400 dark:text-slate-500">{text}</p>
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mt-6 mb-2">
    {children}
  </p>
);

/* =============================================================
 *  COMPONENT
 * ============================================================= */

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [authState, setAuthState] = useState("checking");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState([]);

  const [data, setData] = useState({
    incidents: [], hazards: [], appointments: [], vehicles: [],
    checkups: [], registrations: [], inventory: [], ambulances: [],
    supplies: [], tools: [], slips: [], usage: [],
  });

  const [trend, setTrend] = useState([]);
  const [statusPie, setStatusPie] = useState([]);
  const [sourceVolume, setSourceVolume] = useState([]);
  const [activity, setActivity] = useState([]);

  const [auto, setAuto] = useState(readAuto());
  const autoRef = useRef(null);

  /* ── Role gate ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const s = await resolveSession();
      if (cancelled) return;

      if (!s.exists) {
        setAuthState("denied");
        navigate("/admin", {
          replace: true,
          state: { error: "Please sign in through the admin portal." },
        });
        return;
      }

      setSession(s);
      setAuthState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /* ── Fetch — role decides which tables are read ───────────── */

  const fetchAll = useCallback(async () => {
    if (!session) return;

    const isAdmin = session.isAdmin;

    const specs = isAdmin
      ? [
          [TABLES.incidents, "created_at", "incidents"],
          [TABLES.hazards, "created_at", "hazards"],
          [TABLES.appointments, "created_at", "appointments"],
          [TABLES.vehicles, "created_at", "vehicles"],
          [TABLES.checkups, "created_at", "checkups"],
          [TABLES.registrations, "created_at", "registrations"],
          [TABLES.inventory, "created_at", "inventory"],
          [TABLES.ambulances, "unit_number", "ambulances"],
          [TABLES.supplies, "name", "supplies"],
          [TABLES.tools, "name", "tools"],
        ]
      : [
          // Staff: no pending_registrations (admin-only domain)
          [TABLES.checkups, "created_at", "checkups"],
          [TABLES.vehicles, "created_at", "vehicles"],
          [TABLES.slips, "created_at", "slips"],
          [TABLES.inventory, "created_at", "inventory"],
          [TABLES.appointments, "created_at", "appointments"],
          [TABLES.incidents, "created_at", "incidents"],
          [TABLES.hazards, "created_at", "hazards"],
          [TABLES.supplies, "name", "supplies"],
          [TABLES.tools, "name", "tools"],
          [TABLES.ambulances, "unit_number", "ambulances"],
        ];

    const jobs = await Promise.all(
      specs.map(([t, o, l]) => safeFetch(t, o, l))
    );

    const map = {};
    const failed = [];
    jobs.forEach((j) => {
      map[j.table] = j.rows;
      if (j.error) failed.push(j.table);
    });
    setBlocked(failed);

    const incidents = map[TABLES.incidents] || [];
    const hazards = map[TABLES.hazards] || [];
    const appointments = map[TABLES.appointments] || [];
    const vehicles = map[TABLES.vehicles] || [];
    const checkups = map[TABLES.checkups] || [];
    const registrations = map[TABLES.registrations] || [];
    const inventory = map[TABLES.inventory] || [];
    const ambulances = map[TABLES.ambulances] || [];
    const supplies = map[TABLES.supplies] || [];
    const tools = map[TABLES.tools] || [];
    const slips = map[TABLES.slips] || [];

    setData({
      incidents, hazards, appointments, vehicles, checkups,
      registrations, inventory, ambulances, supplies, tools, slips,
      usage: [],
    });

    /* ---- 7-day trend (role-scoped) ---- */
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        key: localDayKey(d),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        count: 0,
      });
    }
    const dayIndex = new Map(days.map((d, i) => [d.key, i]));

    const addDay = (value) => {
      const k = dayKeyOf(value);
      if (k === null) return;
      const i = dayIndex.get(k);
      if (i !== undefined) days[i].count += 1;
    };

    if (isAdmin) {
      incidents.forEach((r) => addDay(r.created_at));
      hazards.forEach((r) => addDay(r.created_at));
      appointments.forEach((r) => addDay(r.created_at));
      vehicles.forEach((r) => addDay(r.created_at));
      checkups.forEach((r) => addDay(r.created_at));
      registrations.forEach((r) => addDay(r.created_at));
    } else {
      // Staff: only what they actually action
      checkups.forEach((r) => addDay(r.updated_at || r.respondedAt || r.created_at));
      vehicles.forEach((r) => addDay(r.created_at));
      slips.forEach((r) => addDay(r.created_at));
      inventory.forEach((r) => addDay(r.created_at));
    }

    setTrend(days.map(({ label, count }) => ({ name: label, count })));

    /* ---- Pie: admin = incident status, staff = check-up queue ---- */
    if (isAdmin) {
      const counts = countBy(incidents, (r) => norm(r.status) || "pending");
      setStatusPie(
        Object.entries(counts)
          .map(([name, value]) => ({ name: pretty(name), value }))
          .sort((a, b) => b.value - a.value)
      );
    } else {
      const counts = countBy(
        checkups,
        (r) => norm(r.status) || "pending"
      );
      setStatusPie(
        Object.entries(counts)
          .map(([name, value]) => ({ name: pretty(name), value }))
          .sort((a, b) => b.value - a.value)
      );
    }

    /* ---- Volume by source (role-scoped) ---- */
    if (isAdmin) {
      setSourceVolume([
        { name: "Incidents", value: incidents.length },
        { name: "Hazards", value: hazards.length },
        { name: "Appointments", value: appointments.length },
        { name: "Vehicles", value: vehicles.length },
        { name: "Check-Ups", value: checkups.length },
        { name: "Accounts", value: registrations.length },
      ]);
    } else {
      setSourceVolume([
        { name: "Check-Ups", value: checkups.length },
        { name: "Vehicles", value: vehicles.length },
        { name: "Slips", value: slips.length },
        { name: "Reports", value: inventory.length },
        { name: "Incidents", value: incidents.length },
        { name: "Hazards", value: hazards.length },
      ]);
    }

    /* ---- Activity feed (role-scoped) ---- */
    const feed = [];
    const add = (source, id, title, status, extra, ts) => {
      feed.push({
        key: `${source}-${id}`,
        source,
        title,
        status,
        extra,
        ts: timeOf(ts),
      });
    };

    if (isAdmin) {
      incidents.forEach((r) =>
        add("Incident", r.reportIncidentId, r.incidentType || "Incident report", r.status, r.address, r.created_at)
      );
      hazards.forEach((r) =>
        add("Hazard", r.id, `${pretty(r.hazard_category || "hazard")} report`, hazardStatus(r), r.address, r.created_at)
      );
      appointments.forEach((r) =>
        add("Appointment", r.appointmentId, r.purpose || "Appointment", r.status, r.date, r.created_at)
      );
      vehicles.forEach((r) =>
        add("Vehicle", r.borrowerId, r.purpose || "Vehicle dispatch", r.status, r.destination, r.created_at)
      );
      checkups.forEach((r) =>
        add("Check-Up", r.id, r.hospitalName || "Check-up request", r.status, r.patientName, r.created_at)
      );
      registrations.forEach((r) =>
        add("Account", r.id,
          [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username || "Registration",
          r.status, r.email, r.created_at)
      );
      inventory.forEach((r) =>
        add("Inventory", r.id, r.title || "Inventory report", r.status, r.generated_by_name, r.created_at)
      );
    } else {
      checkups.forEach((r) =>
        add("Check-Up", r.id,
          r.hospitalName || "Check-up",
          r.status,
          [r.patientName, r.preferredDate].filter(Boolean).join(" · "),
          r.updated_at || r.respondedAt || r.created_at)
      );
      vehicles.forEach((r) =>
        add("Vehicle", r.borrowerId, r.purpose || "Vehicle dispatch", r.status, r.destination, r.created_at)
      );
      slips.forEach((r) =>
        add("Slip", r.id, r.borrower_name || "Borrower slip", "filed", r.hospital, r.created_at)
      );
      inventory.forEach((r) =>
        add("Report", r.id, r.title || "Inventory report", r.status, r.generated_by_name, r.created_at)
      );
    }

    setActivity(feed.sort((a, b) => b.ts - a.ts).slice(0, isAdmin ? 14 : 12));

    if (failed.length === jobs.length) {
      setError("No data could be loaded. Check your connection and Supabase project settings.");
    } else if (failed.length) {
      setError(`Partial data — unreadable tables: ${failed.join(", ")}`);
    } else {
      setError("");
    }
  }, [session]);

  useEffect(() => {
    if (authState !== "ok") return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      await fetchAll();
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState, fetchAll]);

  /* ── Auto refresh ─────────────────────────────────────────── */

  useEffect(() => {
    if (authState !== "ok" || !auto) return undefined;
    autoRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchAll();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(autoRef.current);
  }, [authState, auto, fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const toggleAuto = () => {
    setAuto((prev) => {
      const next = !prev;
      writeAuto(next);
      return next;
    });
  };

  /* ── "Is this mine?" helpers (staff) ──────────────────────── */

  const mine = useMemo(() => {
    if (!session || session.isAdmin) {
      return {
        vehicles: [],
        slips: [],
        reports: [],
        count: { vehicles: 0, slips: 0, reports: 0 },
      };
    }

    const ids = session.ids;
    const name = norm(session.fullName);

    const mineVehicles = data.vehicles.filter(
      (r) => r.staffId != null && ids.has(String(r.staffId))
    );
    const mineSlips = data.slips.filter(
      (r) => r.staff_id != null && ids.has(String(r.staff_id))
    );
    const mineReports = data.inventory.filter(
      (r) =>
        (r.generated_by != null && ids.has(String(r.generated_by))) ||
        (name && norm(r.generated_by_name) === name)
    );

    return {
      vehicles: mineVehicles,
      slips: mineSlips,
      reports: mineReports,
      count: {
        vehicles: mineVehicles.length,
        slips: mineSlips.length,
        reports: mineReports.length,
      },
    };
  }, [session, data]);

  /* ── Metrics ──────────────────────────────────────────────── */

  const m = useMemo(() => {
    const allStock = [...data.supplies, ...data.tools];
    const lowStock = allStock.filter(
      (r) => Number(r.quantity) <= Number(r.min_quantity)
    );

    const base = {
      lowStock,
      allStockCount: allStock.length,
      totalIncidents: data.incidents.length,
      totalHazards: data.hazards.length,
    };

    if (session?.isAdmin) {
      const openIncidents = data.incidents.filter((r) =>
        INCIDENT_OPEN.has(norm(r.status))
      ).length;
      const highPriority = data.incidents.filter(
        (r) => norm(r.priorityLevel) === "high"
      ).length;
      const pendingHazards = data.hazards.filter(
        (r) => hazardStatus(r) === "pending"
      ).length;
      const criticalHazards = data.hazards.filter(
        (r) => norm(r.risk_level) === "critical"
      ).length;
      const pendingAppointments = data.appointments.filter(
        (r) => norm(r.status) === "pending"
      ).length;
      const pendingVehicles = data.vehicles.filter(
        (r) => norm(r.status) === "pending"
      ).length;
      const ongoingVehicles = data.vehicles.filter(
        (r) => norm(r.status) === "ongoing" || norm(r.status) === "in progress"
      ).length;
      const pendingCheckups = data.checkups.filter(
        (r) => norm(r.status) === "pending"
      ).length;
      const pendingRegs = data.registrations.filter(
        (r) => norm(r.status) === "pending"
      ).length;
      const pendingInv = data.inventory.filter(
        (r) => norm(r.status) === "pending_approval" || norm(r.status) === "pending approval"
      ).length;
      const ambAvailable = data.ambulances.filter(
        (r) => norm(r.status) === "available"
      ).length;
      const ambInService = data.ambulances.filter(
        (r) => norm(r.status) === "in_service" || norm(r.status) === "in service"
      ).length;
      const ambMaintenance = data.ambulances.filter(
        (r) => norm(r.status) === "maintenance"
      ).length;
      const ambOut = data.ambulances.filter(
        (r) => norm(r.status) === "out_of_service" || norm(r.status) === "out of service"
      ).length;
      const ambNoDriver = data.ambulances.filter((r) => !r.assigned_driver).length;

      return {
        ...base,
        openIncidents, highPriority,
        pendingHazards, criticalHazards,
        pendingAppointments,
        pendingVehicles, ongoingVehicles,
        pendingCheckups,
        pendingRegs, pendingInv,
        ambAvailable, ambInService, ambMaintenance, ambOut, ambNoDriver,
        totalAction:
          openIncidents + pendingHazards + pendingAppointments +
          pendingVehicles + pendingCheckups + pendingRegs + pendingInv,
      };
    }

    // Staff metrics
    const awaiting = data.checkups.filter((r) => norm(r.status) === "approved");
    const confirmed = data.checkups.filter((r) => norm(r.status) === "confirmed");
    const completed = data.checkups.filter((r) => norm(r.status) === "completed");
    const declined = data.checkups.filter((r) => norm(r.status) === "declined");
    const myPendingReports = mine.reports.filter(
      (r) => norm(r.status) === "pending_approval" || norm(r.status) === "pending approval"
    ).length;
    const vehiclesOut = data.vehicles.filter(
      (r) => norm(r.status) === "ongoing" || norm(r.status) === "in progress"
    ).length;
    const openIncidents = data.incidents.filter((r) =>
      INCIDENT_OPEN.has(norm(r.status))
    ).length;
    const openHazards = data.hazards.filter(
      (r) => hazardStatus(r) === "pending"
    ).length;

    return {
      ...base,
      awaitingStaff: awaiting.length,
      confirmedCheckups: confirmed.length,
      completedCheckups: completed.length,
      declinedCheckups: declined.length,
      myPendingReports,
      vehiclesOut,
      openIncidents,
      openHazards,
      totalAction: awaiting.length + myPendingReports,
    };
  }, [session, data, mine]);

  /* ── Queues (role-scoped) ─────────────────────────────────── */

  const queues = useMemo(() => {
    if (session?.isAdmin) {
      const build = (rows, keyFn, titleFn, extraFn, statusFn, link) => ({
        items: rows.slice(0, 5).map((r) => ({
          id: keyFn(r),
          title: titleFn(r),
          extra: extraFn ? extraFn(r) : "",
          status: statusFn ? statusFn(r) : r.status,
        })),
        total: rows.length,
        link,
      });

      return [
        {
          ...build(
            data.incidents.filter((r) => INCIDENT_OPEN.has(norm(r.status))),
            (r) => r.reportIncidentId,
            (r) => r.incidentType || "Incident report",
            (r) => r.address,
            (r) => r.status,
            "/admin/report"
          ),
          label: "Incidents",
          icon: Siren,
        },
        {
          ...build(
            data.hazards.filter((r) => hazardStatus(r) === "pending"),
            (r) => r.id,
            (r) => `${pretty(r.hazard_category || "hazard")} report`,
            (r) => r.address,
            () => "pending",
            "/admin/hazard-map"
          ),
          label: "Hazards",
          icon: TriangleAlert,
        },
        {
          ...build(
            data.registrations.filter((r) => norm(r.status) === "pending"),
            (r) => r.id,
            (r) => [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username || "Registration",
            (r) => r.email,
            (r) => r.status,
            "/admin/pending-account"
          ),
          label: "Accounts",
          icon: UserPlus,
        },
        {
          ...build(
            data.checkups.filter((r) => norm(r.status) === "approved"),
            (r) => r.id,
            (r) => r.hospitalName || "Check-up awaiting staff",
            (r) => r.patientName,
            (r) => r.status,
            "/admin/checkup"
          ),
          label: "Check-Ups",
          icon: Stethoscope,
        },
      ];
    }

    // Staff queues — only things this staff member can act on
    const build = (rows, keyFn, titleFn, extraFn, statusFn, link) => ({
      items: rows.slice(0, 5).map((r) => ({
        id: keyFn(r),
        title: titleFn(r),
        extra: extraFn ? extraFn(r) : "",
        status: statusFn ? statusFn(r) : r.status,
      })),
      total: rows.length,
      link,
    });

    return [
      {
        ...build(
          data.checkups.filter((r) => norm(r.status) === "approved"),
          (r) => r.id,
          (r) => r.hospitalName || "Check-up awaiting response",
          (r) => [r.patientName, r.preferredDate].filter(Boolean).join(" · "),
          (r) => r.status,
          "/staff/checkupqueue"
        ),
        label: "Awaiting You",
        icon: ClipboardCheck,
      },
      {
        ...build(
          data.checkups.filter((r) => norm(r.status) === "confirmed"),
          (r) => r.id,
          (r) => r.hospitalName || "Confirmed check-up",
          (r) => [r.patientName, r.preferredDate].filter(Boolean).join(" · "),
          (r) => r.status,
          "/staff/checkupqueue"
        ),
        label: "Confirmed",
        icon: CalendarClock,
      },
      {
        ...build(
          mine.vehicles,
          (r) => r.borrowerId,
          (r) => r.purpose || "Vehicle dispatch",
          (r) => r.destination,
          (r) => r.status,
          "/staff/borrow"
        ),
        label: "My Vehicles",
        icon: Truck,
      },
      {
        ...build(
          mine.slips,
          (r) => r.id,
          (r) => r.borrower_name || "Borrower slip",
          (r) => [r.plateNo, r.hospital].filter(Boolean).join(" · "),
          () => "filed",
          "/staff/borrower-slip"
        ),
        label: "My Slips",
        icon: ClipboardList,
      },
    ];
  }, [session, data, mine]);

  /* ── Loading / denied ─────────────────────────────────────── */

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400 font-semibold">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (authState === "denied") return null;

  /* ── Render ───────────────────────────────────────────────── */

  const isAdmin = session?.isAdmin;

  const activityIcon = (name) => {
    const map = {
      Incident: Siren,
      Hazard: TriangleAlert,
      Appointment: CalendarCheck2,
      Vehicle: Truck,
      "Check-Up": Stethoscope,
      Account: UserPlus,
      Inventory: FileText,
      Report: FileText,
      Slip: ClipboardList,
    };
    return map[name] || Activity;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 pt-6 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* ═══ HEADER ═══ */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-xl px-5 sm:px-8 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {isAdmin ? "Centralized Dashboard" : "My Work Dashboard"}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {isAdmin
                  ? "Naic MDRRMO — live overview of all operations"
                  : "Your assigned queues, submissions, and inventory"}
                {session?.fullName ? ` · ${session.fullName}` : ""}
                {session?.department ? ` · ${session.department}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1.5 bg-white/15 text-white rounded-xl text-[11px] font-bold uppercase tracking-wide">
              {isAdmin ? "Admin" : pretty(session?.role)}
            </span>
            <button
              type="button"
              onClick={toggleAuto}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                auto
                  ? "bg-white text-purple-700 hover:bg-white/90"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${auto ? "animate-pulse" : ""}`} />
              Auto {auto ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition text-white font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ═══ ACTION BANNER ═══ */}
        {!loading && m.totalAction > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold flex-1 min-w-[12rem]">
              <strong>{m.totalAction}</strong> item
              {m.totalAction === 1 ? "" : "s"} awaiting action
            </p>
            <div className="flex flex-wrap gap-2">
              {queues
                .filter((q) => q.total > 0)
                .map((q) => (
                  <Link
                    key={q.link + q.label}
                    to={q.link}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {q.total} <ChevronRight className="w-3 h-3" />
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {error && (
          <div className="mt-5 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ADMIN — every queue, every domain
            ══════════════════════════════════════════════════════ */}
        {isAdmin && (
          <>
            <SectionLabel>Approval Queues</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon={Siren}
                label="Open Incidents"
                value={loading ? null : m.openIncidents}
                sub={!loading && m.highPriority > 0 ? `${m.highPriority} high priority` : null}
                tone="amber"
                accent="bg-blue-600"
                to="/admin/report"
              />
              <StatCard
                icon={TriangleAlert}
                label="Pending Hazards"
                value={loading ? null : m.pendingHazards}
                sub={!loading && m.criticalHazards > 0 ? `${m.criticalHazards} critical` : null}
                tone="red"
                accent="bg-purple-600"
                to="/admin/hazard-map"
              />
              <StatCard
                icon={CalendarCheck2}
                label="Pending Appointments"
                value={loading ? null : m.pendingAppointments}
                accent="bg-amber-500"
                to="/admin/appointment"
              />
              <StatCard
                icon={Truck}
                label="Pending Vehicle Reqs"
                value={loading ? null : m.pendingVehicles}
                sub={!loading && m.ongoingVehicles > 0 ? `${m.ongoingVehicles} out` : null}
                tone="blue"
                accent="bg-emerald-600"
                to="/admin/borrow"
              />
              <StatCard
                icon={Stethoscope}
                label="Pending Check-Ups"
                value={loading ? null : m.pendingCheckups}
                accent="bg-cyan-600"
                to="/admin/checkup"
              />
              <StatCard
                icon={UserPlus}
                label="Pending Accounts"
                value={loading ? null : m.pendingRegs}
                accent="bg-indigo-600"
                to="/admin/pending-account"
              />
              <StatCard
                icon={FileText}
                label="Pending Reports"
                value={loading ? null : m.pendingInv}
                accent="bg-teal-600"
                to="/admin/inventory"
              />
              <StatCard
                icon={Wrench}
                label="Low Stock Items"
                value={loading ? null : m.lowStock.length}
                sub={!loading ? `of ${m.allStockCount} tracked` : null}
                tone={m.lowStock.length > 0 ? "red" : "emerald"}
                accent="bg-rose-600"
                to="/admin/inventory"
              />
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STAFF — only their own actionable work
            ══════════════════════════════════════════════════════ */}
        {!isAdmin && (
          <>
            <SectionLabel>Assigned To Me</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon={ClipboardCheck}
                label="Awaiting My Response"
                value={loading ? null : m.awaitingStaff}
                sub={!loading && m.awaitingStaff > 0 ? "action needed" : null}
                tone={m.awaitingStaff > 0 ? "amber" : "emerald"}
                accent="bg-blue-600"
                to="/staff/checkupqueue"
              />
              <StatCard
                icon={CalendarClock}
                label="Confirmed Schedule"
                value={loading ? null : m.confirmedCheckups}
                accent="bg-cyan-600"
                to="/staff/checkupqueue"
              />
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={loading ? null : m.completedCheckups}
                accent="bg-emerald-600"
                to="/staff/checkupqueue"
              />
              <StatCard
                icon={Truck}
                label="My Vehicle Reqs"
                value={loading ? null : mine.count.vehicles}
                sub={!loading && m.vehiclesOut > 0 ? `${m.vehiclesOut} out` : null}
                tone="blue"
                accent="bg-indigo-600"
                to="/staff/borrow"
              />
              <StatCard
                icon={ClipboardList}
                label="My Borrower Slips"
                value={loading ? null : mine.count.slips}
                accent="bg-teal-600"
                to="/staff/borrower-slip"
              />
              <StatCard
                icon={FileText}
                label="My Reports"
                value={loading ? null : mine.count.reports}
                sub={!loading && m.myPendingReports > 0 ? `${m.myPendingReports} pending` : null}
                tone={m.myPendingReports > 0 ? "amber" : undefined}
                accent="bg-purple-600"
                to="/staff/inventory"
              />
              <StatCard
                icon={Package}
                label="Medical Supplies"
                value={loading ? null : data.supplies.length}
                accent="bg-rose-600"
                to="/staff/inventory"
              />
              <StatCard
                icon={Wrench}
                label="Low Stock Items"
                value={loading ? null : m.lowStock.length}
                sub={!loading ? `of ${m.allStockCount} tracked` : null}
                tone={m.lowStock.length > 0 ? "red" : "emerald"}
                accent="bg-amber-600"
                to="/staff/inventory"
              />
            </div>

            <SectionLabel>Situational Awareness</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon={Siren}
                label="Open Incidents"
                value={loading ? null : m.openIncidents}
                accent="bg-blue-500"
              />
              <StatCard
                icon={TriangleAlert}
                label="Unreviewed Hazards"
                value={loading ? null : m.openHazards}
                accent="bg-purple-500"
              />
              <StatCard
                icon={Ambulance}
                label="Fleet Units"
                value={loading ? null : data.ambulances.length}
                sub={!loading ? `${m.ambAvailable} available` : null}
                tone="emerald"
                accent="bg-slate-700"
              />
              <StatCard
                icon={XCircle}
                label="Declined Check-Ups"
                value={loading ? null : m.declinedCheckups}
                tone={m.declinedCheckups > 0 ? "red" : undefined}
                accent="bg-red-500"
              />
            </div>
          </>
        )}

        {/* ═══ CHARTS ROW 1 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mt-5">
          <Panel
            className="lg:col-span-2"
            title={isAdmin ? "System Activity — Last 7 Days" : "My Activity — Last 7 Days"}
            subtitle={
              isAdmin
                ? "Combined submissions across every request type"
                : "Queue updates and your own submissions"
            }
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={isAdmin ? "Submissions" : "Activity"}
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#activityFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title={isAdmin ? "Incident Status" : "Check-Up Queue"}
            subtitle={isAdmin ? "Current distribution" : "By current status"}
          >
            {loading ? (
              <div className="flex items-center justify-center h-[260px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : statusPie.length === 0 ? (
              <EmptyState
                icon={isAdmin ? Siren : Stethoscope}
                text={isAdmin ? "No incidents yet" : "No check-up requests yet"}
              />
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {statusPie.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        {/* ═══ CHARTS ROW 2 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-5">
          <Panel
            title={isAdmin ? "Requests by Type" : "Workload by Type"}
            subtitle={isAdmin ? "Total volume per submission source" : "Volume in your domain"}
          >
            {loading ? (
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={sourceVolume} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name="Total"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title={isAdmin ? "Hazard Categories" : "Inventory Health"}
            subtitle={
              isAdmin
                ? "Distribution by classification"
                : `${m.allStockCount} items tracked across tools and supplies`
            }
            action={
              !isAdmin ? (
                <Link
                  to="/staff/inventory"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Manage
                </Link>
              ) : null
            }
          >
            {loading ? (
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : isAdmin ? (
              (() => {
                const cats = Object.entries(
                  countBy(data.hazards, (r) => r.hazard_category || "uncategorized")
                )
                  .map(([name, value]) => ({ name: pretty(name), value }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6);

                if (cats.length === 0) {
                  return <EmptyState icon={TriangleAlert} text="No hazard reports yet" />;
                }

                return (
                  <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={cats}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="#6b7280"
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#6b7280"
                          tick={{ fontSize: 10 }}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "none",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          name="Reports"
                          fill="#f59e0b"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={26}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()
            ) : (() => {
                const buckets = [
                  { name: "Healthy", value: m.allStockCount - m.lowStock.length, color: "#10b981" },
                  { name: "Low Stock", value: m.lowStock.length, color: "#ef4444" },
                ].filter((b) => b.value > 0);

                if (buckets.length === 0) {
                  return <EmptyState icon={Package} text="No inventory tracked" />;
                }

                return (
                  <>
                    <div style={{ width: "100%", height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={buckets}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                          >
                            {buckets.map((b) => (
                              <Cell key={b.name} fill={b.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5 mt-3">
                      {m.lowStock.slice(0, 4).map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
                        >
                          {item.unit ? (
                            <Package className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : (
                            <Wrench className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 whitespace-nowrap ml-auto">
                            <strong className="text-red-600 dark:text-red-400">
                              {item.quantity}
                            </strong>
                            {" / "}
                            {item.min_quantity}
                          </span>
                        </li>
                      ))}
                      {m.lowStock.length === 0 && (
                        <li>
                          <AllClear text="All inventory above minimum levels" />
                        </li>
                      )}
                    </ul>
                  </>
                );
              })()}
          </Panel>
        </div>

        {/* ═══ QUEUES ═══ */}
        <SectionLabel>
          {isAdmin ? "Awaiting Your Decision" : "Your Queues"}
        </SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {queues.map((q) => {
            const QIcon = q.icon || Clock;
            return (
              <Panel
                key={q.link + q.label}
                title={q.label}
                subtitle={`${q.total} ${q.total === 1 ? "item" : "items"}`}
                action={
                  <Link
                    to={q.link}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-purple-600 transition flex-shrink-0"
                    title="Open"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                }
              >
                {q.items.length === 0 ? (
                  <AllClear />
                ) : (
                  <ul className="space-y-2">
                    {q.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/40"
                      >
                        <QIcon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">
                            {it.title}
                          </p>
                          {it.extra && (
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                              {it.extra}
                            </p>
                          )}
                        </div>
                        <StatusPill status={it.status} />
                      </li>
                    ))}
                    {q.total > q.items.length && (
                      <li>
                        <Link
                          to={q.link}
                          className="block text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                        >
                          +{q.total - q.items.length} more
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>

        {/* ═══ ADMIN: FLEET + LOW STOCK ═══ */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-5">
            <Panel
              title="Ambulance Fleet"
              subtitle={`${data.ambulances.length} unit${data.ambulances.length === 1 ? "" : "s"} registered`}
              action={
                <Link
                  to="/admin/inventory"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Manage
                </Link>
              }
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : data.ambulances.length === 0 ? (
                <EmptyState icon={Ambulance} text="No ambulances registered" />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                    {[
                      { label: "Available", value: m.ambAvailable, cls: "text-emerald-600 dark:text-emerald-400" },
                      { label: "In Service", value: m.ambInService, cls: "text-blue-600 dark:text-blue-400" },
                      { label: "Maintenance", value: m.ambMaintenance, cls: "text-amber-600 dark:text-amber-400" },
                      { label: "Out", value: m.ambOut, cls: "text-red-600 dark:text-red-400" },
                      { label: "No Driver", value: m.ambNoDriver, cls: "text-purple-600 dark:text-purple-400" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-700/40 text-center"
                      >
                        <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
                        <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {data.ambulances.slice(0, 4).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/40"
                      >
                        <Ambulance className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200">
                          {a.unit_number}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate flex-1">
                          {a.plate_number}
                          {a.assigned_driver ? ` · ${a.assigned_driver}` : " · no driver"}
                        </span>
                        <StatusPill status={a.status} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <Panel
              title="Low Stock Alerts"
              subtitle={`${m.lowStock.length} at or below minimum`}
              action={
                <Link
                  to="/admin/inventory"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Replenish
                </Link>
              }
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : m.lowStock.length === 0 ? (
                <AllClear text="All inventory above minimum levels" />
              ) : (
                <ul className="space-y-1.5">
                  {m.lowStock.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
                    >
                      {item.unit ? (
                        <Package className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <Wrench className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 whitespace-nowrap ml-auto">
                        <strong className="text-red-600 dark:text-red-400">{item.quantity}</strong>
                        {" / "}
                        {item.min_quantity} {item.unit || ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {/* ═══ STAFF: MY RECORDS ═══ */}
        {!isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-5">
            <Panel
              title="My Borrower Slips"
              subtitle={`${mine.count.slips} filed by you`}
              action={
                <Link
                  to="/staff/borrower-slip"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  New Slip
                </Link>
              }
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : mine.slips.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  text="No slips filed yet"
                  sub="Borrower slips you create are listed here for printing."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wide border-b border-gray-100 dark:border-slate-700">
                        <th className="pb-2 pr-3">Borrower</th>
                        <th className="pb-2 pr-3">Plate</th>
                        <th className="pb-2 pr-3">Hospital</th>
                        <th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.slips.slice(0, 6).map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                        >
                          <td className="py-2 pr-3 font-semibold text-gray-700 dark:text-slate-200">
                            {s.borrower_name || "—"}
                          </td>
                          <td className="py-2 pr-3 text-gray-500 dark:text-slate-400 font-mono text-xs">
                            {s.plateNo || "—"}
                          </td>
                          <td className="py-2 pr-3 text-gray-500 dark:text-slate-400 text-xs max-w-[10rem] truncate">
                            {s.hospital || "—"}
                          </td>
                          <td className="py-2 text-gray-400 dark:text-slate-500 text-[11px] whitespace-nowrap">
                            {s.date || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel
              title="My Inventory Reports"
              subtitle={`${mine.count.reports} generated by you`}
              action={
                <Link
                  to="/staff/inventory"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Generate
                </Link>
              }
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : mine.reports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  text="No reports generated"
                  sub="Reports you create are sent to an admin for approval."
                />
              ) : (
                <ul className="space-y-2">
                  {mine.reports.slice(0, 6).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/40"
                    >
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">
                          {r.title || "Inventory report"}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          {new Date(r.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <StatusPill status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {/* ═══ RECENT ACTIVITY ═══ */}
        <Panel
          className="mt-5"
          title={isAdmin ? "Recent Activity" : "My Recent Activity"}
          subtitle={
            isAdmin
              ? "Latest submissions across all systems"
              : "Your queue updates and submissions"
          }
          action={
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              text={isAdmin ? "No activity yet" : "No activity yet"}
              sub={
                isAdmin
                  ? "Submissions will appear here as they are filed."
                  : "Submit a request or respond to a queue item to see it here."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wide border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Summary</th>
                    <th className="pb-3 pr-4">Detail</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">When</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a) => {
                    const AIcon = activityIcon(a.source);
                    return (
                      <tr
                        key={a.key}
                        className="border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                            <AIcon className="w-3.5 h-3.5 text-gray-400" />
                            {a.source}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-gray-700 dark:text-slate-200 max-w-[16rem] truncate">
                          {a.title}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500 dark:text-slate-400 max-w-[14rem] truncate">
                          {a.extra || "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusPill status={a.status} />
                        </td>
                        <td className="py-2.5 pr-4 text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
                          {a.ts ? fmtWhen(a.ts) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ═══ TOTALS FOOTER ═══ */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(isAdmin
            ? [
                { label: "Incidents", value: m.totalIncidents, icon: Siren },
                { label: "Hazards", value: m.totalHazards, icon: TriangleAlert },
                { label: "Appointments", value: data.appointments.length, icon: CalendarCheck2 },
                { label: "Vehicle Reqs", value: data.vehicles.length, icon: Truck },
                { label: "Check-Ups", value: data.checkups.length, icon: Stethoscope },
                { label: "Accounts", value: data.registrations.length, icon: UserPlus },
              ]
            : [
                { label: "Check-Ups", value: data.checkups.length, icon: Stethoscope },
                { label: "My Vehicles", value: mine.count.vehicles, icon: Truck },
                { label: "My Slips", value: mine.count.slips, icon: ClipboardList },
                { label: "My Reports", value: mine.count.reports, icon: FileText },
                { label: "Supplies", value: data.supplies.length, icon: Package },
                { label: "Tools", value: data.tools.length, icon: Wrench },
              ]
          ).map((t) => (
            <div
              key={t.label}
              className="bg-white dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700 p-3 flex items-center gap-2"
            >
              <t.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-none">
                  {loading ? "—" : t.value}
                </p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide truncate">
                  {t.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ DIAGNOSTICS ═══ */}
        <div className="mt-5 text-center">
          {blocked.length > 0 ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="inline w-3 h-3 mr-1" />
              Blocked by row-level security: {blocked.join(", ")}
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 dark:text-slate-600">
              {isAdmin ? "Admin view" : "Staff view — your work only"} ·{" "}
              {blocked.length === 0 ? "all sources readable" : ""} · auto-refresh{" "}
              {auto ? `every ${AUTO_REFRESH_MS / 1000}s` : "disabled"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
