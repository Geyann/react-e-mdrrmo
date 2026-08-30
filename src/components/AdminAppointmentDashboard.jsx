"use client";

import React, { useEffect, useMemo, useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from "../createClient";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from "recharts";
import { Check, X, Clock, CheckCircle, XCircle, Search, AlertCircle, History, CalendarDays, Download } from "lucide-react";
const AdminDashboard = () => {
    // Shared State
    const [appointments, setAppointments] = useState([]);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [dateVolumeLimits, setDateVolumeLimits] = useState({});
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [volumeLimit, setVolumeLimit] = useState("");
    const [showVolumeModal, setShowVolumeModal] = useState(false);
    const [makeUnavailable, setMakeUnavailable] = useState(false);
    // Summary Report State
const [showReportModal, setShowReportModal] = useState(false);

    // Appointment Management State
    const [allAppointments, setAllAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [appointmentFilter, setAppointmentFilter] = useState("pending");
    const [searchTerm, setSearchTerm] = useState("");
    const [appointmentStats, setAppointmentStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
    });
    const [activeTab, setActiveTab] = useState("calendar");

    // History Tab State
    const [historyFilter, setHistoryFilter] = useState("all");
    const [historySearchTerm, setHistorySearchTerm] = useState("");

    // ---------- FIXED: timezone-safe helpers ----------
    // toISOString().split("T")[0] shifts the date by a day in negative-UTC timezones.
    const toDateString = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    // Parse month directly from the stored YYYY-MM-DD text (handles "2026-08-07" and ISO strings)
    const getMonthIndex = (dateStr) => {
        if (!dateStr) return -1;
        const m = Number(dateStr.split("T")[0].split("-")[1]);
        return m >= 1 && m <= 12 ? m - 1 : -1;
    };

    // Auto-mark date as unavailable when volume limit is reached
    const autoMarkUnavailableIfFull = async (date, limit, currentBookingCount) => {
        if (!limit) return;
        if (currentBookingCount >= limit) {
            const { data } = await supabase
                .from("date_restrictions")
                .select("is_unavailable")
                .eq("date", date)
                .single();

            if (!data || !data.is_unavailable) {
                await supabase
                    .from("date_restrictions")
                    .upsert(
                        { date, is_unavailable: true, volume_limit: limit },
                        { onConflict: "date" }
                    );
                setUnavailableDates(prev => [...new Set([...prev, date])]);
            }
        }
    };

    // Fetch all data
    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase.from("appointments").select("date, purpose, status");
            if (startDate) query = query.gte("date", startDate);
            if (endDate) query = query.lte("date", endDate);

            const { data: appointmentData, error: appointmentError } = await query;
            if (appointmentError) throw appointmentError;

            setAppointments(appointmentData || []);

            const { data: restrictionData, error: restrictionError } = await supabase
                .from("date_restrictions")
                .select("date, is_unavailable, volume_limit");

            if (restrictionError && restrictionError.code !== "PGRST116") {
                throw restrictionError;
            }

            const unavailable = [];
            const limits = {};

            restrictionData?.forEach(restriction => {
                if (restriction.is_unavailable) {
                    unavailable.push(restriction.date);
                }
                if (restriction.volume_limit) {
                    limits[restriction.date] = restriction.volume_limit;
                }
            });

            const updatedUnavailable = [...unavailable];
            const bookingCounts = {};

            (appointmentData || []).forEach(apt => {
                bookingCounts[apt.date] = (bookingCounts[apt.date] || 0) + 1;
            });

            for (const [date, limit] of Object.entries(limits)) {
                const count = bookingCounts[date] || 0;
                if (count >= limit && !updatedUnavailable.includes(date)) {
                    await supabase
                        .from("date_restrictions")
                        .upsert(
                            { date, is_unavailable: true, volume_limit: limit },
                            { onConflict: "date" }
                        );
                    updatedUnavailable.push(date);
                }
            }

            setUnavailableDates(updatedUnavailable);
            setDateVolumeLimits(limits);

            // ============================================================
            // FIXED: Select all appointments directly — no join needed
            // Uses user_id_from_auth (auth UUID) as the user identifier
            // ============================================================
            const { data: allApts, error: allAptsError } = await supabase
                .from("appointments")
                .select("*")
                .order("created_at", { ascending: false });

            if (allAptsError) throw allAptsError;

            // Normalize appointments
            const processedApts = (allApts || []).map(apt => {
                return {
                    ...apt,
                    id: apt.appointmentId || apt.id,
                    appointmentId: apt.appointmentId || apt.id,
                    status: apt.status || "pending",
                    // Use user_id_from_auth (auth UUID) as primary user ID
                    // Falls back to user_id (text) if null
                    user_id: apt.user_id_from_auth || apt.userId || "N/A", // Changed apt.user_id to apt.userId as per the `createAppointment` logic
                };
            });

            setAllAppointments(processedApts);

            const stats = {
                pending: processedApts.filter((apt) => apt.status === "pending").length || 0,
                approved: processedApts.filter((apt) => apt.status === "approved").length || 0,
                rejected: processedApts.filter((apt) => apt.status === "rejected").length || 0,
                total: processedApts.length || 0,
            };

            setAppointmentStats(stats);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    // Filter appointments for the main Appointments tab
    useEffect(() => {
        let filtered = allAppointments;

        if (appointmentFilter !== "all") {
            filtered = filtered.filter((apt) => apt.status === appointmentFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(
                (apt) =>
                    (apt.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (apt.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (apt.user_id || "").toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredAppointments(filtered);
    }, [allAppointments, appointmentFilter, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    // Toggle date availability
    const toggleDateAvailability = async (date) => {
        try {
            const isCurrentlyUnavailable = unavailableDates.includes(date);

            if (isCurrentlyUnavailable) {
                const { error } = await supabase
                    .from("date_restrictions")
                    .upsert(
                        { date, is_unavailable: false, volume_limit: dateVolumeLimits[date] || null },
                        { onConflict: "date" }
                    );

                if (error) throw error;
                setUnavailableDates(unavailableDates.filter(d => d !== date));
            } else {
                const { error } = await supabase
                    .from("date_restrictions")
                    .upsert(
                        { date, is_unavailable: true, volume_limit: dateVolumeLimits[date] || null },
                        { onConflict: "date" }
                    );

                if (error) throw error;
                setUnavailableDates([...unavailableDates, date]);
            }
        } catch (error) {
            console.error("Error toggling date availability:", error);
            alert("Failed to update date availability");
        }
    };

    // Set volume limit for a date
    const setVolumeLimitForDate = async () => {
        if (!selectedDate || !volumeLimit) {
            alert("Please select a date and enter a volume limit");
            return;
        }

        try {
            const limit = parseInt(volumeLimit);
            if (limit < 1) {
                alert("Volume limit must be at least 1");
                return;
            }

            // FIXED: count from ALL appointments (unfiltered) so date-range filters
            // don't corrupt the booking count used for auto-disable
            const currentBookingCount = allAppointments.filter(a => a.date === selectedDate).length;
            const shouldBeUnavailable = makeUnavailable || (currentBookingCount >= limit);

            const { error } = await supabase
                .from("date_restrictions")
                .upsert(
                    {
                        date: selectedDate,
                        volume_limit: limit,
                        is_unavailable: shouldBeUnavailable,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "date" }
                );

            if (error) throw error;

            setDateVolumeLimits({
                ...dateVolumeLimits,
                [selectedDate]: limit
            });

            if (shouldBeUnavailable && !unavailableDates.includes(selectedDate)) {
                setUnavailableDates([...unavailableDates, selectedDate]);
            } else if (!shouldBeUnavailable && unavailableDates.includes(selectedDate)) {
                setUnavailableDates(unavailableDates.filter(d => d !== selectedDate));
            }

            setVolumeLimit("");
            setMakeUnavailable(false);
            setShowVolumeModal(false);

            if (currentBookingCount >= limit) {
                alert(`Volume limit for ${selectedDate} set to ${limit}. Date has been auto-marked as unavailable because ${currentBookingCount} appointments already exist.`);
            } else {
                alert(`Volume limit for ${selectedDate} set to ${limit}`);
            }
        } catch (error) {
            console.error("Error setting volume limit:", error);
            alert("Failed to set volume limit");
        }
    };

    const handleCalendarDateClick = (date) => {
        const dateString = toDateString(date); // FIXED: timezone-safe
        setSelectedDate(dateString);
        setVolumeLimit(dateVolumeLimits[dateString] ? dateVolumeLimits[dateString].toString() : "");
        setMakeUnavailable(unavailableDates.includes(dateString));
        setShowVolumeModal(true);
    };

    // Update appointment status
    const updateAppointmentStatus = async (appointmentId, newStatus) => {
        try {
            const { error } = await supabase
                .from("appointments")
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                })
                .eq("appointmentId", appointmentId);

            if (error) {
                if (error.message && error.message.includes("status")) {
                    alert("The 'status' column doesn't exist in the appointments table. Please add it with: ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'pending';");
                } else if (error.message && error.message.includes("updated_at")) {
                    alert("The 'updated_at' column doesn't exist. Please add it with: ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMPTZ;");
                } else {
                    throw error;
                }
                return;
            }

            // If approving an appointment, check if the date's volume limit is reached
            if (newStatus === "approved") {
                const updatedAppt = allAppointments.find(a => a.appointmentId === appointmentId);
                if (updatedAppt) {
                    const date = updatedAppt.date;
                    const limit = dateVolumeLimits[date];
                    const { data: dateAppts } = await supabase
                        .from("appointments")
                        .select("appointmentId")
                        .eq("date", date)
                        .eq("status", "approved");

                    const count = dateAppts?.length || 0;
                    if (limit && count >= limit) {
                        await autoMarkUnavailableIfFull(date, limit, count);
                    }
                }
            }

            fetchData();
        } catch (err) {
            console.error("Error updating appointment:", err);
            alert("Failed to update appointment: " + err.message);
        }
    };

    // Chart Data Processing
    const purposeCounts = appointments.reduce((acc, curr) => {
        const p = curr.purpose || "Unspecified";
        acc[p] = (acc[p] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.keys(purposeCounts)
        .map(key => ({
            purpose: key.toUpperCase(),
            count: purposeCounts[key]
        }))
        .sort((a, b) => b.count - a.count);

    const statusChartData = [
        { name: "Pending", value: appointmentStats.pending, fill: "#FBBF24" },
        { name: "Approved", value: appointmentStats.approved, fill: "#34D399" },
        { name: "Rejected", value: appointmentStats.rejected, fill: "#F87171" },
    ];

    // ============================================================
    // NEW: Monthly Appointment Trends (same logic as AdminBorrowAnalytics)
    // Groups appointments into Jan–Dec, stacked bars by purpose,
    // filtered by the shared startDate/endDate range.
    // ============================================================
    const monthlyTrendData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // 1. Identify unique purposes (same as uniqueVehicles in borrow analytics)
        const uniquePurposes = [...new Set(appointments.map(a => a.purpose).filter(Boolean))];

        // 2. Initialize monthly structure
        const formattedData = months.map(month => {
            const entry = { name: month };
            uniquePurposes.forEach(p => { entry[p] = 0; });
            return entry;
        });

        // 3. Grouping logic (timezone-safe month parse)
        appointments.forEach(apt => {
            if (apt.date) {
                const monthIndex = getMonthIndex(apt.date);
                const purpose = apt.purpose;

                if (formattedData[monthIndex] && purpose) {
                    formattedData[monthIndex][purpose] += 1;
                }
            }
        });

        return formattedData;
    }, [appointments]);

    const TREND_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e", "#6366f1"];

    const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b"];

    const StatCard = ({ icon: Icon, label, count, color }) => (
        <div className={`p-4 rounded-xl border ${color} shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold opacity-70">{label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                <Icon className={`w-7 h-7 opacity-70`} />
            </div>
        </div>
    );

    // Get unique dates that have either restrictions or appointments
    const getAllDatesWithRestrictions = () => {
        const allDates = new Set([
            ...Object.keys(dateVolumeLimits),
            ...unavailableDates,
            ...appointments.map(a => a.date)
        ]);
        return Array.from(allDates).sort();
    };

    // Get processed (approved/rejected) appointments for History tab
    const getHistoryAppointments = () => {
        let history = allAppointments.filter(
            (apt) => apt.status === "approved" || apt.status === "rejected"
        );

        if (historyFilter !== "all") {
            history = history.filter((apt) => apt.status === historyFilter);
        }

        if (historySearchTerm) {
            history = history.filter(
                (apt) =>
                    (apt.fullName || "").toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (apt.purpose || "").toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    (apt.user_id || "").toLowerCase().includes(historySearchTerm.toLowerCase())
            );
        }

        return history;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 font-semibold">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
               {/* Header */}
<div className="flex items-center justify-between mb-6">
    <div>
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-purple-600" />
            Admin Appointments
        </h1>
        <p className="text-slate-500 mt-1">
            Manage appointment availability, review requests, and view analytics.
        </p>
    </div>
    <button
        onClick={() => setShowReportModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition"
    >
        <Download className="w-5 h-5" />
        Summary Report
    </button>
</div>

                {/* Tab Navigation */}
                <div className="mb-6 flex gap-4 border-b border-slate-200 bg-white p-4 rounded-t-2xl shadow-sm">
                    <button
                        onClick={() => setActiveTab("calendar")}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === "calendar"
                                ? "bg-purple-600 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <CalendarDays className="w-5 h-5" /> Calendar & Restrictions
                    </button>
                    <button
                        onClick={() => setActiveTab("appointments")}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === "appointments"
                                ? "bg-purple-600 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <CheckCircle className="w-5 h-5" /> Appointments
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            activeTab === "history"
                                ? "bg-purple-600 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <History className="w-5 h-5" /> History
                    </button>
                </div>

                {/* ===================== */}
                {/* CALENDAR & RESTRICTIONS */}
                {/* ===================== */}
                {activeTab === "calendar" && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                            {/* Analytics Section */}
                            <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">APPOINTMENT VOLUME</h2>
                                        <p className="text-slate-500 text-sm mt-1">Volume by purpose within selected date range.</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button
                                            onClick={() => { setStartDate(""); setEndDate(""); }}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-semibold text-slate-700 transition-colors text-sm"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full h-[300px]">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e0e0e0" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="purpose" type="category" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                                <Bar dataKey="count" barSize={25} radius={[0, 10, 10, 0]}>
                                                    {chartData.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-500 font-semibold">
                                            No data available for selected date range
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Calendar Section */}
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-800 mb-4">AVAILABILITY CALENDAR</h2>
                                <Calendar
                                    onClickDay={handleCalendarDateClick}
                                    tileClassName={({ date }) => {
                                        const d = toDateString(date); // FIXED: timezone-safe
                                        const isUnavailable = unavailableDates.includes(d);
                                        const hasLimit = dateVolumeLimits[d];

                                        let baseClasses = "relative text-sm text-center font-semibold rounded-md transition-all ";
                                        if (isUnavailable) {
                                            return baseClasses + "!bg-red-500 !text-white hover:bg-red-600";
                                        }
                                        if (hasLimit) {
                                            return baseClasses + "!bg-yellow-200 !text-slate-800 hover:bg-yellow-300";
                                        }
                                        return baseClasses + "!bg-green-100 !text-slate-800 hover:bg-green-200";
                                    }}
                                    className="react-calendar-custom" // Add a custom class for further styling if needed
                                />
                                <div className="mt-6 text-xs font-bold text-slate-600 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>Unavailable (auto when full)</div>
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-yellow-200 rounded-full mr-2 border border-slate-300"></span>Limited Volume</div>
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-green-100 rounded-full mr-2 border border-slate-300"></span>Available</div>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* NEW: MONTHLY APPOINTMENT TRENDS (borrow-analytics style) */}
                        {/* ============================================================ */}
                        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
                            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">MONTHLY APPOINTMENT TRENDS</h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Monthly appointment volume stacked by purpose (Jan–Dec)
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setStartDate(""); setEndDate(""); }}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-semibold text-slate-700 transition-colors text-sm"
                                >
                                    Reset Date Range
                                </button>
                            </div>

                            <div className="w-full h-[300px]">
                                {monthlyTrendData.some(entry =>
                                    Object.keys(entry).some(k => k !== "name" && entry[k] > 0)
                                ) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                            {Object.keys(monthlyTrendData[0])
                                                .filter(key => key !== "name")
                                                .map((purpose, index) => (
                                                    <Bar
                                                        key={purpose}
                                                        dataKey={purpose}
                                                        stackId="a"
                                                        fill={TREND_COLORS[index % TREND_COLORS.length]}
                                                        barSize={25}
                                                    />
                                                ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500 font-semibold">
                                        No data available for selected date range
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Volume Limits Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800">DATE RESTRICTIONS & VOLUME LIMITS</h2>
                                <p className="text-sm text-slate-500 mt-1">Configure limits and availability for specific dates.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="text-left py-4 px-4 font-bold text-slate-700">Date</th>
                                            <th className="text-left py-4 px-4 font-bold text-slate-700">Status</th>
                                            <th className="text-left py-4 px-4 font-bold text-slate-700">Volume Limit</th>
                                            <th className="text-left py-4 px-4 font-bold text-slate-700">Current Bookings</th>
                                            <th className="text-left py-4 px-4 font-bold text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getAllDatesWithRestrictions().length > 0 ? (
                                            getAllDatesWithRestrictions().map((date) => {
                                                // FIXED: count from ALL appointments so the date-range
                                                // filter can't make this number wrong
                                                const bookingsOnDate = allAppointments.filter(a => a.date === date).length;
                                                const isUnavailable = unavailableDates.includes(date);
                                                const limit = dateVolumeLimits[date];
                                                const isAutoDisabled = limit && bookingsOnDate >= limit && isUnavailable; // Only show auto-disabled if it's also marked unavailable

                                                return (
                                                    <tr key={date} className={`border-b border-slate-200 hover:bg-slate-50 ${isAutoDisabled ? 'bg-red-50' : ''}`}>
                                                        <td className="py-3 px-4 font-semibold text-slate-800">{date}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                isUnavailable
                                                                    ? "bg-red-100 text-red-700"
                                                                    : limit
                                                                        ? "bg-yellow-100 text-yellow-700"
                                                                        : "bg-green-100 text-green-700"
                                                            }`}>
                                                                {isUnavailable
                                                                    ? (isAutoDisabled ? "Auto-Disabled (Full)" : "Unavailable")
                                                                    : limit
                                                                        ? "Limited"
                                                                        : "Available"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-700">{limit || "No limit"}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`font-bold ${
                                                                limit && bookingsOnDate >= limit ? "text-red-600" : "text-slate-700"
                                                            }`}>
                                                                {bookingsOnDate}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 space-x-2">
                                                            <button
                                                                onClick={() => toggleDateAvailability(date)}
                                                                disabled={isAutoDisabled} // Disable if auto-disabled by full capacity
                                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                                                                    isAutoDisabled
                                                                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                                                        : isUnavailable
                                                                            ? "bg-green-500 hover:bg-green-600 text-white"
                                                                            : "bg-red-500 hover:bg-red-600 text-white"
                                                                }`}
                                                            >
                                                                {isUnavailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                {isUnavailable ? "Enable" : "Disable"}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedDate(date);
                                                                    setVolumeLimit(limit ? limit.toString() : "");
                                                                    setMakeUnavailable(isUnavailable);
                                                                    setShowVolumeModal(true);
                                                                }}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1"
                                                            >
                                                                <CalendarDays className="w-3 h-3" />
                                                                {limit ? "Edit" : "Set Limit"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-slate-500 font-semibold">
                                                    No restrictions set. Click on a date in the calendar to add one.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ===================== */}
                {/* APPOINTMENTS TAB        */}
                {/* ===================== */}
                {activeTab === "appointments" && (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <StatCard
                                icon={Clock}
                                label="Pending Approval"
                                count={appointmentStats.pending}
                                color="bg-yellow-50 border-yellow-200 text-yellow-700"
                            />
                            <StatCard
                                icon={CheckCircle}
                                label="Approved"
                                count={appointmentStats.approved}
                                color="bg-green-50 border-green-200 text-green-700"
                            />
                            <StatCard
                                icon={XCircle}
                                label="Rejected"
                                count={appointmentStats.rejected}
                                color="bg-red-50 border-red-200 text-red-700"
                            />
                            <StatCard
                                icon={CalendarDays}
                                label="Total Appointments"
                                count={appointmentStats.total}
                                color="bg-blue-50 border-blue-200 text-blue-700"
                            />
                        </div>

                        {/* Status Pie Chart */}
                        {statusChartData.some(item => item.value > 0) && (
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-4">APPOINTMENT STATUS OVERVIEW</h2>
                                <div className="w-full h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusChartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, value }) => `${name}: ${value}`}
                                                outerRadius={100}
                                                dataKey="value"
                                            >
                                                {statusChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Filters and Search */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, purpose, or user ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>

                                {/* Filter Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    {["all", "pending", "approved", "rejected"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setAppointmentFilter(status)}
                                            className={`px-4 py-2 rounded-xl font-bold transition ${
                                                appointmentFilter === status
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Appointments Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">User ID</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Purpose</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Date & Time</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Reason</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAppointments.length > 0 ? (
                                            filteredAppointments.map((apt) => (
                                                <tr
                                                    key={apt.id || apt.appointmentId}
                                                    className="border-b border-slate-200 hover:bg-slate-50 transition"
                                                >
                                                    {/* USER ID CELL — shows user_id_from_auth (auth UUID) */}
                                                    <td className="px-4 py-4">
                                                        <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]">
                                                            {apt.user_id}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-semibold text-slate-800">{apt.fullName}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-semibold text-slate-800">{apt.purpose}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-slate-800">{apt.date}</p>
                                                            <p className="text-slate-600">{apt.time}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="text-sm text-slate-600 max-w-xs truncate">
                                                            {apt.reason || "N/A"}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                apt.status === "pending"
                                                                    ? "bg-yellow-100 text-yellow-700"
                                                                    : apt.status === "approved"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-red-100 text-red-700"
                                                            }`}
                                                        >
                                                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-2">
                                                            {apt.status === "pending" ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateAppointmentStatus(apt.appointmentId, "approved")}
                                                                        className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateAppointmentStatus(apt.appointmentId, "rejected")}
                                                                        className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => updateAppointmentStatus(apt.appointmentId, "pending")}
                                                                    className="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                                                                >
                                                                    Reset to Pending
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center">
                                                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                                    <p className="text-slate-600 font-semibold">No appointments found matching your criteria.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Info */}
                        <div className="mt-4 text-sm text-slate-500 text-center">
                            Showing {filteredAppointments.length} of {allAppointments.length} total appointments
                        </div>
                    </>
                )}

                {/* ===================== */}
                {/* HISTORY TAB             */}
                {/* ===================== */}
                {activeTab === "history" && (
                    <>
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <History className="w-6 h-6 text-purple-600" />
                                Appointment History
                            </h2>
                            <p className="text-slate-500 mb-6">
                                View all approved and declined appointments.
                            </p>

                            {/* Search & Filter */}
                            <div className="flex flex-col md:flex-row gap-3 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search history by name, purpose, or user ID..."
                                        value={historySearchTerm}
                                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {["all", "approved", "rejected"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setHistoryFilter(status)}
                                            className={`px-4 py-2 rounded-xl font-bold transition ${
                                                historyFilter === status
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                <div className="p-4 rounded-xl border border-green-200 bg-green-50 shadow-sm">
                                    <p className="text-xs font-bold opacity-70 text-green-700">Approved</p>
                                    <p className="text-2xl font-bold text-green-800 mt-1">{appointmentStats.approved}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-red-200 bg-red-50 shadow-sm">
                                    <p className="text-xs font-bold opacity-70 text-red-700">Rejected</p>
                                    <p className="text-2xl font-bold text-red-800 mt-1">{appointmentStats.rejected}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                                    <p className="text-xs font-bold opacity-70 text-slate-700">Total Processed</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">
                                        {appointmentStats.approved + appointmentStats.rejected}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">User ID</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Purpose</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Date & Time</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Reason</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getHistoryAppointments().length > 0 ? (
                                            getHistoryAppointments().map((apt, index) => (
                                                <tr
                                                    key={apt.id || apt.appointmentId}
                                                    className="border-b border-slate-200 hover:bg-slate-50 transition"
                                                >
                                                    <td className="px-4 py-4 text-sm text-slate-500 font-mono">
                                                        {index + 1}
                                                    </td>
                                                    {/* USER ID CELL — shows user_id_from_auth (auth UUID) */}
                                                    <td className="px-4 py-4">
                                                        <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]">
                                                            {apt.user_id}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-semibold text-slate-800">{apt.fullName}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="text-slate-800">{apt.purpose}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-slate-800">{apt.date}</p>
                                                            <p className="text-slate-600">{apt.time}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="text-sm text-slate-600 max-w-xs truncate">
                                                            {apt.reason || "N/A"}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                apt.status === "approved"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-red-100 text-red-700"
                                                            }`}
                                                        >
                                                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="text-sm text-slate-600">
                                                            {apt.created_at
                                                                ? new Date(apt.created_at).toLocaleDateString("en-US", {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })
                                                                : "N/A"}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center">
                                                    <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                                    <p className="text-slate-600 font-semibold">
                                                        No approved or rejected appointments yet.
                                                    </p>
                                                    <p className="text-slate-500 text-sm mt-1">
                                                        Process pending appointments to see them here.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Info */}
                        <div className="mt-4 text-sm text-slate-500 text-center">
                            Showing {getHistoryAppointments().length} processed appointment(s)
                        </div>
                    </>
                )}

                {/* Volume Limit Modal */}
                {showVolumeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">
                                Set Volume Limit for <span className="text-purple-600">{selectedDate}</span>
                            </h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Configure the maximum number of appointments allowed for this date.
                            </p>
                            <input
                                type="number"
                                min="1"
                                value={volumeLimit}
                                onChange={(e) => setVolumeLimit(e.target.value)}
                                placeholder="Enter maximum appointments"
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="space-y-2 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={makeUnavailable}
                                        onChange={(e) => setMakeUnavailable(e.target.checked)}
                                        className="w-4 h-4 cursor-pointer text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">
                                        Manually make this date unavailable
                                    </span>
                                </label>
                                <p className="text-xs text-slate-500 ml-6">
                                    Dates are automatically disabled when bookings reach the volume limit.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowVolumeModal(false);
                                        setMakeUnavailable(false);
                                    }}
                                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={setVolumeLimitForDate}
                                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Summary Report Modal */}
{showReportModal && (
    <AdminAppointmentsSummaryReportModal
        reportData={allAppointments}
        dateRange={{ startDate, endDate }}
        unavailableDates={unavailableDates}
        dateVolumeLimits={dateVolumeLimits}
        onClose={() => setShowReportModal(false)}
        onPrint={() => window.print()}
    />
)}
            </div>
        </div>
    );
};

export default AdminDashboard;
// =============================================
// APPOINTMENTS SUMMARY-ONLY REPORT
// Adjustable coverage dates via toolbar.
// =============================================
const AdminAppointmentsSummaryReportModal = ({
    reportData, dateRange, unavailableDates, dateVolumeLimits, onClose, onPrint,
}) => {
    // ---- Adjustable coverage dates (initialized from the dashboard range) ----
    const [fromDate, setFromDate] = useState(dateRange?.startDate || "");
    const [toDate, setToDate] = useState(dateRange?.endDate || "");

    const todayKey = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    })();

    const applyPreset = (from, to) => { setFromDate(from); setToDate(to); };

    // ---- Timezone-safe helpers (same approach as parent) ----
    const toKey = (dateStr) => (dateStr ? String(dateStr).split("T")[0] : "");
    const monthIdx = (dateStr) => {
        const m = Number(toKey(dateStr).split("-")[1]);
        return m >= 1 && m <= 12 ? m - 1 : -1;
    };

    // ---- Filtered data (respects the adjustable coverage dates) ----
    const filtered = useMemo(() => {
        return (reportData || []).filter((apt) => {
            const key = toKey(apt.date);
            if (fromDate && key < fromDate) return false;
            if (toDate && key > toDate) return false;
            return true;
        });
    }, [reportData, fromDate, toDate]);

    const data = filtered;

    const pct = (count) => (data.length ? Math.round((count / data.length) * 100) : 0);

    // ---- Status counts (from filtered data) ----
    const statusCounts = { pending: 0, approved: 0, rejected: 0, other: 0 };
    data.forEach((apt) => {
        const s = (apt.status || "pending").toLowerCase();
        if (statusCounts[s] !== undefined) statusCounts[s] += 1;
        else statusCounts.other += 1;
    });
    const approvalRate =
        statusCounts.approved + statusCounts.rejected > 0
            ? Math.round((statusCounts.approved / (statusCounts.approved + statusCounts.rejected)) * 100)
            : 0;

    // ---- Monthly totals (Jan–Dec, from filtered data) ----
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTotals = MONTHS.map((name) => ({ name, count: 0 }));
    data.forEach((apt) => {
        const i = monthIdx(apt.date);
        if (i >= 0) monthlyTotals[i].count += 1;
    });
    const activeMonths = monthlyTotals.filter((m) => m.count > 0);
    const peakMonth = activeMonths.length
        ? activeMonths.reduce((a, b) => (b.count > a.count ? b : a))
        : null;

    // ---- Purpose breakdown (from filtered data) ----
    const purposeCounts = {};
    data.forEach((apt) => {
        const p = apt.purpose || "Unspecified";
        purposeCounts[p] = (purposeCounts[p] || 0) + 1;
    });
    const purposeData = Object.entries(purposeCounts)
        .map(([purpose, count]) => ({ purpose, count }))
        .sort((a, b) => b.count - a.count);
    const topPurpose = purposeData[0] || null;

    // ---- Chart data ----
    const statusPieData = [
        { name: "Pending", value: statusCounts.pending, fill: "#FBBF24" },
        { name: "Approved", value: statusCounts.approved, fill: "#34D399" },
        { name: "Rejected", value: statusCounts.rejected, fill: "#F87171" },
    ].filter((d) => d.value > 0);

    // ---- Date restrictions summary (from props, unaffected by coverage) ----
    const unavailable = unavailableDates || [];
    const limits = dateVolumeLimits || {};
    const limitedDates = Object.entries(limits)
        .map(([date, limit]) => ({ date, limit, isUnavailable: unavailable.includes(date) }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Labels ----
    const generatedAt = new Date().toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const rangeLabel =
        fromDate || toDate
            ? `${fromDate || "Start"} → ${toDate || "End"}`
            : "All dates";

    const Card = ({ label, value, sub, color }) => (
        <div className={`p-4 rounded-xl border ${color}`}>
            <p className="text-xs font-bold opacity-70">{label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
    );

    return (
        <>
            {/* Print CSS: only the report is visible in the PDF */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .summary-report-print, .summary-report-print * { visibility: visible; }
                    .summary-report-print { position: absolute; top: 0; left: 0; width: 100%; }
                    .summary-report-print .print-hidden { display: none !important; }
                    .summary-report-print .print-break-avoid { break-inside: avoid; }
                }
            `}</style>

            <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                <div className="summary-report-print bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8">
                    {/* Toolbar — screen only, excluded from PDF */}
                    <div className="print-hidden flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                        <h3 className="font-bold text-slate-800">Appointments Summary Report</h3>

                        {/* Adjustable dates */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-slate-400 text-sm">→</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {/* Presets */}
                            <button
                                onClick={() => applyPreset("", "")}
                                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                            >
                                All Time
                            </button>
                            <button
                                onClick={() => applyPreset(`${todayKey.slice(0, 8)}01`, todayKey)}
                                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => applyPreset(todayKey, todayKey)}
                                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                            >
                                Today
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onPrint}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm"
                            >
                                <Download className="w-4 h-4" /> Print / Save PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-sm hover:bg-slate-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="p-8 text-slate-800">
                        {/* Header */}
                        <div className="text-center border-b border-slate-200 pb-6 mb-8">
                            <h1 className="text-2xl font-black text-slate-900">APPOINTMENTS SUMMARY REPORT</h1>
                            <p className="text-sm text-slate-500 mt-2">Generated: {generatedAt}</p>
                            <p className="text-xs text-slate-400 mt-1">Coverage: {rangeLabel}</p>
                            <p className="text-xs text-slate-400 mt-1">Appointments in coverage: {data.length}</p>
                        </div>

                        {/* Highlights */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 print-break-avoid">
                            <Card label="Total Appointments" value={data.length} sub="In coverage" color="bg-blue-50 border-blue-200 text-blue-700" />
                            <Card label="Approval Rate" value={`${approvalRate}%`} sub="Of processed" color="bg-emerald-50 border-emerald-200 text-emerald-700" />
                            <Card
                                label="Peak Month"
                                value={peakMonth ? peakMonth.name : "—"}
                                sub={peakMonth ? `${peakMonth.count} appointments` : "No data"}
                                color="bg-violet-50 border-violet-200 text-violet-700"
                            />
                            <Card
                                label="Top Purpose"
                                value={topPurpose ? topPurpose.purpose : "—"}
                                sub={topPurpose ? `${topPurpose.count} bookings` : "No data"}
                                color="bg-rose-50 border-rose-200 text-rose-700"
                            />
                        </div>

                        {/* Status overview */}
                        <div className="mb-8 print-break-avoid">
                            <h2 className="font-bold text-slate-800 mb-3">Status Overview</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Card label="Pending" value={statusCounts.pending} sub={`${pct(statusCounts.pending)}% of total`} color="bg-yellow-50 border-yellow-200 text-yellow-700" />
                                <Card label="Approved" value={statusCounts.approved} sub={`${pct(statusCounts.approved)}% of total`} color="bg-green-50 border-green-200 text-green-700" />
                                <Card label="Rejected" value={statusCounts.rejected} sub={`${pct(statusCounts.rejected)}% of total`} color="bg-red-50 border-red-200 text-red-700" />
                                <Card label="Other / Reset" value={statusCounts.other} sub={`${pct(statusCounts.other)}% of total`} color="bg-slate-50 border-slate-200 text-slate-700" />
                            </div>
                        </div>
                       

                        {/* Footer */}
                        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                            <p>This report is system-generated and reflects data at the time of generation.</p>
                            <p className="mt-1">© 2023 Your Organization Name</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};