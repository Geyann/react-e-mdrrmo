"use client";

import React, { useEffect, useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from "../createClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { Check, X, Clock, CheckCircle, XCircle, Search, AlertCircle, History } from "lucide-react";

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

      // Fetch ALL appointments including user_id
      const { data: allApts, error: allAptsError } = await supabase
        .from("appointments")
        .select("*")
        .order("created_at", { ascending: false });

      if (allAptsError) throw allAptsError;

      // Normalize appointments - handle both appointmentId and id as primary key
      const processedApts = (allApts || []).map(apt => {
        // Try to get user_id from various possible column names
        const userId = apt.user_id || apt.userId || apt.userid || apt.auth_id || apt.user_uuid || "N/A";
        
        return {
          ...apt,
          id: apt.appointmentId || apt.id, // fallback if column is "id" not "appointmentId"
          appointmentId: apt.appointmentId || apt.id, // ensure appointmentId exists
          status: apt.status || "pending",
          user_id: userId,
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

      const currentBookingCount = appointments.filter(a => a.date === selectedDate).length;
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
    const dateString = date.toISOString().split('T')[0];
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

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b"];

  const StatCard = ({ icon: Icon, label, count, color }) => (
    <div className={`p-6 rounded-2xl border ${color} bg-opacity-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-semibold">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{count}</p>
        </div>
        <Icon className={`w-10 h-10 ${color}`} />
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
      <div className="p-6 md:p-10 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 min-h-screen">
      <h1 className="text-3xl font-black text-slate-800 mb-8">ADMIN DASHBOARD</h1>

      {/* Tab Navigation */}
      <div className="mb-8 flex gap-4 border-b border-slate-300">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === "calendar"
              ? "border-b-4 border-blue-600 text-blue-600"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Calendar & Restrictions
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === "appointments"
              ? "border-b-4 border-blue-600 text-blue-600"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Appointments
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === "history"
              ? "border-b-4 border-blue-600 text-blue-600"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          History
        </button>
      </div>

      {/* ===================== */}
      {/* CALENDAR & RESTRICTIONS */}
      {/* ===================== */}
      {activeTab === "calendar" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Analytics Section */}
            <div className="lg:col-span-2 p-8 rounded-[25px] bg-white border border-slate-200 shadow-sm">
              <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">APPOINTMENT VOLUME</h2>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="date"
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="w-full h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="purpose" type="category" fontSize={10} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" barSize={30} radius={[0, 10, 10, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No data available for selected date range
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Section */}
            <div className="p-6 bg-white rounded-[25px] border border-slate-200 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 mb-4">AVAILABILITY</h2>
              <Calendar
                onClickDay={handleCalendarDateClick}
                tileClassName={({ date }) => {
                  const d = date.toISOString().split('T')[0];
                  const isUnavailable = unavailableDates.includes(d);
                  const hasLimit = dateVolumeLimits[d];
                  
                  let baseClasses = "cursor-pointer hover:opacity-80 transition-opacity ";
                  if (isUnavailable) {
                    return baseClasses + "!bg-red-500 !text-white font-bold";
                  }
                  if (hasLimit) {
                    return baseClasses + "!bg-yellow-200 !text-slate-800 font-bold";
                  }
                  return baseClasses + "!bg-green-100 !text-slate-800";
                }}
              />
              <div className="mt-4 text-xs font-bold text-slate-600 space-y-1">
                <div><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Unavailable (auto when full)</div>
                <div><span className="inline-block w-3 h-3 bg-yellow-200 rounded mr-2 border border-slate-300"></span>Limited Volume</div>
                <div><span className="inline-block w-3 h-3 bg-green-100 rounded mr-2 border border-slate-300"></span>Available</div>
              </div>
            </div>
          </div>

          {/* Volume Limits Table */}
          <div className="p-8 rounded-[25px] bg-white border border-slate-200 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4">DATE RESTRICTIONS & VOLUME LIMITS</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-bold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-700">Volume Limit</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-700">Current Bookings</th>
                    <th className="text-left py-3 px-4 font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getAllDatesWithRestrictions().length > 0 ? (
                    getAllDatesWithRestrictions().map((date) => {
                      const bookingsOnDate = appointments.filter(a => a.date === date).length;
                      const isUnavailable = unavailableDates.includes(date);
                      const limit = dateVolumeLimits[date];
                      const isAutoDisabled = limit && bookingsOnDate >= limit;
                      
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
                              limit && bookingsOnDate >= limit ? "text-red-600" : "text-green-600"
                            }`}>
                              {bookingsOnDate}
                            </span>
                          </td>
                          <td className="py-3 px-4 space-x-2">
                            <button
                              onClick={() => toggleDateAvailability(date)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                isUnavailable
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "bg-red-500 hover:bg-red-600 text-white"
                              }`}
                            >
                              {isUnavailable ? "Enable" : "Disable"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDate(date);
                                setVolumeLimit(limit ? limit.toString() : "");
                                setMakeUnavailable(isUnavailable);
                                setShowVolumeModal(true);
                              }}
                              className="px-3 py-1 rounded text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                            >
                              {limit ? "Edit" : "Set Limit"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Clock}
              label="Pending Approval"
              count={appointmentStats.pending}
              color="text-yellow-600 border-yellow-200"
            />
            <StatCard
              icon={CheckCircle}
              label="Approved"
              count={appointmentStats.approved}
              color="text-green-600 border-green-200"
            />
            <StatCard
              icon={XCircle}
              label="Rejected"
              count={appointmentStats.rejected}
              color="text-red-600 border-red-200"
            />
            <StatCard
              icon={Clock}
              label="Total Appointments"
              count={appointmentStats.total}
              color="text-blue-600 border-blue-200"
            />
          </div>

          {/* Status Pie Chart */}
          {statusChartData.some(item => item.value > 0) && (
            <div className="p-8 rounded-[25px] bg-white border border-slate-200 shadow-sm mb-8">
              <h2 className="text-lg font-black text-slate-800 mb-4">APPOINTMENT STATUS OVERVIEW</h2>
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
                      fill="#8884d8"
                      dataKey="value"
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, purpose, or user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setAppointmentFilter(status)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      appointmentFilter === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Appointments Table — WITH user_id column */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">User ID</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Purpose</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Date & Time</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Reason</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((apt) => (
                      <tr
                        key={apt.id || apt.appointmentId}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        {/* USER ID CELL */}
                        <td className="px-6 py-4">
                          <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[140px]">
                            {apt.user_id}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">{apt.fullName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{apt.purpose}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-semibold text-slate-800">{apt.date}</p>
                            <p className="text-slate-600">{apt.time}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 max-w-xs truncate">
                            {apt.reason || "N/A"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {apt.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointmentId, "approved")}
                                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointmentId, "rejected")}
                                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => updateAppointmentStatus(apt.appointmentId, "pending")}
                                className="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
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
                        <p className="text-slate-600 font-semibold">No appointments found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Info */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Showing {filteredAppointments.length} of {allAppointments.length} appointments
          </div>
        </>
      )}

      {/* ===================== */}
      {/* HISTORY TAB             */}
      {/* ===================== */}
      {activeTab === "history" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              Appointment History
            </h2>
            <p className="text-slate-600 mb-6">
              View all approved and declined appointments.
            </p>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search history by name, purpose, or user ID..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["all", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setHistoryFilter(status)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      historyFilter === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-green-200 bg-green-50">
                <p className="text-sm font-semibold text-green-700">Approved</p>
                <p className="text-2xl font-bold text-green-800">{appointmentStats.approved}</p>
              </div>
              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <p className="text-sm font-semibold text-red-700">Rejected</p>
                <p className="text-2xl font-bold text-red-800">{appointmentStats.rejected}</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">Total Processed</p>
                <p className="text-2xl font-bold text-slate-800">
                  {appointmentStats.approved + appointmentStats.rejected}
                </p>
              </div>
            </div>
          </div>

          {/* History Table — WITH user_id column */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">#</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">User ID</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Purpose</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Date & Time</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Reason</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {getHistoryAppointments().length > 0 ? (
                    getHistoryAppointments().map((apt, index) => (
                      <tr
                        key={apt.id || apt.appointmentId}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                          {index + 1}
                        </td>
                        {/* USER ID CELL */}
                        <td className="px-6 py-4">
                          <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate max-w-[140px]">
                            {apt.user_id}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{apt.fullName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-800">{apt.purpose}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-semibold text-slate-800">{apt.date}</p>
                            <p className="text-slate-600">{apt.time}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 max-w-xs truncate">
                            {apt.reason || "N/A"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4">
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
          <div className="mt-6 text-center text-sm text-slate-600">
            Showing {getHistoryAppointments().length} processed appointment(s)
          </div>
        </>
      )}

      {/* Volume Limit Modal */}
      {showVolumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-8 w-96 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              Set Volume Limit
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Date: <span className="font-bold text-slate-800">{selectedDate}</span>
            </p>
            <input
              type="number"
              min="1"
              value={volumeLimit}
              onChange={(e) => setVolumeLimit(e.target.value)}
              placeholder="Enter maximum appointments"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeUnavailable}
                  onChange={(e) => setMakeUnavailable(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
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
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={setVolumeLimitForDate}
                className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;