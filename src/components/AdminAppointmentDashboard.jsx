"use client";

import React, { useEffect, useMemo, useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from "../createClient";
import { useDialog } from "../components/AppDialog";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from "recharts";
import {
    Check, X, Clock, CheckCircle, XCircle, Search, AlertCircle, History,
    CalendarDays, Download, Loader2, User, Phone, Hash, FileText
} from "lucide-react";


function DetailRow({ icon: Icon, label, value, full = false }) {
    const displayValue =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);

    return (
        <div className={`flex items-start gap-3 ${full ? "sm:col-span-2" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <Icon className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {label}
                </p>
                <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">
                    {displayValue}
                </p>
            </div>
        </div>
    );
}

const AdminDashboard = () => {
    // ─────────────────────────────────────────────────────────────
    // Shared State
    // ─────────────────────────────────────────────────────────────
    const [appointments, setAppointments] = useState([]);
    const {showAlert, showConfirm} = useDialog();
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

    // ─────────────────────────────────────────────────────────────
    // NEW: Decline Reason Modal State
    // ─────────────────────────────────────────────────────────────
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [declineAppointment, setDeclineAppointment] = useState(null);
    const [declineReason, setDeclineReason] = useState("");
    const [declineError, setDeclineError] = useState("");
    const [declineSaving, setDeclineSaving] = useState(false);

    // Review details before approve / decline
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

    // ─────────────────────────────────────────────────────────────
    // Timezone-safe helpers
    // ─────────────────────────────────────────────────────────────
    const toDateString = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const getMonthIndex = (dateStr) => {
        if (!dateStr) return -1;
        const m = Number(dateStr.split("T")[0].split("-")[1]);
        return m >= 1 && m <= 12 ? m - 1 : -1;
    };

    // ─────────────────────────────────────────────────────────────
    // Notification helper
    // ─────────────────────────────────────────────────────────────
    const createNotification = async (userId, title, message, type, relatedId) => {
        if (!userId) return;
        try {
            const { error } = await supabase.from("notifications").insert({
                user_id: userId,
                title,
                message,
                type,
                related_id: relatedId,
            });
            if (error) console.error("Notification insert error:", error);
        } catch (err) {
            console.error("Failed to create notification:", err);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Auto-mark date unavailable when volume limit is reached
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // Fetch all data
    // ─────────────────────────────────────────────────────────────
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
                if (restriction.is_unavailable) unavailable.push(restriction.date);
                if (restriction.volume_limit) limits[restriction.date] = restriction.volume_limit;
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

            // Load all appointments directly
            const { data: allApts, error: allAptsError } = await supabase
                .from("appointments")
                .select("*")
                .order("created_at", { ascending: false });

            if (allAptsError) throw allAptsError;

            // Normalize appointments
            const processedApts = (allApts || []).map(apt => ({
                ...apt,
                id: apt.appointmentId || apt.id,
                appointmentId: apt.appointmentId || apt.id,
                status: apt.status || "pending",
                // Use Supabase Auth UUID as the primary user identifier
                user_id: apt.user_id_from_auth || "N/A",
            }));

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

    // ─────────────────────────────────────────────────────────────
    // Filter appointments for the main Appointments tab
    // ─────────────────────────────────────────────────────────────
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    // ─────────────────────────────────────────────────────────────
    // Toggle date availability
    // ─────────────────────────────────────────────────────────────
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
            await showAlert("Failed to update date availability");
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Set volume limit for a date
    // ─────────────────────────────────────────────────────────────
    const setVolumeLimitForDate = async () => {
        if (!selectedDate || !volumeLimit) {
            await showAlert("Please select a date and enter a volume limit");
            return;
        }

        try {
            const limit = parseInt(volumeLimit);
            if (limit < 1) {
                await showAlert("Volume limit must be at least 1");
                return;
            }

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
                await showAlert(`Volume limit for ${selectedDate} set to ${limit}. Date has been auto-marked as unavailable because ${currentBookingCount} appointments already exist.`);
            } else {
                await showAlert(`Volume limit for ${selectedDate} set to ${limit}`);
            }
        } catch (error) {
            console.error("Error setting volume limit:", error);
            await showAlert("Failed to set volume limit");
        }
    };

    const handleCalendarDateClick = (date) => {
        const dateString = toDateString(date);
        setSelectedDate(dateString);
        setVolumeLimit(dateVolumeLimits[dateString] ? dateVolumeLimits[dateString].toString() : "");
        setMakeUnavailable(unavailableDates.includes(dateString));
        setShowVolumeModal(true);
    };

    // ─────────────────────────────────────────────────────────────
    // Approve handler (direct)
    // ─────────────────────────────────────────────────────────────
    const handleApprove = async (appointmentId) => {
        await updateAppointmentStatus(appointmentId, "approved");
    };

    // ─────────────────────────────────────────────────────────────
    // Open / close the decline modal
    // ─────────────────────────────────────────────────────────────
    const openDeclineModal = (apt) => {
        setDeclineAppointment(apt);
        setDeclineReason("");
        setDeclineError("");
        setShowDeclineModal(true);
    };

    const closeDeclineModal = () => {
        if (declineSaving) return;
        setShowDeclineModal(false);
        setDeclineAppointment(null);
        setDeclineReason("");
        setDeclineError("");
    };

    // ─────────────────────────────────────────────────────────────
    // Submit decline with reason
    // ─────────────────────────────────────────────────────────────
    const submitDecline = async () => {
        if (!declineAppointment) return;

        const trimmed = declineReason.trim();
        if (trimmed.length < 5) {
            setDeclineError("Please provide a reason (at least 5 characters).");
            return;
        }

        setDeclineSaving(true);
        setDeclineError("");

        await updateAppointmentStatus(
            declineAppointment.appointmentId,
            "rejected",
            trimmed
        );

        setDeclineSaving(false);
        setShowDeclineModal(false);
        setDeclineAppointment(null);
        setDeclineReason("");
    };

    // ─────────────────────────────────────────────────────────────
    // Update appointment status (with decline reason support)
    // ─────────────────────────────────────────────────────────────
    const updateAppointmentStatus = async (appointmentId, newStatus, reason = null) => {
        try {
            const updatePayload = {
                status: newStatus,
                updated_at: new Date().toISOString(),
            };

            // Only persist a reason when rejecting; clear it otherwise.
            if (newStatus === "rejected") {
                updatePayload.decline_reason = reason || null;
            } else {
                updatePayload.decline_reason = null;
            }

            const { data: updatedRow, error } = await supabase
                .from("appointments")
                .update(updatePayload)
                .eq("appointmentId", appointmentId)
                .select("*, user_id_from_auth, userId, fullName, purpose, date, time, decline_reason")
                .single();

            if (error) {
                if (error.message?.includes("decline_reason")) {
                    await showAlert(
                        "The 'decline_reason' column is missing.\n\n" +
                        "Run this in Supabase SQL Editor:\n" +
                        "ALTER TABLE public.appointments ADD COLUMN decline_reason text null;"
                    );
                } else if (error.message?.includes("status")) {
                    await showAlert("The 'status' column is missing in the appointments table.");
                } else if (error.message?.includes("updated_at")) {
                    await showAlert("The 'updated_at' column is missing in the appointments table.");
                } else {
                    throw error;
                }
                return;
            }

            // Send notification to the user
            const targetAuthUserId = updatedRow?.user_id_from_auth || null;

            if (targetAuthUserId) {
                if (newStatus === "approved") {
                    await createNotification(
                        targetAuthUserId,
                        "Appointment Approved",
                        `Your appointment for "${updatedRow.purpose || "appointment"}" on ${updatedRow.date || ""} at ${updatedRow.time || ""} has been approved.`,
                        "success",
                        appointmentId
                    );
                } else if (newStatus === "rejected") {
                    await createNotification(
                        targetAuthUserId,
                        "Appointment Declined",
                        `Your appointment for "${updatedRow.purpose || "appointment"}" on ${updatedRow.date || ""} at ${updatedRow.time || ""} has been declined.\n\nReason: ${reason || "No reason provided."}`,
                        "error",
                        appointmentId
                    );
                } else if (newStatus === "pending") {
                    await createNotification(
                        targetAuthUserId,
                        "Appointment Reset",
                        `Your appointment for "${updatedRow.purpose || "appointment"}" on ${updatedRow.date || ""} at ${updatedRow.time || ""} has been reset to pending.`,
                        "info",
                        appointmentId
                    );
                }
            }

            // If approving, check the date's volume limit
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
            await showAlert("Failed to update appointment: " + err.message);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Chart Data Processing
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // Monthly Appointment Trends
    // ─────────────────────────────────────────────────────────────
    const monthlyTrendData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const uniquePurposes = [...new Set(appointments.map(a => a.purpose).filter(Boolean))];

        const formattedData = months.map(month => {
            const entry = { name: month };
            uniquePurposes.forEach(p => { entry[p] = 0; });
            return entry;
        });

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

    // ─────────────────────────────────────────────────────────────
    // Small reusable components
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // Date restriction helpers
    // ─────────────────────────────────────────────────────────────
    const getAllDatesWithRestrictions = () => {
        const allDates = new Set([
            ...Object.keys(dateVolumeLimits),
            ...unavailableDates,
            ...appointments.map(a => a.date)
        ]);
        return Array.from(allDates).sort();
    };

    // ─────────────────────────────────────────────────────────────
    // History helper
    // ─────────────────────────────────────────────────────────────
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

    const selectedAppointment = useMemo(() => {
        if (selectedAppointmentId == null) return null;
        return (
            allAppointments.find(
                (apt) =>
                    String(apt.appointmentId) === String(selectedAppointmentId) ||
                    String(apt.id) === String(selectedAppointmentId)
            ) || null
        );
    }, [allAppointments, selectedAppointmentId]);

    // ─────────────────────────────────────────────────────────────
    // Loading
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // Main render
    // ─────────────────────────────────────────────────────────────
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
                                        const d = toDateString(date);
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
                                    className="react-calendar-custom"
                                />
                                <div className="mt-6 text-xs font-bold text-slate-600 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>Unavailable (auto when full)</div>
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-yellow-200 rounded-full mr-2 border border-slate-300"></span>Limited Volume</div>
                                    <div className="flex items-center"><span className="inline-block w-4 h-4 bg-green-100 rounded-full mr-2 border border-slate-300"></span>Available</div>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Trends */}
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
                                                const bookingsOnDate = allAppointments.filter(a => a.date === date).length;
                                                const isUnavailable = unavailableDates.includes(date);
                                                const limit = dateVolumeLimits[date];
                                                const isAutoDisabled = limit && bookingsOnDate >= limit && isUnavailable;

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
                                                                disabled={isAutoDisabled}
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
                {/* APPOINTMENTS TAB */}
                {/* ===================== */}
                {activeTab === "appointments" && (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <StatCard icon={Clock} label="Pending Approval" count={appointmentStats.pending} color="bg-yellow-50 border-yellow-200 text-yellow-700" />
                            <StatCard icon={CheckCircle} label="Approved" count={appointmentStats.approved} color="bg-green-50 border-green-200 text-green-700" />
                            <StatCard icon={XCircle} label="Rejected" count={appointmentStats.rejected} color="bg-red-50 border-red-200 text-red-700" />
                            <StatCard icon={CalendarDays} label="Total Appointments" count={appointmentStats.total} color="bg-blue-50 border-blue-200 text-blue-700" />
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
                                                                        onClick={() => setSelectedAppointmentId(apt.appointmentId || apt.id)}
                                                                        className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedAppointmentId(apt.appointmentId || apt.id)}
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

                        <div className="mt-4 text-sm text-slate-500 text-center">
                            Showing {filteredAppointments.length} of {allAppointments.length} total appointments
                        </div>
                    </>
                )}

                {/* ===================== */}
                {/* HISTORY TAB */}
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
                                                        <div className="text-sm text-slate-600 max-w-xs">
                                                            {apt.reason ? (
                                                                <p className="truncate" title={apt.reason}>
                                                                    <span className="font-semibold text-slate-700">Request: </span>
                                                                    {apt.reason}
                                                                </p>
                                                            ) : (
                                                                <p className="italic text-slate-400">No notes</p>
                                                            )}

                                                            {apt.status === "rejected" && apt.decline_reason && (
                                                                <p
                                                                    className="mt-1 truncate text-xs font-semibold text-red-700"
                                                                    title={apt.decline_reason}
                                                                >
                                                                    <span className="font-bold">Declined: </span>
                                                                    {apt.decline_reason}
                                                                </p>
                                                            )}
                                                        </div>
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

                        <div className="mt-4 text-sm text-slate-500 text-center">
                            Showing {getHistoryAppointments().length} processed appointment(s)
                        </div>
                    </>
                )}

                {/* ============================================================= */}
                {/* VOLUME LIMIT MODAL                                            */}
                {/* ============================================================= */}
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

                {/* ============================================================= */}
                {/* REVIEW APPOINTMENT DETAILS (before approve / decline)         */}
                {/* ============================================================= */}
                {selectedAppointment && (
                    <div
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
                        onClick={() => {
                            if (!declineSaving) setSelectedAppointmentId(null);
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="appointment-review-title"
                            className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                        <CalendarDays className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2
                                            id="appointment-review-title"
                                            className="text-lg font-black text-slate-800"
                                        >
                                            Review Appointment Request
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            #{selectedAppointment.appointmentId || selectedAppointment.id} ·{" "}
                                            {selectedAppointment.fullName || "Unknown"}
                                        </p>
                                        <div className="mt-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                    selectedAppointment.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : selectedAppointment.status === "approved"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {(selectedAppointment.status || "pending").charAt(0).toUpperCase() +
                                                    (selectedAppointment.status || "pending").slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedAppointmentId(null)}
                                    disabled={declineSaving}
                                    aria-label="Close details"
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-5 px-6 py-5">
                                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                        {(selectedAppointment.fullName?.charAt(0) || "?").toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800">
                                            {selectedAppointment.fullName || "Unknown"}
                                        </p>
                                        <p className="mt-1 font-mono text-xs text-slate-500">
                                            User ID: {selectedAppointment.user_id || selectedAppointment.userId || "—"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <DetailRow
                                        icon={Hash}
                                        label="Appointment ID"
                                        value={`#${selectedAppointment.appointmentId || selectedAppointment.id}`}
                                    />
                                    <DetailRow
                                        icon={User}
                                        label="Full Name"
                                        value={selectedAppointment.fullName}
                                    />
                                    <DetailRow
                                        icon={FileText}
                                        label="Purpose"
                                        value={selectedAppointment.purpose}
                                    />
                                    <DetailRow
                                        icon={Calendar}
                                        label="Date"
                                        value={selectedAppointment.date}
                                    />
                                    <DetailRow
                                        icon={Clock}
                                        label="Time"
                                        value={selectedAppointment.time}
                                    />
                                    <DetailRow
                                        icon={Phone}
                                        label="Contact"
                                        value={
                                            selectedAppointment.contact ||
                                            selectedAppointment.contactNumber ||
                                            selectedAppointment.mobile_number
                                        }
                                    />
                                    <DetailRow
                                        icon={FileText}
                                        label="Reason / Notes"
                                        value={selectedAppointment.reason || selectedAppointment.notes}
                                        full
                                    />
                                    {selectedAppointment.decline_reason && (
                                        <DetailRow
                                            icon={AlertCircle}
                                            label="Decline Reason"
                                            value={selectedAppointment.decline_reason}
                                            full
                                        />
                                    )}
                                    <DetailRow
                                        icon={CalendarDays}
                                        label="Submitted"
                                        value={
                                            selectedAppointment.created_at
                                                ? new Date(selectedAppointment.created_at).toLocaleString()
                                                : "—"
                                        }
                                    />
                                    <DetailRow
                                        icon={Clock}
                                        label="Last Updated"
                                        value={
                                            selectedAppointment.updated_at
                                                ? new Date(selectedAppointment.updated_at).toLocaleString()
                                                : "—"
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedAppointmentId(null)}
                                    disabled={declineSaving}
                                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                                >
                                    Close
                                </button>

                                {selectedAppointment.status === "pending" && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => openDeclineModal(selectedAppointment)}
                                            disabled={declineSaving}
                                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleApprove(
                                                    selectedAppointment.appointmentId ||
                                                        selectedAppointment.id
                                                )
                                            }
                                            disabled={declineSaving}
                                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Approve
                                        </button>
                                    </>
                                )}

                                {selectedAppointment.status !== "pending" && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateAppointmentStatus(
                                                selectedAppointment.appointmentId ||
                                                    selectedAppointment.id,
                                                "pending"
                                            )
                                        }
                                        className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                                    >
                                        Reset to Pending
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================= */}
                {/* DECLINE REASON MODAL                                          */}
                {/* ============================================================= */}
                {showDeclineModal && declineAppointment && (
                    <div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
                        onClick={closeDeclineModal}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="decline-modal-title"
                            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                        <XCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3
                                            id="decline-modal-title"
                                            className="font-bold text-slate-800"
                                        >
                                            Decline Appointment
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {declineAppointment.fullName || "Resident"} ·{" "}
                                            {declineAppointment.purpose || "Appointment"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDeclineModal}
                                    disabled={declineSaving}
                                    aria-label="Close decline dialog"
                                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4">
                                {/* Mini request summary */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                    <p>
                                        <span className="font-bold text-slate-700">Name:</span>{" "}
                                        {declineAppointment.fullName || "—"}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-bold text-slate-700">Purpose:</span>{" "}
                                        {declineAppointment.purpose || "—"}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-bold text-slate-700">Schedule:</span>{" "}
                                        {declineAppointment.date || "—"}
                                        {declineAppointment.time
                                            ? ` · ${declineAppointment.time}`
                                            : ""}
                                    </p>
                                </div>

                                {/* Warning banner */}
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                    <p className="font-bold text-red-800 text-sm">
                                        The requester will see this reason
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-red-700">
                                        The reason you enter below is shown to the resident in
                                        their notification and on their appointment tracking
                                        page.
                                    </p>
                                </div>

                                {/* Inline error */}
                                {declineError && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                    >
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p>{declineError}</p>
                                    </div>
                                )}

                                {/* Reason input */}
                                <div>
                                    <label
                                        htmlFor="decline-reason"
                                        className="block text-sm font-bold text-slate-700 mb-1"
                                    >
                                        Reason for declining
                                        <span className="ml-1 text-xs font-normal text-slate-400">
                                            (required, at least 5 characters)
                                        </span>
                                    </label>
                                    <textarea
                                        id="decline-reason"
                                        rows={4}
                                        maxLength={500}
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="e.g. The requested date is fully booked. Please choose another available date from the calendar."
                                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-y text-sm"
                                        autoFocus
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        {declineReason.length}/500 characters.
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeDeclineModal}
                                        disabled={declineSaving}
                                        className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitDecline}
                                        disabled={declineSaving || declineReason.trim().length < 5}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-bold transition"
                                    >
                                        {declineSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Declining...
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4" />
                                                Decline Appointment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================= */}
                {/* SUMMARY REPORT MODAL                                          */}
                {/* ============================================================= */}
                {showReportModal && (
                    <AdminAppointmentsSummaryReportModal
                        reportData={allAppointments}
                        dateRange={{ startDate, endDate }}
                        unavailableDates={unavailableDates}
                        dateVolumeLimits={dateVolumeLimits}
                        onClose={() => setShowReportModal(false)}
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
    reportData,
    dateRange,
    unavailableDates,
    dateVolumeLimits,
    onClose,
}) => {
    const [fromDate, setFromDate] = useState(dateRange?.startDate || "");
    const [toDate, setToDate] = useState(dateRange?.endDate || "");

    const todayKey = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    })();

    const applyPreset = (from, to) => {
        setFromDate(from);
        setToDate(to);
    };

    const toKey = (dateStr) => (dateStr ? String(dateStr).split("T")[0] : "");
    const monthIdx = (dateStr) => {
        const m = Number(toKey(dateStr).split("-")[1]);
        return m >= 1 && m <= 12 ? m - 1 : -1;
    };

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

    const statusCounts = { pending: 0, approved: 0, rejected: 0, other: 0 };
    data.forEach((apt) => {
        const s = (apt.status || "pending").toLowerCase();
        if (statusCounts[s] !== undefined) statusCounts[s] += 1;
        else statusCounts.other += 1;
    });
    const approvalRate =
        statusCounts.approved + statusCounts.rejected > 0
            ? Math.round(
                  (statusCounts.approved /
                      (statusCounts.approved + statusCounts.rejected)) *
                      100,
              )
            : 0;

    const MONTHS = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const monthlyTotals = MONTHS.map((name) => ({ name, count: 0 }));
    data.forEach((apt) => {
        const i = monthIdx(apt.date);
        if (i >= 0) monthlyTotals[i].count += 1;
    });
    const activeMonths = monthlyTotals.filter((m) => m.count > 0);
    const peakMonth = activeMonths.length
        ? activeMonths.reduce((a, b) => (b.count > a.count ? b : a))
        : null;

    const purposeCounts = {};
    data.forEach((apt) => {
        const p = apt.purpose || "Unspecified";
        purposeCounts[p] = (purposeCounts[p] || 0) + 1;
    });
    const purposeData = Object.entries(purposeCounts)
        .map(([purpose, count]) => ({ purpose, count }))
        .sort((a, b) => b.count - a.count);
    const topPurpose = purposeData[0] || null;

    const unavailable = unavailableDates || [];
    const limits = dateVolumeLimits || {};
    const limitedDates = Object.entries(limits)
        .map(([date, limit]) => ({
            date,
            limit,
            isUnavailable: unavailable.includes(date),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const generatedAt = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const rangeLabel =
        fromDate || toDate
            ? `${fromDate || "Start"} → ${toDate || "End"}`
            : "All dates";

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const handlePrint = () => {
        const card = (label, value, sub) => `
      <div class="card">
        <div class="card-label">${escapeHtml(label)}</div>
        <div class="card-value">${escapeHtml(value)}</div>
        ${sub ? `<div class="card-sub">${escapeHtml(sub)}</div>` : ""}
      </div>`;

        const topCards = `
      ${card("Total Appointments", data.length, "In coverage")}
      ${card("Approval Rate", `${approvalRate}%`, "Of processed")}
      ${card(
          "Peak Month",
          peakMonth ? peakMonth.name : "—",
          peakMonth ? `${peakMonth.count} appointments` : "No data",
      )}
      ${card(
          "Top Purpose",
          topPurpose ? topPurpose.purpose : "—",
          topPurpose ? `${topPurpose.count} bookings` : "No data",
      )}
    `;

        const statusCards = `
      ${card("Pending", statusCounts.pending, `${pct(statusCounts.pending)}% of total`)}
      ${card("Approved", statusCounts.approved, `${pct(statusCounts.approved)}% of total`)}
      ${card("Rejected", statusCounts.rejected, `${pct(statusCounts.rejected)}% of total`)}
      ${card("Other / Reset", statusCounts.other, `${pct(statusCounts.other)}% of total`)}
    `;

        const purposeRows =
            purposeData.length === 0
                ? `<tr><td colspan="3">No data in the covered range.</td></tr>`
                : purposeData
                      .map(
                          (d) => `
          <tr>
            <td>${escapeHtml(d.purpose)}</td>
            <td class="center">${d.count}</td>
            <td class="center">${pct(d.count)}%</td>
          </tr>`,
                      )
                      .join("");

        const restrictionRows =
            limitedDates.length === 0
                ? `<tr><td colspan="3">No volume limits configured.</td></tr>`
                : limitedDates
                      .map(
                          (d) => `
          <tr>
            <td>${escapeHtml(d.date)}</td>
            <td class="center">${d.limit}</td>
            <td class="center">${d.isUnavailable ? "Unavailable" : "Open"}</td>
          </tr>`,
                      )
                      .join("");

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Appointments Summary Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { margin: 0; font-size: 20px; text-align: center; color: #000; }
    h2, .section-title {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 800;
      color: #000;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .muted { color: #334155; font-size: 11px; }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .card {
      border-radius: 10px;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #000000;
    }
    .card-label { font-size: 10px; font-weight: 700; }
    .card-value { font-size: 20px; font-weight: 800; margin-top: 2px; word-break: break-word; }
    .card-sub { font-size: 10px; margin-top: 2px; color: #334155; }
    .section { margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
      background: #ffffff;
      color: #000000;
    }
    th { font-size: 10px; border-bottom: 2px solid #94a3b8; }
    td.center, th.center { text-align: center; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      color: #334155;
      font-size: 10px;
      margin-top: 16px;
    }
    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      * {
        background: #ffffff !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        color: #000000 !important;
      }
      table, th, td, .card {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="header avoid-break">
    <h1>APPOINTMENTS SUMMARY REPORT</h1>
    <p class="muted" style="margin-top:8px">Generated: ${escapeHtml(generatedAt)}</p>
    <p class="muted">Coverage: ${escapeHtml(rangeLabel)}</p>
    <p class="muted">Appointments in coverage: ${data.length}</p>
  </div>

  <div class="section avoid-break">
    <div class="grid-4">${topCards}</div>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Status Overview</h2>
    <div class="grid-4">${statusCards}</div>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Appointments by Purpose</h2>
    <table>
      <thead>
        <tr>
          <th>Purpose</th>
          <th class="center">Count</th>
          <th class="center">Share</th>
        </tr>
      </thead>
      <tbody>${purposeRows}</tbody>
    </table>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Date Restrictions &amp; Volume Limits</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="center">Volume Limit</th>
          <th class="center">Availability</th>
        </tr>
      </thead>
      <tbody>${restrictionRows}</tbody>
    </table>
    <p class="muted" style="margin-top:8px">${unavailable.length} date(s) marked unavailable</p>
  </div>

  <div class="footer avoid-break">
    <p>This report is system-generated and reflects data at the time of generation.</p>
    <p>© ${new Date().getFullYear()} E-MDRRMO</p>
  </div>
</body>
</html>`;

        const existing = document.getElementById("appointments-summary-print-frame");
        if (existing) existing.remove();

        const iframe = document.createElement("iframe");
        iframe.id = "appointments-summary-print-frame";
        iframe.setAttribute("title", "Appointments Summary Print");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();

        const triggerPrint = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error("Print failed:", err);
            }
            setTimeout(() => {
                try {
                    iframe.remove();
                } catch {
                    /* ignore */
                }
            }, 60_000);
        };

        if (iframe.contentWindow.document.readyState === "complete") {
            setTimeout(triggerPrint, 300);
        } else {
            iframe.onload = () => setTimeout(triggerPrint, 300);
        }
    };

    const Card = ({ label, value, sub, color }) => (
        <div className={`p-4 rounded-xl border ${color}`}>
            <p className="text-xs font-bold opacity-70">{label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h3 className="font-bold text-slate-800">Appointments Summary Report</h3>

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
                        <button
                            type="button"
                            onClick={() => applyPreset("", "")}
                            className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                        >
                            All Time
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset(`${todayKey.slice(0, 8)}01`, todayKey)}
                            className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                        >
                            This Month
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset(todayKey, todayKey)}
                            className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm"
                        >
                            <Download className="w-4 h-4" /> Print / Save PDF
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-sm hover:bg-slate-100"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="p-8 text-slate-800 max-h-[70vh] overflow-y-auto">
                    <div className="text-center border-b border-slate-200 pb-6 mb-8">
                        <h1 className="text-2xl font-black text-slate-900">APPOINTMENTS SUMMARY REPORT</h1>
                        <p className="text-sm text-slate-500 mt-2">Generated: {generatedAt}</p>
                        <p className="text-xs text-slate-400 mt-1">Coverage: {rangeLabel}</p>
                        <p className="text-xs text-slate-400 mt-1">Appointments in coverage: {data.length}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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

                    <div className="mb-8">
                        <h2 className="font-bold text-slate-800 mb-3">Status Overview</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Card label="Pending" value={statusCounts.pending} sub={`${pct(statusCounts.pending)}% of total`} color="bg-yellow-50 border-yellow-200 text-yellow-700" />
                            <Card label="Approved" value={statusCounts.approved} sub={`${pct(statusCounts.approved)}% of total`} color="bg-green-50 border-green-200 text-green-700" />
                            <Card label="Rejected" value={statusCounts.rejected} sub={`${pct(statusCounts.rejected)}% of total`} color="bg-red-50 border-red-200 text-red-700" />
                            <Card label="Other / Reset" value={statusCounts.other} sub={`${pct(statusCounts.other)}% of total`} color="bg-slate-50 border-slate-200 text-slate-700" />
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="font-bold text-slate-800 mb-3">Appointments by Purpose</h2>
                        {purposeData.length === 0 ? (
                            <p className="text-sm text-slate-500">No data in the covered range.</p>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Purpose</th>
                                        <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Count</th>
                                        <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purposeData.map((d) => (
                                        <tr key={d.purpose} className="border-b border-slate-100">
                                            <td className="p-2 border border-slate-200 font-semibold text-slate-700">{d.purpose}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">{d.count}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">{pct(d.count)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="mb-8">
                        <h2 className="font-bold text-slate-800 mb-3">Date Restrictions &amp; Volume Limits</h2>
                        {limitedDates.length === 0 ? (
                            <p className="text-sm text-slate-500">No volume limits configured.</p>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Date</th>
                                        <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Volume Limit</th>
                                        <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Availability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {limitedDates.map((d) => (
                                        <tr key={d.date} className="border-b border-slate-100">
                                            <td className="p-2 border border-slate-200 text-slate-700">{d.date}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">{d.limit}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">
                                                {d.isUnavailable ? "Unavailable" : "Open"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{unavailable.length} date(s) marked unavailable</p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                        <p>This report is system-generated and reflects data at the time of generation.</p>
                        <p className="mt-1">© {new Date().getFullYear()} E-MDRRMO</p>
                    </div>
                </div>
            </div>
        </div>
    );
};