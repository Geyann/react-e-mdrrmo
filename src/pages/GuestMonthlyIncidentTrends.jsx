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
} from "recharts";

import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CircleSlash,
  Layers,
  Loader2,
  RefreshCw,
  Siren,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
  Truck,
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

const NON_APPROVED_STATUSES = new Set([
  "pending",
  "pending approval",
  "pending_approval",
  "rejected",
  "declined",
  "cancelled",
  "canceled",
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

const statusOfRaw = (source, raw) => {
  if (source.key === "hazard") {
    return raw.report_status || raw.status || "pending";
  }
  return raw.status || "pending";
};

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
 * AGGREGATION (Community only)
 * ============================================================= */

const normalize = (map) => {
  const output = [];
  let skippedUnapproved = 0;

  SOURCES.forEach((source) => {
    const rows = map[source.table] || [];
    rows.forEach((raw) => {
      const statusValue = statusOfRaw(source, raw);

      // Only include admin-approved records
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

  records.forEach((record) => {
    byKind[record.kind] += 1;
  });

  const years = buildYears(records);
  const span = years.length > 1 ? years[years.length - 1] - years[0] + 1 : 1;
  const total = records.length;

  return {
    total,
    byKind,
    span,
    years,
  };
};

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
 * CHART COMPONENTS
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

const SHORT_LABELS = {
  Incident: "Incident",
  Hazard: "Hazard",
  Appointment: "Appt",
  Vehicle: "Vehicle",
  "Check-Up": "OPD",
};

function AverageBarChart({ data, seriesName = "Average" }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : true,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartData = useMemo(
    () =>
      (data || []).map((entry) => ({
        ...entry,
        displayName: isMobile
          ? SHORT_LABELS[entry.name] || entry.name
          : entry.name,
      })),
    [data, isMobile],
  );

  const margin = isMobile
    ? { top: 8, right: 4, left: 0, bottom: 36 }
    : { top: 8, right: 12, left: 4, bottom: 8 };

  return (
    <div className="h-80 w-full min-h-[20rem] sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin} barCategoryGap={isMobile ? "18%" : "22%"}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="displayName"
            stroke="#64748b"
            interval={0}
            tick={{
              fontSize: isMobile ? 10 : 11,
              fontWeight: 600,
              fill: "#64748b",
            }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            angle={isMobile ? -28 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 48 : 30}
          />
          <YAxis
            allowDecimals
            stroke="#64748b"
            width={isMobile ? 32 : 40}
            tick={{ fontSize: isMobile ? 10 : 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="average" name={seriesName} radius={[8, 8, 0, 0]} maxBarSize={isMobile ? 40 : 48}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
 * MAIN COMPONENT – Guest Only
 * ============================================================= */

export default function GuestMonthlyIncidentTrends() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(null);
  const [error, setError] = useState("");
  const loadRequestRef = useRef(0);

  const load = useCallback(async (showLoading = true) => {
    const requestId = ++loadRequestRef.current;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const result = await loadAll();
      if (requestId !== loadRequestRef.current) return;

      const { records: normalized } = normalize(result.map);
      const availableYears = buildYears(normalized);

      setRecords(normalized);
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
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  const handleRefresh = useCallback(() => {
    void load(false);
  }, [load]);

  /* ---------- DERIVED ---------- */

  const years = useMemo(() => buildYears(records), [records]);
  const summary = useMemo(() => buildSummary(records), [records]);

  const yearScoped = useMemo(() => {
    if (!selectedYear) return records;
    return records.filter((r) => r.date?.year === selectedYear);
  }, [records, selectedYear]);

  const yearSummary = useMemo(() => buildSummary(yearScoped), [yearScoped]);

  const monthlyChart = useMemo(
    () => buildAverageChartData(yearSummary, "month"),
    [yearSummary],
  );

  const yearlyChart = useMemo(
    () => buildAverageChartData(summary, "year"),
    [summary],
  );

  useEffect(() => {
    if (years.length === 0) return;
    setSelectedYear((prev) => {
      const numeric = Number(prev);
      if (prev !== null && years.includes(numeric)) return numeric;
      return years[years.length - 1];
    });
  }, [years]);

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
            Calculating community average reports…
          </p>
        </div>
      </div>
    );
  }

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
                  Community Average Reports
                </h1>
                <p className="mt-2 text-sm text-blue-100/90">
                  Public view of approved incident, hazard, and service trends
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-black text-white ring-1 ring-white/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">Guest Viewer</p>
              <p className="mt-0.5 truncate text-xs text-blue-50/80">
                Viewing public community averages only
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/15">
              Guest
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
                    <label htmlFor="guest-trend-year" className="sr-only">
                      Select year
                    </label>
                    <select
                      id="guest-trend-year"
                      value={selectedYear ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedYear(v ? Number(v) : null);
                      }}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {years.length === 0 && (
                        <option value="">No years available</option>
                      )}
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Across {summary.span} year{summary.span === 1 ? "" : "s"}
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
                <Panel
                  title={`Community Average per Month${selectedYear ? ` — ${selectedYear}` : ""}`}
                  subtitle={
                    selectedYear
                      ? `Based on ${yearSummary.total} approved community records in ${selectedYear} (÷ 12)`
                      : "Average monthly volume across community records"
                  }
                >
                  {yearSummary.total === 0 ? (
                    <EmptyState
                      icon={BarChart3}
                      title="No community records for this year"
                      description="There are currently no approved submissions for the selected year."
                    />
                  ) : (
                    <>
                      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatCard
                          icon={TrendingUp}
                          label="Community Avg / Month"
                          value={averageDisplay(yearSummary.total, 12)}
                          detail={`${yearSummary.total} in ${selectedYear}`}
                          wrapperClass="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"
                          iconClass="bg-violet-600"
                        />
                        <StatCard
                          icon={Layers}
                          label="Community Records"
                          value={yearSummary.total}
                          detail={`Year ${selectedYear}`}
                          wrapperClass="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                          iconClass="bg-blue-600"
                        />
                      </div>

                      <div className="mb-6">
                        <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                          Average by Report Type
                        </p>
                        <AverageBarChart data={monthlyChart} seriesName="Avg / month" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {SOURCES.map((source) => {
                          const count = yearSummary.byKind[source.key] || 0;
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

              {/* ==================== YEARLY TAB ==================== */}
              {tab === "yearly" && (
                <Panel
                  title="Community Average per Year"
                  subtitle={`Mean yearly volume over ${summary.span} year${summary.span === 1 ? "" : "s"}`}
                >
                  {summary.total === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title="No community records available"
                      description="Yearly averages require records with valid dates."
                    />
                  ) : (
                    <>
                      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatCard
                          icon={BarChart3}
                          label="Community Avg / Year"
                          value={averageDisplay(summary.total, Math.max(1, summary.span))}
                          detail={`${summary.total} records`}
                          wrapperClass="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                          iconClass="bg-blue-600"
                        />
                        <StatCard
                          icon={TrendingUp}
                          label="Community Avg / Month"
                          value={averageDisplay(summary.total, Math.max(1, summary.span * 12))}
                          detail={`Across ${summary.span} year${summary.span === 1 ? "" : "s"}`}
                          wrapperClass="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"
                          iconClass="bg-violet-600"
                        />
                      </div>

                      <div className="mb-6">
                        <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
                          Average by Report Type (per year)
                        </p>
                        <AverageBarChart data={yearlyChart} seriesName="Avg / year" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {SOURCES.map((source) => {
                          const count = summary.byKind[source.key] || 0;
                          return (
                            <AverageCard
                              key={source.key}
                              source={source}
                              value={averageDisplay(count, Math.max(1, summary.span))}
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
          </div>
        </section>

        {/* FOOTER */}
        <div className="mt-6 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400 dark:text-slate-600">
            Public community data only • Guest view
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