import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  RefreshCw,
  Siren,
} from "lucide-react";
import { supabase } from "../createClient";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const INCIDENT_TYPES = [
  {
    key: "medical",
    label: "Medical Emergency",
    color: "#3b82f6",
  },
  {
    key: "fire",
    label: "Fire",
    color: "#ea580c",
  },
  {
    key: "accident",
    label: "Accident",
    color: "#dc2626",
  },
  {
    key: "other",
    label: "Other",
    color: "#eab308",
  },
];

const INCIDENT_TYPE_MAP =
  Object.fromEntries(
    INCIDENT_TYPES.map((type) => [
      type.key,
      type,
    ]),
  );

/* ══════════════════════════════════════════════════════════════════
   DATE HELPERS

   The incident date is a text column. Parse only the leading
   YYYY-MM-DD portion to prevent timezone-related month shifts.
   ══════════════════════════════════════════════════════════════════ */

const parseDateParts = (value) => {
  if (!value) return null;

  const match = String(value)
    .trim()
    .match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/,
    );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return {
    year,
    month,
    monthIndex: month - 1,
  };
};

const normalizeIncidentType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (type.includes("medical")) {
    return "medical";
  }

  if (type.includes("fire")) {
    return "fire";
  }

  if (
    type.includes("accident") ||
    type.includes("crash") ||
    type.includes("collision")
  ) {
    return "accident";
  }

  return "other";
};

const normalizePriority = (value) => {
  const priority = String(value || "")
    .trim()
    .toLowerCase();

  if (
    priority === "high" ||
    priority === "critical" ||
    priority === "urgent"
  ) {
    return "high";
  }

  return "low";
};

/* ══════════════════════════════════════════════════════════════════
   DATA FETCHING
   ══════════════════════════════════════════════════════════════════ */

const fetchIncidentRows = async () => {
  const { data, error } = await supabase
    .from("reportIncident")
    .select(
      "date, incidentType, priorityLevel",
    )
    .not("date", "is", null)
    .limit(5000);

  if (error) {
    throw error;
  }

  return data || [];
};

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function UserMonthlyIncidentGraph() {
  const [records, setRecords] = useState([]);
  const [availableYears, setAvailableYears] =
    useState([]);
  const [selectedYear, setSelectedYear] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] =
    useState(0);

  /* ── Fetch incident records ─────────────────────────────────── */

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const rows = await fetchIncidentRows();

        if (!active) return;

        setRecords(rows);

        const years = [
          ...new Set(
            rows
              .map((row) => parseDateParts(row.date))
              .filter(Boolean)
              .map((date) => date.year),
          ),
        ].sort((a, b) => b - a);

        setAvailableYears(years);
      } catch (loadError) {
        console.error(
          "Error fetching incident analytics:",
          loadError,
        );

        if (active) {
          setError(
            loadError?.message ||
              "Unable to load incident analytics.",
          );

          setRecords([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [reloadVersion]);

  /* ── Keep selected year valid ───────────────────────────────── */

  useEffect(() => {
    if (
      selectedYear === "all" ||
      availableYears.includes(
        Number(selectedYear),
      )
    ) {
      return;
    }

    setSelectedYear("all");
  }, [availableYears, selectedYear]);

  /* ── Aggregate monthly incident data ────────────────────────── */

  const chartData = useMemo(() => {
    return MONTHS.map((month, monthIndex) => {
      const row = {
        name: month,
        monthNumber: monthIndex + 1,
        medical: 0,
        fire: 0,
        accident: 0,
        other: 0,
        highPriority: 0,
        total: 0,
      };

      records.forEach((record) => {
        const date = parseDateParts(record.date);

        if (!date) return;

        if (
          selectedYear !== "all" &&
          date.year !== Number(selectedYear)
        ) {
          return;
        }

        if (date.monthIndex !== monthIndex) {
          return;
        }

        const type = normalizeIncidentType(
          record.incidentType,
        );

        const priority =
          normalizePriority(
            record.priorityLevel,
          );

        row[type] += 1;
        row.total += 1;

        if (priority === "high") {
          row.highPriority += 1;
        }
      });

      return row;
    });
  }, [records, selectedYear]);

  /* ── Summary statistics ─────────────────────────────────────── */

  const summary = useMemo(() => {
    const total = chartData.reduce(
      (sum, month) => sum + month.total,
      0,
    );

    const highPriority =
      chartData.reduce(
        (sum, month) =>
          sum + month.highPriority,
        0,
      );

    const activeMonths = chartData.filter(
      (month) => month.total > 0,
    );

    const peakMonth = chartData.reduce(
      (largest, current) => {
        if (current.total > largest.total) {
          return current;
        }

        return largest;
      },
      {
        name: "—",
        total: 0,
      },
    );

    return {
      total,
      highPriority,
      activeMonths: activeMonths.length,
      peakMonth:
        total > 0
          ? `${peakMonth.name} (${peakMonth.total})`
          : "—",
    };
  }, [chartData]);

  /* ── Refresh ────────────────────────────────────────────────── */

  const handleRefresh = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  /* ── Loading card ───────────────────────────────────────────── */

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading incident report analytics"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <Siren className="h-5 w-5 text-red-600" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/60"
              />
            ))}
          </div>

          <div className="mt-5 h-[320px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/60" />
        </div>
      </section>
    );
  }

  /* ── Error card ─────────────────────────────────────────────── */

  if (error) {
    return (
      <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-lg dark:border-red-900 dark:bg-slate-800">
        <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Unable to load incident analytics
          </h2>

          <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  /* ── Chart ──────────────────────────────────────────────────── */

  return (
    <section
      aria-labelledby="incident-monthly-chart-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <Siren className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>

          <div>
            <h2
              id="incident-monthly-chart-title"
              className="text-lg font-black text-slate-800 dark:text-slate-100"
            >
              Monthly Incident Reports
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Monthly reports grouped by incident type
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              aria-label="Filter incident reports by year"
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(event.target.value)
              }
              className="appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">
                All years
              </option>

              {availableYears.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh incident analytics"
            title="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Total Reports
                </p>
                <p className="mt-1 text-2xl font-black text-red-800 dark:text-red-200">
                  {summary.total}
                </p>
              </div>

              <BarChart3 className="h-6 w-6 text-red-500" />
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  High Priority
                </p>
                <p className="mt-1 text-2xl font-black text-orange-800 dark:text-orange-200">
                  {summary.highPriority}
                </p>
              </div>

              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Peak Month
                </p>
                <p className="mt-1 truncate text-lg font-black text-violet-800 dark:text-violet-200">
                  {summary.peakMonth}
                </p>
              </div>

              <CalendarDays className="h-6 w-6 shrink-0 text-violet-500" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:p-4">
          {summary.total === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <BarChart3 className="h-7 w-7 text-slate-400" />
              </div>

              <p className="mt-4 font-bold text-slate-700 dark:text-slate-200">
                No incident reports found
              </p>

              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Try selecting another year or refresh
                the analytics.
              </p>
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 15,
                  right: 10,
                  left: -20,
                  bottom: 5,
                }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: "rgba(148, 163, 184, 0.10)",
                  }}
                  contentStyle={{
                    border: "none",
                    borderRadius: "12px",
                    background: "#0f172a",
                    color: "#ffffff",
                    boxShadow:
                      "0 10px 25px rgba(15, 23, 42, 0.25)",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: 800,
                    marginBottom: "6px",
                  }}
                  itemStyle={{
                    padding: "2px 0",
                  }}
                  formatter={(value, name) => {
                    const type =
                      INCIDENT_TYPE_MAP[
                        String(name)
                      ];

                    return [
                      value,
                      type?.label || name,
                    ];
                  }}
                  labelFormatter={(label) =>
                    `Month: ${label}`
                  }
                />

                <Legend
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{
                    paddingTop: "16px",
                    fontSize: "12px",
                  }}
                />

                {INCIDENT_TYPES.map(
                  (type, index) => (
                    <Bar
                      key={type.key}
                      dataKey={type.key}
                      stackId="incidents"
                      name={type.label}
                      fill={type.color}
                      barSize={34}
                      radius={
                        index ===
                        INCIDENT_TYPES.length - 1
                          ? [7, 7, 0, 0]
                          : [0, 0, 0, 0]
                      }
                      minPointSize={1}
                    />
                  ),
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

       
      </div>
    </section>
  );
}
