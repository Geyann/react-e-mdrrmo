"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  LayoutDashboard,
  Siren,
  Ambulance,
  MapPinned,
  Users,
  Activity,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ============================================================
// TABLE / COLUMN ASSUMPTIONS — adjust to match your actual schema
// ------------------------------------------------------------
// incident_reports   : id, type, status, created_at, location
// hazard_reports     : id, hazard_type, status, created_at
// borrow-vehicle      : id, vehicle, status, date  (already used in AdminBorrowAnalytics)
// patient_records    : id, created_at
// ============================================================

const STATUS_COLORS = {
  pending: "#f59e0b",
  active: "#3b82f6",
  dispatched: "#8b5cf6",
  resolved: "#10b981",
  rejected: "#ef4444",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

const StatCard = ({ icon: Icon, label, value, loading, accent }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      )}
    </div>
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    activeIncidents: 0,
    pendingDispatch: 0,
    hazardReports: 0,
    vehiclesOut: 0,
  });
  const [incidentTrend, setIncidentTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);

  // ---- Role gate: only Staff / Admin ----
  useEffect(() => {
    const storedStaff = localStorage.getItem("currentStaff");
    const storedUser = localStorage.getItem("currentUser");
    const session = storedStaff || storedUser;

    if (!session) {
      navigate("/login", { replace: true, state: { error: "Please log in first." } });
      return;
    }

    const parsed = JSON.parse(session);
    if (!["staff", "admin"].includes((parsed.role || "").toLowerCase())) {
      navigate("/home", { replace: true, state: { error: "You don't have access to the dashboard." } });
      return;
    }

    setRole(parsed.role.toLowerCase());
    setCheckingAuth(false);
  }, [navigate]);

  const fetchDashboardData = async () => {
    setError("");
    try {
      const [
        { count: activeIncidents },
        { count: pendingDispatch },
        { count: hazardReports },
        { count: vehiclesOut },
        { data: incidents },
      ] = await Promise.all([
        supabase.from("incident_reports").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("incident_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("hazard_reports").select("*", { count: "exact", head: true }),
        supabase.from("borrow-vehicle").select("*", { count: "exact", head: true }).eq("status", "ongoing"),
        supabase
          .from("incident_reports")
          .select("id, type, status, location, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setStats({
        activeIncidents: activeIncidents || 0,
        pendingDispatch: pendingDispatch || 0,
        hazardReports: hazardReports || 0,
        vehiclesOut: vehiclesOut || 0,
      });

      setRecentIncidents(incidents || []);

      // ---- Build 7-day incident trend ----
      const { data: last7Days } = await supabase
        .from("incident_reports")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const trendMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        trendMap[key] = 0;
      }
      (last7Days || []).forEach((row) => {
        const key = new Date(row.created_at).toLocaleDateString("en-US", { weekday: "short" });
        if (key in trendMap) trendMap[key] += 1;
      });
      setIncidentTrend(Object.entries(trendMap).map(([name, count]) => ({ name, count })));

      // ---- Status breakdown for pie chart ----
      const { data: allIncidents } = await supabase.from("incident_reports").select("status");
      const statusCounts = {};
      (allIncidents || []).forEach((row) => {
        const s = row.status || "pending";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      setStatusBreakdown(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth) fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const statusColorFor = (status) => STATUS_COLORS[(status || "").toLowerCase()] || "#9ca3af";

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 pt-10 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-xl px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Centralized Dashboard &amp; Analytics</h1>
              <p className="text-blue-100 text-sm">
                Naic MDRRMO — real-time overview of incidents, hazards, and dispatch
                {role ? ` · signed in as ${role}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition text-white font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          <StatCard
            icon={Siren}
            label="Active Incidents"
            value={stats.activeIncidents}
            loading={loading}
            accent="bg-blue-600"
          />
          <StatCard
            icon={Activity}
            label="Pending Dispatch"
            value={stats.pendingDispatch}
            loading={loading}
            accent="bg-amber-500"
          />
          <StatCard
            icon={MapPinned}
            label="Hazard Reports"
            value={stats.hazardReports}
            loading={loading}
            accent="bg-purple-600"
          />
          <StatCard
            icon={Ambulance}
            label="Vehicles Out"
            value={stats.vehiclesOut}
            loading={loading}
            accent="bg-emerald-600"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* 7-day trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800">Incident Reports — Last 7 Days</h2>
            <p className="text-sm text-gray-400 mb-4">Daily volume of reported incidents</p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={incidentTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incidentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis dataKey="name" stroke="#000" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis stroke="#000" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#333", border: "none", borderRadius: "8px", color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#incidentFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800">Incident Status</h2>
            <p className="text-sm text-gray-400 mb-4">Current breakdown</p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={statusColorFor(entry.name) || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent incidents table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Incident Reports</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recentIncidents.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No incident reports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Location</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-gray-700">{row.type || "—"}</td>
                      <td className="py-3 pr-4 text-gray-500">{row.location || "—"}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: statusColorFor(row.status) }}
                        >
                          {row.status || "pending"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}