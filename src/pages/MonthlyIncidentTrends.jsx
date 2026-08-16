import { useEffect, useMemo, useState } from "react";
import { supabase } from "../createClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Siren,ArrowLeft, TrendingUp, CalendarDays, ShieldAlert, Loader2, AlertCircle, Link } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];



const TYPE_COLORS = {
  "Medical Emergency": "#ef4444",
  "Fire": "#f97316",
  "Accident": "#eab308",
  "Natural Disaster": "#8b5cf6",
};
const typeColor = (t) => TYPE_COLORS[t] || "#64748b";

/* Timezone-safe: "2026-08-04" -> { year: 2026, month: 8 } (1-12) */
const parseParts = (dateStr) => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
};

export default function IncidentTrends() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("reportIncident")
          .select("date, incidentType, priorityLevel");
        if (error) throw error;
        if (cancelled) return;

        setRows(data || []);

        // Default the year selector to the most recent year in the data
        // (no hardcoded years — everything is derived from real records).
        const years = [...new Set((data || [])
          .map((r) => parseParts(r.date)?.year)
          .filter(Boolean))].sort((a, b) => a - b);
        setSelectedYear(years[years.length - 1] || new Date().getFullYear());
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load incident data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---- stats ---- */
  const stats = useMemo(() => {
    const typeCounts = {};
    const yearCounts = {};
    let high = 0;
    for (const r of rows) {
      const t = r.incidentType || "Unknown";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
      const y = parseParts(r.date)?.year;
      if (y) yearCounts[y] = (yearCounts[y] || 0) + 1;
      if (r.priorityLevel === "High" || r.priorityLevel === "Critical") high++;
    }
    const mostFrequent = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const peakYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    return { total: rows.length, mostFrequent, peakYear, high };
  }, [rows]);

  const years = useMemo(
    () => [...new Set(rows.map((r) => parseParts(r.date)?.year).filter(Boolean))].sort((a, b) => a - b),
    [rows]
  );

  /* ---- monthly view ---- */
  const monthlyData = useMemo(() => {
    const counts = MONTHS.map((m) => ({ month: m, incidents: 0 }));
    for (const r of rows) {
      const p = parseParts(r.date);
      if (p && p.year === selectedYear && p.month >= 1 && p.month <= 12) {
        counts[p.month - 1].incidents++;
      }
    }
    return counts;
  }, [rows, selectedYear]);

  const monthlyTotal = monthlyData.reduce((s, m) => s + m.incidents, 0);

  /* ---- yearly view ---- */
  const yearlyChartData = useMemo(
    () => years.map((year) => {
      const row = { year: String(year) };
      for (const r of rows) {
        const p = parseParts(r.date);
        if (p && p.year === year) {
          const t = r.incidentType || "Unknown";
          row[t] = (row[t] || 0) + 1;
        }
      }
      return row;
    }),
    [rows, years]
  );

  const yearlyMatrix = useMemo(() => {
    const types = [...new Set(rows.map((r) => r.incidentType || "Unknown"))];
    const grid = {};
    for (const r of rows) {
      const p = parseParts(r.date);
      if (!p) continue;
      const t = r.incidentType || "Unknown";
      const key = `${p.year}::${t}`;
      grid[key] = (grid[key] || 0) + 1;
    }
    return { types, grid };
  }, [rows]);

  const yearTotal = (year) =>
    years.length ? yearlyChartData.find((d) => Number(d.year) === year) : null;

  /* ---- render ---- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="font-semibold">Loading incident trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-10">
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-700">Failed to load incident data</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        
    
      {/* Header banner */}
      <div className="rounded-t-3xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-center shadow-xl">
        <Siren className="mx-auto h-10 w-10 text-white/90" />
        <h1 className="mt-2 text-3xl font-bold text-white">MDRRMO Naic — Incident Trends</h1>
        <p className="mt-1 text-sm text-white/80">
        
          Monthly and yearly tracking of disaster and emergency response operations.
        </p>
        {rows.length === 0 && (
          <p className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-semibold text-white">
            No incident reports yet — check back after reports are submitted.
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 rounded-b-3xl border border-t-0 border-slate-200 bg-white p-6 shadow-xl md:grid-cols-4">
        <div className="rounded-2xl bg-blue-600 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Total Incidents</p>
          <p className="mt-1 text-3xl font-extrabold">{stats.total}</p>
          <Siren className="mt-2 h-5 w-5 text-white/60" />
        </div>
        <div className="rounded-2xl bg-amber-500 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Most Frequent</p>
          <p className="mt-1 truncate text-xl font-extrabold">{stats.mostFrequent}</p>
          <TrendingUp className="mt-2 h-5 w-5 text-white/60" />
        </div>
        <div className="rounded-2xl bg-red-500 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Peak Year</p>
          <p className="mt-1 text-3xl font-extrabold">{stats.peakYear}</p>
          <CalendarDays className="mt-2 h-5 w-5 text-white/60" />
        </div>
        <div className="rounded-2xl bg-emerald-500 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">High Priority</p>
          <p className="mt-1 text-3xl font-extrabold">{stats.high}</p>
          <ShieldAlert className="mt-2 h-5 w-5 text-white/60" />
        </div>
      </div>

      {/* Tab switch */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { key: "monthly", label: "Monthly Trends" },
            { key: "yearly", label: "Yearly Trends" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-6 py-2.5 text-sm font-bold transition ${
                tab === t.key
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= MONTHLY VIEW ================= */}
      {tab === "monthly" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-lg font-bold text-slate-800">Incidents per Month</h2>
              <select
                value={selectedYear ?? ""}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                    formatter={(v) => [`${v} incident(s)`, "Total"]}
                  />
                  <Bar dataKey="incidents" name="Incidents" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3">Incidents</th>
                  <th className="px-5 py-3">Share of {selectedYear}</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-semibold text-slate-700">{m.month}</td>
                    <td className="px-5 py-2.5 text-slate-600">{m.incidents}</td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {monthlyTotal > 0 ? `${((m.incidents / monthlyTotal) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold text-slate-800">
                  <td className="px-5 py-3">Total — {selectedYear}</td>
                  <td className="px-5 py-3">{monthlyTotal}</td>
                  <td className="px-5 py-3">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= YEARLY VIEW ================= */}
      {tab === "yearly" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              Incidents per Year by Type
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  />
                  <Legend />
                  {yearlyMatrix.types.map((t) => (
                    <Bar key={t} dataKey={t} stackId="incidents" fill={typeColor(t)} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly matrix table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Incident Type</th>
                  {years.map((y) => (
                    <th key={y} className="px-5 py-3 text-center">{y}</th>
                  ))}
                  <th className="px-5 py-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {yearlyMatrix.types.map((t) => {
                  const rowTotal = years.reduce(
                    (s, y) => s + (yearlyMatrix.grid[`${y}::${t}`] || 0), 0
                  );
                  return (
                    <tr key={t} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="flex items-center gap-2 px-5 py-2.5 font-semibold text-slate-700">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: typeColor(t) }} />
                        {t}
                      </td>
                      {years.map((y) => (
                        <td key={y} className="px-5 py-2.5 text-center text-slate-600">
                          {yearlyMatrix.grid[`${y}::${t}`] || 0}
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-center font-bold text-slate-800">{rowTotal}</td>
                    </tr>
                  );
                })}
                <tr className="bg-purple-50 font-bold text-slate-800">
                  <td className="px-5 py-3">All Types</td>
                  {years.map((y) => {
                    const row = yearTotal(y);
                    const sum = row
                      ? Object.entries(row)
                          .filter(([k]) => k !== "year")
                          .reduce((s, [, v]) => s + (v || 0), 0)
                      : 0;
                    return (
                      <td key={y} className="px-5 py-3 text-center">{sum}</td>
                    );
                  })}
                  <td className="px-5 py-3 text-center">{stats.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Source: MDRRMO Naic incident reports · Figures update automatically from the reportIncident table.
      </p>
    </div>
  );
}