"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../createClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Siren,
  TriangleAlert,
  CalendarCheck2,
  Truck,
  Stethoscope,
  CalendarDays,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
  Activity,
  Target,
  User,
} from "lucide-react";

/* =============================================================
 *  CONFIG
 * ============================================================= */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PIE_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#64748b",
];

const SOURCES = [
  {
    key: "incident",
    table: "reportIncident",
    idKey: "reportIncidentId",
    label: "Incident",
    color: "#ef4444",
    dateField: "date",
    categoryField: "incidentType",
    icon: Siren,
  },
  {
    key: "hazard",
    table: "hazard_reports",
    idKey: "id",
    label: "Hazard",
    color: "#f59e0b",
    dateField: "date_observed",
    categoryField: "hazard_category",
    icon: TriangleAlert,
  },
  {
    key: "appointment",
    table: "appointments",
    idKey: "appointmentId",
    label: "Appointment",
    color: "#8b5cf6",
    dateField: "date",
    categoryField: "purpose",
    icon: CalendarCheck2,
  },
  {
    key: "vehicle",
    table: "borrow-vehicle",
    idKey: "borrowerId",
    label: "Vehicle",
    color: "#10b981",
    dateField: "date",
    categoryField: "vehicle",
    icon: Truck,
  },
  {
    key: "checkup",
    table: "outPatientCheckUp",
    idKey: "id",
    label: "Check-Up",
    color: "#06b6d4",
    dateField: "preferredDate",
    categoryField: "patientFor",
    icon: Stethoscope,
  },
];

const ROW_LIMIT = 1000;

const OPEN_STATUSES = new Set([
  "pending", "active", "in progress", "dispatched",
  "approved", "ongoing", "confirmed",
]);

const CLOSED_STATUSES = new Set([
  "resolved", "completed", "approved", "confirmed",
]);

/* =============================================================
 *  HELPERS
 * ============================================================= */

const norm = (v) => String(v || "").trim().toLowerCase();

const digits = (s) => String(s || "").replace(/\D/g, "");

const pretty = (s) => {
  const n = norm(s);
  if (!n) return "Unknown";
  return n
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const timeOf = (v) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/* Timezone-safe — never new Date() on a text date column. */
const parseDate = (value) => {
  if (!value) return null;

  const m = String(value).slice(0, 10).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return {
      year,
      month,
      date: new Date(year, month - 1, day),
    };
  }

  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return null;

  return {
    year: t.getFullYear(),
    month: t.getMonth() + 1,
    date: t,
  };
};

const pct = (count, total) =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "—";

const avg = (sum, count) =>
  count > 0 ? (sum / count).toFixed(1) : "0";

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
    if (res.error) {
      return { table, rows: [], error: res.error.message };
    }
    return { table, rows: res.data || [], error: null };
  } catch (e) {
    return { table, rows: [], error: e?.message || "request failed" };
  }
};

const loadAll = async () => {
  const jobs = await Promise.all(
    SOURCES.map((s) => safeFetch(s.table, "created_at", s.label))
  );

  const map = {};
  const blocked = [];

  jobs.forEach((j) => {
    map[j.table] = j.rows;
    if (j.error) blocked.push(j.table);
  });

  return { map, blocked };
};

/* =============================================================
 *  IDENTITY
 *  Each table stores the owner's id in a different column, so
 *  gather every id plus email and phone as fallbacks.
 * ============================================================= */

const resolveIdentity = async () => {
  const ids = new Set();

  const add = (v) => {
    if (v === null || v === undefined || v === "") return;
    ids.add(String(v));
  };

  let email = "";
  let phone = "";
  let name = "";
  let role = "guest";
  let exists = false;

  const absorb = (p) => {
    if (!p) return;
    add(p.id);
    add(p.user_id);
    if (!email && p.email) email = p.email;
    if (!phone && p.mobile_number) phone = p.mobile_number;
    if (p.role && role === "guest") role = p.role;
    const n =
      p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
    if (n && !name) name = n;
  };

  const FIELDS =
    "id, full_name, first_name, last_name, user_id, role, email, mobile_number";

  try {
    const result = await supabase.auth.getUser();
    const user = result.data ? result.data.user : null;
    if (user) {
      exists = true;
      add(user.id);
      email = user.email || "";
      name = email;

      const p = await withTimeout(
        supabase
          .from("profiles")
          .select(FIELDS)
          .eq("id", user.id)
          .maybeSingle(),
        6000,
        "profiles/auth"
      );
      if (p.data) absorb(p.data);
    }
  } catch {
    /* no auth session */
  }

  const rawUser = localStorage.getItem("currentUser");
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      exists = true;
      add(u.id);
      add(u.user_id);
      if (!email && u.email) email = u.email;
      if (!phone && u.mobile_number) phone = u.mobile_number;
      if (!name) {
        name =
          u.full_name ||
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.email ||
          "Resident";
      }

      if (u.email) {
        const p = await withTimeout(
          supabase
            .from("profiles")
            .select(FIELDS)
            .eq("email", u.email)
            .maybeSingle(),
          6000,
          "profiles/email"
        );
        if (p.data) absorb(p.data);
      }
    } catch {
      /* malformed JSON */
    }
  }

  const rawStaff = localStorage.getItem("currentStaff");
  if (rawStaff) {
    try {
      const s = JSON.parse(rawStaff);
      exists = true;
      add(s.id);
      add(s.user_id);
      if (s.email) {
        add(s.email);
        if (!email) email = s.email;
      }
      name = s.full_name || s.username || s.user_id || "Staff Member";
      role = s.role || "staff";
    } catch {
      /* malformed JSON */
    }
  }

  return { ids, email, phone, name, role, exists };
};

const MATCH_COLUMNS = [
  "userId",
  "user_id",
  "user_id_from_auth",
  "email",
  "reporterContact",
  "contactNum",
  "contactDetails",
  "reporter_name",
  "reporter_contact",
  "requestedBy",
  "patientName",
  "fullName",
  "mobile_number",
];

const rowIsMine = (row, who) => {
  if (!who || who.ids.size === 0) return false;

  const values = Object.values(row);

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    if (who.ids.has(String(value))) return true;
  }

  const myEmail = norm(who.email);
  const myPhone = digits(who.phone);
  if (!myEmail && !myPhone) return false;

  for (let i = 0; i < MATCH_COLUMNS.length; i++) {
    const raw = row[MATCH_COLUMNS[i]];
    if (!raw) continue;
    if (myEmail && norm(raw) === myEmail) return true;
    if (
      myPhone &&
      myPhone.length >= 10 &&
      digits(raw).slice(-10) === myPhone.slice(-10)
    ) {
      return true;
    }
  }

  return false;
};

/* =============================================================
 *  AGGREGATIONS
 * ============================================================= */

const normalize = (map, who) => {
  const out = [];

  SOURCES.forEach((src) => {
    const rows = map[src.table] || [];

    rows.forEach((raw) => {
      const statusValue =
        src.key === "hazard" ? raw.report_status || raw.status : raw.status;

      const dateValue = raw[src.dateField] || raw.created_at || null;

      out.push({
        id: raw[src.idKey] ?? "-",
        kind: src.key,
        raw,
        mine: rowIsMine(raw, who),
        status: String(statusValue || "pending").trim().toLowerCase(),
        category: raw[src.categoryField] || null,
        date: parseDate(dateValue),
        ts: timeOf(raw.created_at),
      });
    });
  });

  return out.sort((a, b) => b.ts - a.ts);
};

const buildYears = (records) => {
  const found = records.map((r) => (r.date ? r.date.year : null));
  const unique = [];
  for (let i = 0; i < found.length; i++) {
    if (found[i] && unique.indexOf(found[i]) === -1) {
      unique.push(found[i]);
    }
  }
  return unique.sort((a, b) => a - b);
};

const countForMonth = (records, year, month) => {
  const counts = {};
  SOURCES.forEach((s) => {
    counts[s.key] = 0;
  });

  records.forEach((r) => {
    if (!r.date) return;
    if (r.date.year !== year || r.date.month !== month) return;
    counts[r.kind] = (counts[r.kind] || 0) + 1;
  });

  return counts;
};

const buildMonthly = (records, year) =>
  MONTHS.map((label, i) => {
    const entry = { month: label };
    const counts = countForMonth(records, year, i + 1);
    SOURCES.forEach((s) => {
      entry[s.key] = counts[s.key] || 0;
    });
    return entry;
  });

const buildYearly = (records, years) =>
  years.map((year) => {
    const entry = { year: String(year) };
    SOURCES.forEach((s) => {
      entry[s.key] = 0;
    });

    records.forEach((r) => {
      if (!r.date) return;
      if (r.date.year !== year) return;
      entry[r.kind] = (entry[r.kind] || 0) + 1;
    });

    return entry;
  });

const buildStatus = (records) => {
  const counts = {};

  records.forEach((r) => {
    const label = pretty(r.status);
    counts[label] = (counts[label] || 0) + 1;
  });

  return Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value);
};

const buildDayOfWeek = (records) => {
  const counts = DAYS.map((d) => ({ day: d, total: 0 }));

  records.forEach((r) => {
    if (!r.date) return;
    counts[r.date.date.getDay()].total += 1;
  });

  return counts;
};

const buildCategories = (records, limit) => {
  const counts = {};

  records.forEach((r) => {
    if (!r.category) return;
    const key = String(r.category).replace(/-/g, " ");
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.keys(counts)
    .map((name) => ({ name, count: counts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const buildSummary = (records) => {
  const byKind = {};
  SOURCES.forEach((s) => {
    byKind[s.key] = 0;
  });

  let open = 0;
  let closed = 0;
  let highPriority = 0;

  records.forEach((r) => {
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;

    if (OPEN_STATUSES.has(r.status)) open += 1;
    if (CLOSED_STATUSES.has(r.status)) closed += 1;

    const priority =
      norm(r.raw.priorityLevel) || norm(r.raw.risk_level);
    if (priority === "high" || priority === "critical") {
      highPriority += 1;
    }
  });

  const total = records.length;
  const years = buildYears(records);
  const span =
    years.length > 1 ? years[years.length - 1] - years[0] + 1 : 1;

  return {
    total,
    byKind,
    open,
    closed,
    highPriority,
    avgPerMonth: avg(total, span * 12),
    avgPerYear: avg(total, span),
    span,
  };
};

/* =============================================================
 *  UI PARTS
 * ============================================================= */

const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="rounded-2xl bg-indigo-500 p-4 sm:p-5 text-white shadow-lg flex items-center gap-3 min-w-0">
    <div
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${accent} flex items-center justify-center flex-shrink-0`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/80 truncate">
        {label}
      </p>
      <p className="text-2xl font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-white/70 truncate">{sub}</p>}
    </div>
  </div>
);

const Panel = ({ title, subtitle, action, children, className = "" }) => (
  <div
    className={`bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm ${className}`}
  >
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && (
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

const EmptyState = ({ icon: Icon, text, sub }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center">
    <Icon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
      {text}
    </p>
    {sub && (
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
        {sub}
      </p>
    )}
  </div>
);

const chartTooltip = {
  cursor: { fill: "rgba(124,58,237,0.06)" },
  contentStyle: {
    borderRadius: 12,
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
};

const axisX = {
  dataKey: "month",
  stroke: "#64748b",
  tick: { fontSize: 12 },
};

const axisYear = {
  dataKey: "year",
  stroke: "#64748b",
  tick: { fontSize: 12 },
};

const axisDay = {
  dataKey: "day",
  stroke: "#64748b",
  tick: { fontSize: 12 },
};

const axisY = {
  allowDecimals: false,
  stroke: "#64748b",
  tick: { fontSize: 12 },
};

const axisCat = {
  type: "category",
  dataKey: "name",
  stroke: "#64748b",
  tick: { fontSize: 10 },
  width: 130,
};

const axisNum = {
  type: "number",
  allowDecimals: false,
  stroke: "#64748b",
  tick: { fontSize: 11 },
};

const grid = {
  strokeDasharray: "3 3",
  stroke: "#e2e8f0",
};

/* =============================================================
 *  COMPONENT
 * ============================================================= */

export default function IncidentTrends() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState([]);

  const [identity, setIdentity] = useState(null);
  const [records, setRecords] = useState([]);

  const [scope, setScope] = useState("community");
  const [tab, setTab] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(null);

  /* ── Load ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);

    const who = await resolveIdentity();
    const result = await loadAll();

    setIdentity(who);
    setBlocked(result.blocked);

    const normalized = normalize(result.map, who);
    setRecords(normalized);

    const years = buildYears(normalized);
    setSelectedYear(
      years.length ? years[years.length - 1] : new Date().getFullYear()
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  /* ── Scope filter ─────────────────────────────────────────── */
  const scoped = useMemo(() => {
    if (scope === "mine") {
      return records.filter((r) => r.mine);
    }
    return records;
  }, [records, scope]);

  /* ── Derived data ─────────────────────────────────────────── */
  const years = useMemo(() => buildYears(scoped), [scoped]);
  const summary = useMemo(() => buildSummary(scoped), [scoped]);
  const monthlyData = useMemo(
    () => buildMonthly(scoped, selectedYear),
    [scoped, selectedYear]
  );
  const yearlyData = useMemo(
    () => buildYearly(scoped, years),
    [scoped, years]
  );
  const statusData = useMemo(() => buildStatus(scoped), [scoped]);
  const dayData = useMemo(() => buildDayOfWeek(scoped), [scoped]);
  const categoryData = useMemo(
    () => buildCategories(scoped, 8),
    [scoped]
  );

  const monthlyTotal = useMemo(() => {
    let total = 0;
    monthlyData.forEach((m) => {
      SOURCES.forEach((s) => {
        total += m[s.key] || 0;
      });
    });
    return total;
  }, [monthlyData]);

  /* Keep the year valid when the data set changes */
  useEffect(() => {
    if (years.length === 0) return;
    if (selectedYear !== null && years.indexOf(selectedYear) === -1) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="font-semibold">Loading trends...</p>
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────── */
  const TABS = [
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 pb-16 pt-6">
      {/* ═══ HEADER ═══ */}
      <div className="rounded-t-3xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 sm:px-6 py-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Siren className="h-8 w-8 text-white/90 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                MDRRMO Naic — Trends
              </h1>
              <p className="text-white/85 text-xs sm:text-sm">
                Summary statistics across all services
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-3 py-2 rounded-xl text-xs transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ SCOPE + STATS ═══ */}
      <div className="bg-white dark:bg-slate-800/80 rounded-b-3xl border border-t-0 border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-xl space-y-5">
        {/* Scope switch */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setScope("community")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                scope === "community"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              Community
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              disabled={!identity || !identity.exists}
              title={
                identity && identity.exists
                  ? "Show only your records"
                  : "Sign in to view your records"
              }
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                scope === "mine"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              My Records
            </button>
          </div>

          {identity && identity.exists && (
            <p className="text-xs text-slate dark:text-slate-400 truncate">
              Signed in as <strong>{identity.name}</strong>
            </p>
          )}
        </div>

        {/* Per-type counts */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {SOURCES.map((s) => {
            const Icon = s.icon;
            const value = summary.byKind[s.key] || 0;
            return (
              <div
                key={s.key}
                className="rounded-2xl p-4 text-white shadow-lg flex items-center gap-3 min-w-0"
                style={{ backgroundColor: s.color }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 truncate">
                    {s.label}s
                  </p>
                  <p className="text-2xl font-extrabold leading-tight">{value}</p>
                  <p className="text-[10px] text-white/70 truncate">
                    {avg(value, summary.span * 12)} / month
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Layers}
            label="Total Records"
            value={summary.total}
            sub={scope === "mine" ? "Yours only" : "All submissions"}
            accent="bg-blue-600"
          />
          <StatCard
            icon={Target}
            label="Avg / Month"
            value={summary.avgPerMonth}
            sub={`Avg / year: ${summary.avgPerYear}`}
            accent="bg-amber-500"
          />
          <StatCard
            icon={Activity}
            label="Open"
            value={summary.open}
            sub={`${pct(summary.open, summary.total)} of total`}
            accent="bg-cyan-600"
          />
          <StatCard
            icon={ShieldAlert}
            label="High Priority"
            value={summary.highPriority}
            sub="High or critical"
            accent="bg-red-500"
          />
        </div>

        {/* Blocked tables */}
        {blocked.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Unreadable by row-level security:{" "}
              <strong>{blocked.join(", ")}</strong>
            </p>
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                tab === t.key
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MONTHLY ═══ */}
      {tab === "monthly" && (
        <div className="mt-6 space-y-5">
          <Panel
            title="Submissions per Month"
            subtitle={
              selectedYear
                ? `All request types during ${selectedYear}`
                : "All request types"
            }
            action={
              <select
                value={selectedYear === null ? "" : selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {years.length === 0 && <option value="">No years</option>}
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            }
          >
            {scoped.length === 0 ? (
              <EmptyState
                icon={Layers}
                text="No records available"
                sub={
                  scope === "mine"
                    ? "You have not submitted any requests yet."
                    : "No reports have been filed yet."
                }
              />
            ) : (
              <>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid {...grid} vertical={false} />
                      <XAxis {...axisX} />
                      <YAxis {...axisY} />
                      <Tooltip {...chartTooltip} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      {SOURCES.map((s, i) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          stackId="all"
                          name={s.label}
                          fill={s.color}
                          radius={
                            i === SOURCES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Total for {selectedYear}: <strong>{monthlyTotal}</strong> record
                  {monthlyTotal === 1 ? "" : "s"}
                </p>
              </>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel
              title="Status Distribution"
              subtitle="Across all request types"
            >
              {statusData.length === 0 ? (
                <EmptyState icon={Layers} text="No status data" />
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {statusData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="By Day of Week"
              subtitle="When reports are filed"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dayData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis {...axisDay} />
                    <YAxis {...axisY} />
                    <Tooltip {...chartTooltip} />
                    <Bar
                      dataKey="total"
                      name="Submissions"
                      fill="#7c3aed"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel
            title="Top Categories"
            subtitle="Most common report types"
          >
            {categoryData.length === 0 ? (
              <EmptyState icon={Layers} text="No categories yet" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid {...grid} horizontal={false} />
                    <XAxis {...axisNum} />
                    <YAxis {...axisCat} />
                    <Tooltip {...chartTooltip} />
                    <Bar
                      dataKey="count"
                      name="Reports"
                      fill="#7c3aed"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ═══ YEARLY ═══ */}
      {tab === "yearly" && (
        <div className="mt-6 space-y-5">
          <Panel
            title="Submissions per Year by Type"
            subtitle="Every request type, stacked"
          >
            {years.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                text="No dated records available"
              />
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yearlyData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis {...axisYear} />
                    <YAxis {...axisY} />
                    <Tooltip {...chartTooltip} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    {SOURCES.map((s, i) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        stackId="all"
                        name={s.label}
                        fill={s.color}
                        radius={
                          i === SOURCES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title="Average per Month by Request Type"
            subtitle={`Mean submissions per month over ${summary.span} year${summary.span === 1 ? "" : "s"}`}
          >
            {scoped.length === 0 ? (
              <EmptyState icon={Layers} text="No data" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {SOURCES.map((s) => {
                  const Icon = s.icon;
                  const count = summary.byKind[s.key] || 0;
                  const perMonth = avg(count, summary.span * 12);
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center"
                    >
                      <div
                        className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-white"
                        style={{ backgroundColor: s.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1.5">
                        {s.label}
                      </p>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                        {perMonth}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        per month
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {pct(count, summary.total)} of all
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Status Distribution"
            subtitle="Across all years"
          >
            {statusData.length === 0 ? (
              <EmptyState icon={Layers} text="No status data" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
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
      )}

      {/* ═══ FOOTER ═══ */}
      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
        Source: reportIncident, hazard_reports, appointments, borrow-vehicle,
        outPatientCheckUp
      </p>
    </div>
  );
}
