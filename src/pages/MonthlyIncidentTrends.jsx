"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from "recharts";

import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Layers,
  Loader2,
  RefreshCw,
  Siren,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
  Truck,
  UserRound,
} from "lucide-react";

import { supabase } from "../createClient";

/* =============================================================
 * THEME
 * ============================================================= */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

/* =============================================================
 * CONFIG
 * ============================================================= */

const SOURCES = [
  {
    key: "incident",
    table: "reportIncident",
    idKey: "reportIncidentId",
    label: "Incident",
    plural: "Incidents",
    color: "#ef4444",
    dateField: "date",
    categoryField: "incidentType",
    icon: Siren,
    soft:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300",
  },
  {
    key: "hazard",
    table: "hazard_reports",
    idKey: "id",
    label: "Hazard",
    plural: "Hazards",
    color: "#f59e0b",
    dateField: "date_observed",
    categoryField: "hazard_category",
    icon: TriangleAlert,
    soft:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300",
  },
  {
    key: "appointment",
    table: "appointments",
    idKey: "appointmentId",
    label: "Appointment",
    plural: "Appointments",
    color: "#8b5cf6",
    dateField: "date",
    categoryField: "purpose",
    icon: CalendarDays,
    soft:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300",
  },
  {
    key: "vehicle",
    table: "borrow-vehicle",
    idKey: "borrowerId",
    label: "Vehicle",
    plural: "Vehicles",
    color: "#10b981",
    dateField: "date",
    categoryField: "vehicle",
    icon: Truck,
    soft:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  {
    key: "checkup",
    table: "outPatientCheckUp",
    idKey: "id",
    label: "Check-Up",
    plural: "Check-Ups",
    color: "#06b6d4",
    dateField: "preferredDate",
    categoryField: "patientFor",
    icon: Stethoscope,
    soft:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/30 dark:text-cyan-300",
  },
];

const ROW_LIMIT = 1000;

/**
 * Statuses that mean the record has NOT been approved.
 * Anything else is treated as approved (in progress, resolved,
 * confirmed, dispatched, completed, ongoing, active, etc.).
 *
 * This definition captures every downstream state of an
 * admin-approved request without enumerating each one.
 */
const NON_APPROVED_STATUSES = new Set([
  "pending",
  "pending approval",
  "pending_approval",
  "rejected",
  "declined",
  "cancelled",
  "canceled",
]);

const OPEN_STATUSES = new Set([
  "pending", "active", "in progress", "dispatched",
  "approved", "ongoing", "confirmed",
]);

const DONE_STATUSES = new Set(["resolved", "completed"]);

const ATTENTION_STATUSES = new Set([
  "rejected", "declined", "cancelled", "canceled",
]);

/* =============================================================
 * HELPERS
 * ============================================================= */

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isApprovedStatus = (value) => {
  const status = normalizeStatus(value);
  if (!status) return false;
  return !NON_APPROVED_STATUSES.has(status);
};

/**
 * Resolves the effective status of a raw row. Hazard reports have two
 * overlapping status columns; prefer `report_status` for the hazard
 * source, and fall back to `status` for everything else.
 */
const statusOfRaw = (source, raw) => {
  if (source.key === "hazard") {
    return raw.report_status || raw.status || "pending";
  }
  return raw.status || "pending";
};

const normalizeText = (value) => String(value ?? "").trim();

const phoneDigits = (value) => String(value || "").replace(/\D/g, "");

const timeOf = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const parseDate = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, date: new Date(year, month - 1, day) };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    date: parsed,
  };
};

const average = (count, divisor) => {
  if (!divisor) return 0;
  return Number((count / divisor).toFixed(1));
};

const averageDisplay = (count, divisor) => {
  if (!divisor) return "0.0";
  return (count / divisor).toFixed(1);
};

const readLocalSession = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/* =============================================================
 * NETWORK
 * ============================================================= */

const withTimeout = (promise, milliseconds, label) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} timed out after ${milliseconds}ms`));
    }, milliseconds);

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const safeFetch = async (table, orderColumn, label) => {
  try {
    let query = supabase.from(table).select("*").limit(ROW_LIMIT);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: false });
    }
    const result = await withTimeout(query, 10000, label);
    if (result?.error) {
      return { table, rows: [], error: result.error.message };
    }
    return { table, rows: result?.data || [], error: null };
  } catch (error) {
    return {
      table,
      rows: [],
      error: error?.message || "Request failed",
    };
  }
};

const loadAll = async () => {
  const jobs = await Promise.all(
    SOURCES.map((source) =>
      safeFetch(source.table, "created_at", source.plural),
    ),
  );

  const map = {};
  const blocked = [];

  jobs.forEach((job) => {
    map[job.table] = job.rows;
    if (job.error) blocked.push(job.table);
  });

  return { map, blocked };
};

/* =============================================================
 * IDENTITY
 * ============================================================= */

const resolveIdentity = async () => {
  const ids = new Set();
  const addId = (value) => {
    if (value === null || value === undefined || value === "") return;
    ids.add(String(value));
  };

  let authId = null;
  let profileId = null;
  let pendingId = null;
  let staffId = null;
  let workId = null;
  let name = "";
  let email = "";
  let phone = "";
  let role = "user";
  let isStaff = false;
  let exists = false;

  const absorbProfile = (profile) => {
    if (!profile) return;
    addId(profile.id);
    addId(profile.user_id);
    if (!email && profile.email) email = profile.email;
    if (!phone && profile.mobile_number) phone = profile.mobile_number;
    if (role === "user" && profile.role) role = profile.role;
    const profileName =
      profile.full_name ||
      [profile.first_name, profile.middle_name, profile.last_name]
        .filter(Boolean)
        .join(" ");
    if (profileName && (!name || name === email)) name = profileName;
  };

  const profileFields =
    "id, full_name, first_name, middle_name, last_name, user_id, role, email, mobile_number";

  try {
    const authResult = await withTimeout(supabase.auth.getUser(), 6000, "auth");
    const user = authResult?.data?.user;
    if (user) {
      exists = true;
      authId = user.id;
      addId(user.id);
      email = user.email || "";
      phone = user.phone || user.phone_metadata?.phone_number || "";
      name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email;

      const profileResult = await withTimeout(
        supabase.from("profiles").select(profileFields).eq("id", user.id).maybeSingle(),
        6000,
        "profiles/auth",
      );
      if (!profileResult?.error) absorbProfile(profileResult?.data);
    }
  } catch {
    // continue
  }

  const storedUser = readLocalSession("currentUser");
  if (storedUser) {
    exists = true;
    pendingId = storedUser.id || null;
    addId(storedUser.id);
    addId(storedUser.user_id);
    email = email || storedUser.email || "";
    phone = phone || storedUser.mobile_number || "";
    if (!name || name === email || name === "Resident") {
      name =
        storedUser.full_name ||
        [storedUser.first_name, storedUser.middle_name, storedUser.last_name]
          .filter(Boolean)
          .join(" ") ||
        storedUser.email ||
        "Resident";
    }
    if (storedUser.email) {
      const profileResult = await withTimeout(
        supabase.from("profiles").select(profileFields).eq("email", storedUser.email).maybeSingle(),
        6000,
        "profiles/email",
      );
      if (!profileResult?.error) absorbProfile(profileResult?.data);
    }
  }

  const storedStaff = readLocalSession("currentStaff");
  if (storedStaff) {
    exists = true;
    isStaff = true;
    staffId = storedStaff.id ?? null;
    workId = storedStaff.user_id || workId;
    addId(storedStaff.id);
    addId(storedStaff.user_id);
    addId(storedStaff.email);
    email = email || storedStaff.email || "";
    phone = phone || storedStaff.mobile_number || "";
    name =
      storedStaff.full_name ||
      storedStaff.username ||
      storedStaff.user_id ||
      "Staff Member";
    role = storedStaff.role || "staff";

    if (storedStaff.user_id) {
      const [staffResult, profileResult] = await Promise.all([
        withTimeout(
          supabase
            .from("staff_users")
            .select("id, user_id, full_name, email, mobile_number, role, department")
            .eq("user_id", storedStaff.user_id)
            .maybeSingle(),
          6000,
          "staff_users",
        ),
        withTimeout(
          supabase
            .from("profiles")
            .select("id, user_id, full_name, mobile_number")
            .eq("user_id", storedStaff.user_id)
            .maybeSingle(),
          6000,
          "staff profile",
        ),
      ]);

      const staff = staffResult?.data;
      const profile = profileResult?.data;
      if (staff) {
        staffId = staff.id;
        addId(staff.id);
        addId(staff.user_id);
        name = staff.full_name || name;
        email = email || staff.email || "";
        phone = phone || staff.mobile_number || "";
        role = staff.role || role;
      }
      if (profile) {
        profileId = profile.id;
        addId(profile.id);
        addId(profile.user_id);
        name = profile.full_name || name;
        phone = profile.mobile_number || phone;
      }
    }
  }

  return {
    idSet: ids,
    ids: Array.from(ids),
    authId,
    profileId,
    pendingId,
    staffId,
    workId,
    name,
    email,
    phone,
    role,
    isStaff,
    exists,
  };
};

/* =============================================================
 * OWNERSHIP
 * ============================================================= */

const OWNER_ID_FIELDS = [
  "userId", "user_id", "user_id_from_auth",
  "profileId", "profile_id", "staffId", "staff_id",
];

const OWNER_EMAIL_FIELDS = [
  "email", "reporterContact", "contactNum",
  "contactDetails", "reporter_contact",
];

const OWNER_PHONE_FIELDS = [
  "mobile_number", "reporterContact", "contactNum",
  "contactDetails", "reporter_contact",
];

const OWNER_NAME_FIELDS = ["requestedBy", "reporter_name", "fullName"];

const rowIsMine = (row, who) => {
  if (!row || !who) return false;
  const idSet = who.idSet instanceof Set ? who.idSet : new Set(who.ids || []);
  if (idSet.size === 0) return false;

  for (const field of OWNER_ID_FIELDS) {
    const value = row[field];
    if (value !== null && value !== undefined && value !== "" && idSet.has(String(value))) {
      return true;
    }
  }

  const myEmail = normalizeText(who.email).toLowerCase();
  if (myEmail) {
    for (const field of OWNER_EMAIL_FIELDS) {
      const value = normalizeText(row[field]).toLowerCase();
      if (value && value === myEmail) return true;
    }
  }

  const myPhone = phoneDigits(who.phone);
  if (myPhone.length >= 10) {
    for (const field of OWNER_PHONE_FIELDS) {
      const value = phoneDigits(row[field]);
      if (value.length >= 10 && value.slice(-10) === myPhone.slice(-10)) return true;
    }
  }

  const myName = normalizeText(who.name).toLowerCase();
  if (myName) {
    for (const field of OWNER_NAME_FIELDS) {
      const value = normalizeText(row[field]).toLowerCase();
      if (value && value === myName) return true;
    }
  }

  return false;
};

/* =============================================================
 * AGGREGATION
 * ============================================================= */

const normalize = (map, who) => {
  const output = [];
  let skippedUnapproved = 0;

  SOURCES.forEach((source) => {
    const rows = map[source.table] || [];
    rows.forEach((raw) => {
      const statusValue = statusOfRaw(source, raw);

      // Only include records that have been approved by an admin.
      if (!isApprovedStatus(statusValue)) {
        skippedUnapproved += 1;
        return;
      }

      const dateValue = raw[source.dateField] || raw.created_at || null;
      const parsedDate = parseDate(dateValue);

      output.push({
        id: raw[source.idKey] ?? "-",
        kind: source.key,
        raw,
        mine: rowIsMine(raw, who),
        status: normalizeStatus(statusValue || "pending"),
        category: raw[source.categoryField] || null,
        date: parsedDate,
        ts: timeOf(raw.created_at) || (parsedDate?.date ? parsedDate.date.getTime() : 0),
      });
    });
  });

  return {
    records: output.sort((a, b) => b.ts - a.ts),
    skippedUnapproved,
  };
};

const buildYears = (records) => {
  const years = new Set();
  records.forEach((record) => {
    if (record.date?.year) years.add(record.date.year);
  });
  return Array.from(years).sort((a, b) => a - b);
};

const buildSummary = (records) => {
  const byKind = Object.fromEntries(SOURCES.map((s) => [s.key, 0]));
  let open = 0;
  let closed = 0;
  let attention = 0;
  let highPriority = 0;

  records.forEach((record) => {
    byKind[record.kind] += 1;
    const status = normalizeStatus(record.status);
    if (OPEN_STATUSES.has(status)) open += 1;
    if (DONE_STATUSES.has(status)) closed += 1;
    if (ATTENTION_STATUSES.has(status)) attention += 1;

    const priority =
      normalizeStatus(record.raw?.priorityLevel) ||
      normalizeStatus(record.raw?.risk_level);
    if (priority === "high" || priority === "critical") highPriority += 1;
  });

  const years = buildYears(records);
  const span = years.length > 1 ? years[years.length - 1] - years[0] + 1 : 1;
  const total = records.length;
  const monthsInRange = Math.max(1, span * 12);

  return {
    total,
    byKind,
    open,
    closed,
    attention,
    highPriority,
    avgPerMonth: average(total, monthsInRange),
    avgPerYear: average(total, span),
    span,
    years,
  };
};

/** Build chart data for averages by type */
const buildAverageChartData = (summary, unit) => {
  const divisor = unit === "month" ? 12 : Math.max(1, summary.span);

  return SOURCES.map((source) => ({
    name: source.label,
    average: average(summary.byKind[source.key] || 0, divisor),
    color: source.color,
    key: source.key,
  }));
};

/* =============================================================
 * CHART TOOLTIP
 * ============================================================= */

function ChartTooltip({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  return (
    <div className="min-w-40 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      {label && (
        <p className="mb-2 border-b border-white/10 pb-2 text-xs font-black">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={`${entry.dataKey}-${index}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.color || "#6366f1" }}
              />
              {entry.name || entry.dataKey || "Average"}
            </span>
            <strong>{entry.value ?? 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================
 * SMALL UI
 * ============================================================= */

function StatCard({ icon: Icon, label, value, detail, wrapperClass, iconClass }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${wrapperClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] opacity-75 sm:text-xs">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black leading-none sm:text-3xl">{value}</p>
          {detail && (
            <p className="mt-2 truncate text-xs font-semibold opacity-70">{detail}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:h-11 sm:w-11 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AverageCard({ source, value, unit }) {
  const Icon = source.icon;
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${source.soft}`}>
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: source.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] opacity-75">
        {source.plural}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-semibold opacity-70">
        average / {unit}
      </p>
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {title && (
        <div className="mb-5">
          <h2 className="text-base font-black text-slate-800 sm:text-lg dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon = CircleSlash, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-950/50 dark:text-blue-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

/* =============================================================
 * MAIN COMPONENT
 * ============================================================= */

export default function IncidentTrends() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [records, setRecords] = useState([]);
  const [skippedUnapproved, setSkippedUnapproved] = useState(0);
  const [tab, setTab] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(null);
  const [error, setError] = useState("");
  const loadRequestRef = useRef(0);

  const isGuest = !identity?.exists;

  const load = useCallback(async (showLoading = true) => {
    const requestId = ++loadRequestRef.current;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const who = await resolveIdentity();
      const result = await loadAll();
      if (requestId !== loadRequestRef.current) return;

      const { records: normalized, skippedUnapproved: skipped } = normalize(result.map, who);
      const availableYears = buildYears(normalized);

      setIdentity(who);
      setRecords(normalized);
      setSkippedUnapproved(skipped);
      setBlocked(result.blocked || []);

      setSelectedYear((prev) => {
        const numeric = Number(prev);
        if (prev !== null && availableYears.includes(numeric)) return numeric;
        return availableYears.length
          ? availableYears[availableYears.length - 1]
          : new Date().getFullYear();
      });
    } catch (err) {
      if (requestId === loadRequestRef.current) {
        setError(err?.message || "Unable to load trend data.");
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(true);
    return () => { loadRequestRef.current += 1; };
  }, [load]);

  const handleRefresh = useCallback(() => {
    void load(false);
  }, [load]);

  /* ---------- DERIVED ---------- */

  const communityRecords = records;
  const myRecords = useMemo(() => {
    if (!identity?.exists) return [];
    return records.filter((r) => r.mine);
  }, [records, identity]);

  const communityYears = useMemo(() => buildYears(communityRecords), [communityRecords]);
  const myYears = useMemo(() => buildYears(myRecords), [myRecords]);

  const communitySummary = useMemo(() => buildSummary(communityRecords), [communityRecords]);
  const mySummary = useMemo(() => buildSummary(myRecords), [myRecords]);

  const communityYearScoped = useMemo(() => {
    if (!selectedYear) return communityRecords;
    return communityRecords.filter((r) => r.date?.year === selectedYear);
  }, [communityRecords, selectedYear]);

  const myYearScoped = useMemo(() => {
    if (!selectedYear) return myRecords;
    return myRecords.filter((r) => r.date?.year === selectedYear);
  }, [myRecords, selectedYear]);

  const communityYearSummary = useMemo(
    () => buildSummary(communityYearScoped),
    [communityYearScoped],
  );
  const myYearSummary = useMemo(() => buildSummary(myYearScoped), [myYearScoped]);

  const communityMonthlyChart = useMemo(
    () => buildAverageChartData(communityYearSummary, "month"),
    [communityYearSummary],
  );
  const myMonthlyChart = useMemo(
    () => buildAverageChartData(myYearSummary, "month"),
    [myYearSummary],
  );
  const communityYearlyChart = useMemo(
    () => buildAverageChartData(communitySummary, "year"),
    [communitySummary],
  );
  const myYearlyChart = useMemo(
    () => buildAverageChartData(mySummary, "year"),
    [mySummary],
  );

  useEffect(() => {
    const years = communityYears.length ? communityYears : myYears;
    if (years.length === 0) return;
    setSelectedYear((prev) => {
      const numeric = Number(prev);
      if (prev !== null && years.includes(numeric)) return numeric;
      return years[years.length - 1];
    });
  }, [communityYears, myYears]);

  /* ---------- LOADING ---------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className={`${GRADIENT_CLASS} mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl`}>
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <h1 className="mt-5 text-lg font-black text-slate-800 dark:text-white">
            Loading averages
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Calculating average approved reports per month and per year…
          </p>
        </div>
      </div>
    );
  }

  const accountName = identity?.name || "Guest";
  const accountDetail = identity?.email || identity?.workId || "Browsing as guest";
  const accountRole = isGuest
    ? "Guest"
    : identity?.role === "admin"
      ? "Administrator"
      : identity?.role === "staff"
        ? "Staff"
        : "Resident";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* HERO */}
        <section className={`${GRADIENT_CLASS} relative overflow-hidden rounded-[2rem] px-5 py-7 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8`}>
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  SafeResponse Analytics
                </p>
                <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                  Average Approved Reports
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/85">
                  {isGuest
                    ? "Averages calculated only from community records that administrators have approved."
                    : "Averages calculated only from community and personal records that administrators have approved."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4" />
                Approved only
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-center shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                  Approved Records
                </p>
                <p className="text-xl font-black text-slate-900">
                  {communitySummary.total}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-black text-white ring-1 ring-white/20">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{accountName}</p>
              <p className="mt-0.5 truncate text-xs text-blue-50/80">{accountDetail}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/15">
              {accountRole}
            </span>
          </div>
        </section>

        {/* MAIN CARD */}
        <section className="relative z-10 -mt-5 sm:-mt-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
            <div className={`h-1.5 ${GRADIENT_CLASS}`} aria-hidden />

            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="font-semibold leading-6">{error}</p>
                </div>
              )}

              {/* PERIOD TABS */}
              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950/50">
                <div
                  className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                  role="tablist"
                  aria-label="Average period"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "monthly"}
                    onClick={() => setTab("monthly")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${
                      tab === "monthly"
                        ? `${GRADIENT_CLASS} text-white shadow-md`
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Per Month
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "yearly"}
                    onClick={() => setTab("yearly")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${
                      tab === "yearly"
                        ? `${GRADIENT_CLASS} text-white shadow-md`
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Per Year
                  </button>
                </div>

                {tab === "monthly" ? (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <label htmlFor="trend-year" className="sr-only">Select year</label>
                    <select
                      id="trend-year"
                      value={selectedYear ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedYear(v ? Number(v) : null);
                      }}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {communityYears.length === 0 && (
                        <option value="">No years available</option>
                      )}
                      {communityYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Across {communitySummary.span} year{communitySummary.span === 1 ? "" : "s"}
                  </span>
                )}
              </section>

              {blocked.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="font-semibold leading-6">
                    Some tables could not be read because of row-level security:{" "}
                    <strong>{blocked.join(", ")}</strong>
                  </p>
                </div>
              )}

              {/* ==================== MONTHLY TAB ==================== */}
              {tab === "monthly" && (
                <div className="space-y-8">
                  {/* COMMUNITY */}
                  <Panel
                    title={`Community Average per Month${selectedYear ? ` — ${selectedYear}` : ""}`}
                    subtitle={
                      selectedYear
                        ? `Based on ${communityYearSummary.total} approved community records in ${selectedYear} (÷ 12)`
                        : "Average monthly volume across approved community records"
                    }
                  >
                    {communityYearSummary.total === 0 ? (
                      <EmptyState
                        icon={BarChart3}
                        title="No approved community records for this year"
                        description="Approve submissions in the admin dashboards or choose another year."
                      />
                    ) : (
                      <>
                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <StatCard
                            icon={TrendingUp}
                            label="Community Avg / Month"
                            value={averageDisplay(communityYearSummary.total, 12)}
                            detail={`${communityYearSummary.total} approved in ${selectedYear}`}
                            wrapperClass="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"
                            iconClass="bg-violet-600"
                          />
                          <StatCard
                            icon={Layers}
                            label="Approved Community Records"
                            value={communityYearSummary.total}
                            detail={`Year ${selectedYear}`}
                            wrapperClass="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                            iconClass="bg-blue-600"
                          />
                        </div>

                        <div className="mb-6">
                          <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                            Average by Report Type
                          </p>
                          <div className="h-72 w-full sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={communityMonthlyChart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis allowDecimals stroke="#64748b" tick={{ fontSize: 11 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="average" name="Avg / month" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                  {communityMonthlyChart.map((entry) => (
                                    <Cell key={entry.key} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                          {SOURCES.map((source) => {
                            const count = communityYearSummary.byKind[source.key] || 0;
                            return (
                              <AverageCard
                                key={source.key}
                                source={source}
                                value={averageDisplay(count, 12)}
                                unit="month"
                              />
                            );
                          })}
                        </div>
                      </>
                    )}
                  </Panel>

                  {/* MY MONTHLY */}
                  {!isGuest && (
                    <Panel
                      title={`My Average per Month${selectedYear ? ` — ${selectedYear}` : ""}`}
                      subtitle={
                        selectedYear
                          ? `Based on ${myYearSummary.total} of your approved records in ${selectedYear} (÷ 12)`
                          : "Your personal average monthly volume (approved only)"
                      }
                    >
                      {myYearSummary.total === 0 ? (
                        <EmptyState
                          icon={UserRound}
                          title="No approved personal records for this year"
                          description="You have no approved submissions in the selected year."
                        />
                      ) : (
                        <>
                          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <StatCard
                              icon={TrendingUp}
                              label="My Avg / Month"
                              value={averageDisplay(myYearSummary.total, 12)}
                              detail={`${myYearSummary.total} approved in ${selectedYear}`}
                              wrapperClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                              iconClass="bg-emerald-600"
                            />
                            <StatCard
                              icon={UserRound}
                              label="My Approved Records"
                              value={myYearSummary.total}
                              detail={`Year ${selectedYear}`}
                              wrapperClass="border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300"
                              iconClass="bg-cyan-600"
                            />
                          </div>

                          <div className="mb-6">
                            <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                              My Average by Report Type
                            </p>
                            <div className="h-72 w-full sm:h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={myMonthlyChart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} />
                                  <YAxis allowDecimals stroke="#64748b" tick={{ fontSize: 11 }} />
                                  <Tooltip content={<ChartTooltip />} />
                                  <Bar dataKey="average" name="Avg / month" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                    {myMonthlyChart.map((entry) => (
                                      <Cell key={entry.key} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            {SOURCES.map((source) => {
                              const count = myYearSummary.byKind[source.key] || 0;
                              return (
                                <AverageCard
                                  key={source.key}
                                  source={source}
                                  value={averageDisplay(count, 12)}
                                  unit="month"
                                />
                              );
                            })}
                          </div>
                        </>
                      )}
                    </Panel>
                  )}
                </div>
              )}

              {/* ==================== YEARLY TAB ==================== */}
              {tab === "yearly" && (
                <div className="space-y-8">
                  <Panel
                    title="Community Average per Year"
                    subtitle={`Mean yearly volume over ${communitySummary.span} year${communitySummary.span === 1 ? "" : "s"} (approved only)`}
                  >
                    {communitySummary.total === 0 ? (
                      <EmptyState
                        icon={TrendingUp}
                        title="No approved community records available"
                        description="Yearly averages require approved records with valid dates."
                      />
                    ) : (
                      <>
                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <StatCard
                            icon={BarChart3}
                            label="Community Avg / Year"
                            value={averageDisplay(communitySummary.total, Math.max(1, communitySummary.span))}
                            detail={`${communitySummary.total} approved records`}
                            wrapperClass="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                            iconClass="bg-blue-600"
                          />
                          <StatCard
                            icon={TrendingUp}
                            label="Community Avg / Month"
                            value={averageDisplay(communitySummary.total, Math.max(1, communitySummary.span * 12))}
                            detail={`Across ${communitySummary.span} year${communitySummary.span === 1 ? "" : "s"}`}
                            wrapperClass="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"
                            iconClass="bg-violet-600"
                          />
                        </div>

                        <div className="mb-6">
                          <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                            Average by Report Type (per year)
                          </p>
                          <div className="h-72 w-full sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={communityYearlyChart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis allowDecimals stroke="#64748b" tick={{ fontSize: 11 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="average" name="Avg / year" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                  {communityYearlyChart.map((entry) => (
                                    <Cell key={entry.key} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                          {SOURCES.map((source) => {
                            const count = communitySummary.byKind[source.key] || 0;
                            return (
                              <AverageCard
                                key={source.key}
                                source={source}
                                value={averageDisplay(count, Math.max(1, communitySummary.span))}
                                unit="year"
                              />
                            );
                          })}
                        </div>
                      </>
                    )}
                  </Panel>

                  {!isGuest && (
                    <Panel
                      title="My Average per Year"
                      subtitle={`Your personal mean yearly volume over ${mySummary.span} year${mySummary.span === 1 ? "" : "s"} (approved only)`}
                    >
                      {mySummary.total === 0 ? (
                        <EmptyState
                          icon={UserRound}
                          title="No approved personal records available"
                          description="You have not submitted any approved reports yet."
                        />
                      ) : (
                        <>
                          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <StatCard
                              icon={BarChart3}
                              label="My Avg / Year"
                              value={averageDisplay(mySummary.total, Math.max(1, mySummary.span))}
                              detail={`${mySummary.total} approved records`}
                              wrapperClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                              iconClass="bg-emerald-600"
                            />
                            <StatCard
                              icon={TrendingUp}
                              label="My Avg / Month"
                              value={averageDisplay(mySummary.total, Math.max(1, mySummary.span * 12))}
                              detail={`Across ${mySummary.span} year${mySummary.span === 1 ? "" : "s"}`}
                              wrapperClass="border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300"
                              iconClass="bg-cyan-600"
                            />
                          </div>

                          <div className="mb-6">
                            <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                              My Average by Report Type (per year)
                            </p>
                            <div className="h-72 w-full sm:h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={myYearlyChart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} />
                                  <YAxis allowDecimals stroke="#64748b" tick={{ fontSize: 11 }} />
                                  <Tooltip content={<ChartTooltip />} />
                                  <Bar dataKey="average" name="Avg / year" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                    {myYearlyChart.map((entry) => (
                                      <Cell key={entry.key} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            {SOURCES.map((source) => {
                              const count = mySummary.byKind[source.key] || 0;
                              return (
                                <AverageCard
                                  key={source.key}
                                  source={source}
                                  value={averageDisplay(count, Math.max(1, mySummary.span))}
                                  unit="year"
                                />
                              );
                            })}
                          </div>
                        </>
                      )}
                    </Panel>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <div className="mt-6 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400 dark:text-slate-600">

          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${GRADIENT_CLASS} inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Averages"}
          </button>
        </div>
      </div>
    </main>
  );
}