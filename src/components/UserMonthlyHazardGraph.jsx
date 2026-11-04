"use client";

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
  TriangleAlert,
} from "lucide-react";
import { supabase } from "../createClient";
import {
  HAZARD_CATEGORIES,
  parseHazardTypeFromDescription,
} from "../utils/HazardTaxonomy";

/* ══════════════════════════════════════════════════════════════════
   CONFIG

   Hazard categories are derived from HazardTaxonomy.js so this chart
   always uses the same taxonomy as HazardReport.jsx. If the form ever
   adds a category, the chart picks it up automatically.
   ══════════════════════════════════════════════════════════════════ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const RISK_LEVELS = [
  { key: "low",      label: "Low Risk",      color: "#22c55e" },
  { key: "medium",   label: "Moderate Risk", color: "#eab308" }, // matches form label
  { key: "high",     label: "High Risk",     color: "#ea580c" },
  { key: "critical", label: "Critical Risk", color: "#dc2626" },
];

const RISK_MAP = Object.fromEntries(
  RISK_LEVELS.map((risk) => [risk.key, risk]),
);

/* Colors are assigned deterministically by category order so the same
   hazard type always gets the same color in the chart, legend, and
   tooltip. Colors are chosen from a palette that is distinguishable
   at typical chart sizes. */
const CATEGORY_PALETTE = [
  "#0ea5e9", // Flood          — water blue
  "#6366f1", // Weather        — indigo
  "#b45309", // Geological     — earth
  "#475569", // Other Natural  — slate
];

const HAZARD_TYPES = HAZARD_CATEGORIES.map((category, index) => ({
  key: category.id,                              // "Flood" | "Weather" | "Geological" | "Other Natural"
  label: category.label,                         // human label from taxonomy
  color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
}));

const HAZARD_TYPE_MAP = Object.fromEntries(
  HAZARD_TYPES.map((type) => [type.key, type]),
);

/* A stable list of every category key, used to seed the monthly
   aggregation. Seeding prevents the silent NaN drop bug that
   occurred when a bucket was referenced before it was initialized. */
const ALL_CATEGORY_KEYS = HAZARD_TYPES.map((type) => type.key);

/* ══════════════════════════════════════════════════════════════════
   DATE HELPERS

   date_observed is parsed as text. This prevents a YYYY-MM-DD
   value from shifting to the previous or next month because of
   the browser's local timezone.
   ══════════════════════════════════════════════════════════════════ */

const parseDateParts = (value) => {
  if (!value) return null;

  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

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

  return { year, month, monthIndex: month - 1 };
};

/* ══════════════════════════════════════════════════════════════════
   NORMALIZERS

   Categories are normalized against the taxonomy's id list only.
   Anything that doesn't match falls into "Other Natural" — which is
   the same bucket the form uses for "Other Natural".
   ══════════════════════════════════════════════════════════════════ */

const normalizeRisk = (value) => {
  const risk = String(value || "medium")
    .trim()
    .toLowerCase();

  if (
    risk === "low" ||
    risk === "medium" ||
    risk === "high" ||
    risk === "critical"
  ) {
    return risk;
  }

  return "medium";
};

const CATEGORY_LOOKUP = Object.fromEntries(
  HAZARD_CATEGORIES.map((category) => [
    category.id.toLowerCase(),
    category.id,
  ]),
);

const normalizeHazardType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (!type) return "Other Natural";

  // Direct match against taxonomy ids, e.g. "flood" -> "Flood"
  if (CATEGORY_LOOKUP[type]) {
    return CATEGORY_LOOKUP[type];
  }

  // Broad keyword fallback so older rows that used free-text categories
  // still land in a sensible bucket.
  if (type.includes("flood")) return "Flood";
  if (type.includes("weather") || type.includes("typhoon") || type.includes("rain")) return "Weather";
  if (type.includes("geolog") || type.includes("earthquake") || type.includes("landslide")) return "Geological";

  return "Other Natural";
};

/* Reads the optional specific hazard type that HazardReport.jsx embeds
   as "Type: <specific>\n\n<description>". Used for a secondary filter
   so "Flash flood" and "Flooding" are distinguishable in the chart. */
const extractSpecificType = (description) => {
  try {
    const parsed = parseHazardTypeFromDescription(description);
    return parsed || null;
  } catch {
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════════
   DATA FETCHING
   ══════════════════════════════════════════════════════════════════ */

const fetchHazardRows = async () => {
  const { data, error } = await supabase
    .from("hazard_reports")
    .select(
      "date_observed, risk_level, hazard_category, hazard_description",
    )
    .not("date_observed", "is", null)
    .limit(5000);

  if (error) {
    throw error;
  }

  return data || [];
};

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function UserMonthlyHazardGraph() {
  const [records, setRecords] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [groupBy, setGroupBy] = useState("type");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  /* ── Fetch hazard records ────────────────────────────────────── */

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const rows = await fetchHazardRows();
        if (!active) return;

        setRecords(rows);

        const years = [
          ...new Set(
            rows
              .map((row) => parseDateParts(row.date_observed))
              .filter(Boolean)
              .map((date) => date.year),
          ),
        ].sort((a, b) => b - a);

        setAvailableYears(years);
      } catch (loadError) {
        console.error("Error fetching hazard metrics:", loadError);

        if (active) {
          setError(
            loadError?.message || "Unable to load hazard analytics.",
          );
          setRecords([]);
          setAvailableYears([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [reloadVersion]);

  /* ── Hazard types available in the database ─────────────────── */

  const availableTypes = useMemo(() => {
    const usedTypes = new Set(
      records.map((record) =>
        normalizeHazardType(record.hazard_category),
      ),
    );

    return HAZARD_TYPES.filter((type) => usedTypes.has(type.key));
  }, [records]);

  /* ── Keep selected year valid ───────────────────────────────── */

  useEffect(() => {
    if (
      selectedYear === "all" ||
      availableYears.includes(Number(selectedYear))
    ) {
      return;
    }
    setSelectedYear("all");
  }, [availableYears, selectedYear]);

  /* ── Keep selected hazard type valid ────────────────────────── */

  useEffect(() => {
    if (selectedType === "all") return;

    const stillAvailable = availableTypes.some(
      (type) => type.key === selectedType,
    );

    if (!stillAvailable) setSelectedType("all");
  }, [availableTypes, selectedType]);

  /* ── Filter records ─────────────────────────────────────────── */

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const date = parseDateParts(record.date_observed);
      if (!date) return false;

      if (
        selectedYear !== "all" &&
        date.year !== Number(selectedYear)
      ) {
        return false;
      }

      if (selectedType !== "all") {
        const type = normalizeHazardType(record.hazard_category);
        if (type !== selectedType) return false;
      }

      return true;
    });
  }, [records, selectedType, selectedYear]);

  /* ── Aggregate monthly analytics ────────────────────────────── */

  const analytics = useMemo(() => {
    /* Seed every bucket so that any category written by the form
       has somewhere to accumulate. This eliminates the silent NaN
       drop that occurred when a category was referenced before it
       was defined on the monthly row. */
    const riskData = MONTHS.map((month, monthIndex) => ({
      name: month,
      monthNumber: monthIndex + 1,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      total: 0,
    }));

    const typeData = MONTHS.map((month, monthIndex) => {
      const row = {
        name: month,
        monthNumber: monthIndex + 1,
        total: 0,
      };
      ALL_CATEGORY_KEYS.forEach((key) => {
        row[key] = 0;
      });
      return row;
    });

    const typeTotals = Object.fromEntries(
      ALL_CATEGORY_KEYS.map((key) => [key, 0]),
    );

    let critical = 0;

    filteredRecords.forEach((record) => {
      const date = parseDateParts(record.date_observed);
      if (!date) return;

      const monthIndex = date.monthIndex;
      const risk = normalizeRisk(record.risk_level);
      const type = normalizeHazardType(record.hazard_category);

      riskData[monthIndex][risk] += 1;
      riskData[monthIndex].total += 1;

      if (typeData[monthIndex][type] === undefined) {
        // Defensive: should never happen now that the row is fully
        // seeded from ALL_CATEGORY_KEYS. If it does (e.g. taxonomy
        // changed mid-session), drop the record into "Other Natural"
        // instead of producing NaN.
        typeData[monthIndex]["Other Natural"] =
          (typeData[monthIndex]["Other Natural"] || 0) + 1;
        typeTotals["Other Natural"] =
          (typeTotals["Other Natural"] || 0) + 1;
      } else {
        typeData[monthIndex][type] += 1;
        typeTotals[type] += 1;
      }

      typeData[monthIndex].total += 1;

      if (risk === "critical") critical += 1;
    });

    const total = riskData.reduce(
      (sum, month) => sum + month.total,
      0,
    );

    const peakMonth = riskData.reduce(
      (largest, current) =>
        current.total > largest.total ? current : largest,
      { name: "—", total: 0 },
    );

    const topType = HAZARD_TYPES.reduce(
      (largest, current) => {
        const currentCount = typeTotals[current.key] || 0;
        const largestCount = typeTotals[largest.key] || 0;
        return currentCount > largestCount ? current : largest;
      },
      HAZARD_TYPES[0],
    );

    return {
      riskData,
      typeData,
      typeTotals,
      total,
      critical,
      peakMonth:
        total > 0
          ? `${peakMonth.name} (${peakMonth.total})`
          : "—",
      topType:
        total > 0
          ? `${topType.label} (${typeTotals[topType.key]})`
          : "—",
    };
  }, [filteredRecords]);

  /* ── Active chart configuration ────────────────────────────── */

  const chartData =
    groupBy === "type" ? analytics.typeData : analytics.riskData;

  const activeSeries =
    groupBy === "type" ? HAZARD_TYPES : RISK_LEVELS;

  const activeSeriesMap =
    groupBy === "type" ? HAZARD_TYPE_MAP : RISK_MAP;

  /* ── Refresh ────────────────────────────────────────────────── */

  const handleRefresh = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  /* ── Loading card ───────────────────────────────────────────── */

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading hazard report analytics"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <TriangleAlert className="h-5 w-5 text-orange-600" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Announce to assistive tech that data is loading. */}
          <p
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            Loading hazard report analytics
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
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
        <div
          role="alert"
          className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Unable to load hazard analytics
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

  /* ── Main component ─────────────────────────────────────────── */

  return (
    <section
      aria-labelledby="hazard-monthly-chart-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <TriangleAlert className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>

          <div>
            <h2
              id="hazard-monthly-chart-title"
              className="text-lg font-black text-slate-800 dark:text-slate-100"
            >
              Monthly Natural Disaster Reports
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Monthly reports grouped by hazard category and
              risk level
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hazard category filter */}
          <select
            aria-label="Filter hazard reports by category"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="max-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All hazard categories</option>

            {availableTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh hazard analytics"
            title="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Year filter */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              aria-label="Filter hazard reports by year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All years</option>

              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  Total Reports
                </p>

                <p className="mt-1 text-2xl font-black text-orange-800 dark:text-orange-200">
                  {analytics.total}
                </p>
              </div>

              <BarChart3 className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Critical Reports
                </p>

                <p className="mt-1 text-2xl font-black text-red-800 dark:text-red-200">
                  {analytics.critical}
                </p>
              </div>

              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  Top Category
                </p>

                <p className="mt-1 truncate text-base font-black text-sky-800 dark:text-sky-200">
                  {analytics.topType}
                </p>
              </div>

              <TriangleAlert className="h-6 w-6 shrink-0 text-sky-500" />
            </div>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Peak Month
                </p>

                <p className="mt-1 truncate text-lg font-black text-violet-800 dark:text-violet-200">
                  {analytics.peakMonth}
                </p>
              </div>

              <CalendarDays className="h-6 w-6 shrink-0 text-violet-500" />
            </div>
          </div>
        </div>

        {/* Chart toolbar */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Monthly breakdown
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              January through December
            </p>
          </div>

          <div
            className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            role="group"
            aria-label="Choose chart grouping"
          >
            <button
              type="button"
              onClick={() => setGroupBy("type")}
              aria-pressed={groupBy === "type"}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                groupBy === "type"
                  ? "bg-sky-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Hazard Category
            </button>

            <button
              type="button"
              onClick={() => setGroupBy("risk")}
              aria-pressed={groupBy === "risk"}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                groupBy === "risk"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Risk Level
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:p-4">
          {analytics.total === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <BarChart3 className="h-7 w-7 text-slate-400" />
              </div>

              <p className="mt-4 font-bold text-slate-700 dark:text-slate-200">
                No hazard reports found
              </p>

              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Try selecting another year or hazard category, or
                refresh the analytics.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
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
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />

                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.10)" }}
                  contentStyle={{
                    border: "none",
                    borderRadius: "12px",
                    background: "#0f172a",
                    color: "#ffffff",
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.25)",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: 800,
                    marginBottom: "6px",
                  }}
                  itemStyle={{ padding: "2px 0" }}
                  formatter={(value, name) => {
                    const item = activeSeriesMap[String(name)];
                    return [value, item?.label || name];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />

                <Legend
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }}
                />

                {activeSeries.map((item, index) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    stackId="hazard-reports"
                    name={item.label}
                    fill={item.color}
                    barSize={34}
                    radius={
                      index === activeSeries.length - 1
                        ? [7, 7, 0, 0]
                        : [0, 0, 0, 0]
                    }
                    minPointSize={1}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}