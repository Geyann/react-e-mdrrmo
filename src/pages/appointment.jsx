"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { CalendarDays, AlertCircle, ChevronLeft, ChevronRight, User } from "lucide-react";

const AppointmentForm = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    purpose: "",
    date: "",
    time: "",
    reason: "",
  });

  const [availableDates, setAvailableDates] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [dateVolumeLimits, setDateVolumeLimits] = useState({});
  const [bookingsPerDate, setBookingsPerDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDateBookings, setSelectedDateBookings] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch current user from localStorage (regular users) or Supabase Auth (staff/admin)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // 1. Check localStorage first (regular users)
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          
          const fullName = parsedUser.full_name || 
            `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim();
          
          if (fullName) {
            setFormData(prev => ({ ...prev, fullName }));
          }
          return;
        }

        // 2. Fallback to Supabase Auth (staff/admin)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          const { data: profile } = await supabase
            .from("pending_registrations")
            .select("first_name, last_name")
            .eq("email", user.email)
            .maybeSingle();

          if (profile) {
            setFormData(prev => ({
              ...prev,
              fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch availability data
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      try {
        setLoading(true);
        setError("");

        const { data: appointments, error: appointmentError } = await supabase
          .from("appointments")
          .select("date");

        if (appointmentError) throw appointmentError;

        const { data: restrictions, error: restrictionError } = await supabase
          .from("date_restrictions")
          .select("date, is_unavailable, volume_limit");

        if (restrictionError && restrictionError.code !== "PGRST116") {
          throw restrictionError;
        }

        const bookingCounts = {};
        appointments?.forEach((apt) => {
          bookingCounts[apt.date] = (bookingCounts[apt.date] || 0) + 1;
        });

        const unavailable = [];
        const limits = {};
        restrictions?.forEach((restriction) => {
          if (restriction.is_unavailable) {
            unavailable.push(restriction.date);
          }
          if (restriction.volume_limit) {
            limits[restriction.date] = restriction.volume_limit;
          }
        });

        const available = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= 90; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() + i);

          const dateString = checkDate.toISOString().split("T")[0];

          if (unavailable.includes(dateString)) continue;

          const bookingCount = bookingCounts[dateString] || 0;
          const limit = limits[dateString];
          if (limit && bookingCount >= limit) continue;

          available.push(dateString);
        }

        setUnavailableDates(unavailable);
        setDateVolumeLimits(limits);
        setBookingsPerDate(bookingCounts);
        setAvailableDates(available);
      } catch (err) {
        console.error("Error fetching availability:", err);
        setError("Failed to load available dates. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailabilityData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "date") {
      setSelectedDateBookings(bookingsPerDate[value] || 0);
    }
  }

  const handleDateSelect = (date) => {
    if (!availableDates.includes(date)) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      date: date,
    }));
    setSelectedDateBookings(bookingsPerDate[date] || 0);
  };

  async function createAppointment(event) {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");

      if (!currentUser) {
        setError("You must be logged in to create an appointment.");
        return;
      }

      if (!availableDates.includes(formData.date)) {
        setError("This date is no longer available. Please select another date.");
        return;
      }
      const bookingCount = bookingsPerDate[formData.date] || 0;
      const limit = dateVolumeLimits[formData.date];
      if (limit && bookingCount >= limit) {
        setError("This date has reached maximum capacity.");
        return;
      }

      // ============================================================
      // FIX: Get the auth UUID — this is critical for tracking
      // ============================================================
      // Try to get the auth UUID (user_id_from_auth) from multiple sources
      let authUserId = null;

      // Source 1: Supabase Auth session
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        authUserId = user.id;
      }

      // Source 2: localStorage currentUser might have an id that's the auth UUID
      if (!authUserId && currentUser.id) {
        authUserId = currentUser.id;
      }

      // Source 3: currentUser.user_id
      if (!authUserId && currentUser.user_id) {
        authUserId = currentUser.user_id;
      }

      // Build the insert object
      const appointmentData = {
        fullName: formData.fullName,
        purpose: formData.purpose,
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
        userId: authUserId,  // Keep this for backwards compatibility
        user_id_from_auth: authUserId,  // NEW: Store the auth UUID for tracking
        user_id: authUserId,  // Also store in user_id (text) for good measure
      };

      console.log("Inserting appointment:", appointmentData);

      const { error } = await supabase
        .from("appointments")
        .insert([appointmentData]);

      if (error) throw error;

      setSuccess("Appointment scheduled successfully! Please wait for admin confirmation.");
      setFormData({
        fullName: formData.fullName,
        purpose: "",
        date: "",
        time: "",
        reason: "",
      });

      setTimeout(() => {
        setSuccess("");
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error("Error creating appointment:", err.message);
      setError(err.message || "Failed to schedule appointment.");
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isDateAvailable = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return availableDates.includes(dateString);
  };

  const isDateUnavailable = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return unavailableDates.includes(dateString);
  };

  const isDateSelected = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return formData.date === dateString;
  };

  const isDateInPast = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate < today;
  };

  const isDateAtCapacity = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const bookingCount = bookingsPerDate[dateString] || 0;
    const limit = dateVolumeLimits[dateString];
    return limit && bookingCount >= limit;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
  const days = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent py-10 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <CalendarDays className="w-12 h-12 text-blue-600" />
          </div>
          <p className="mt-4 text-gray-600 font-semibold">Loading available dates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-5xl mx-auto bg-white rounded-t-3xl shadow-xl border border-gray-200">
        <div className="flex flex-col items-center mb-3 pt-5">
         <CalendarDays className="w-15 h-auto text-white" />
         <h1 className="text-3xl font-bold text-white text-center">
            Schedule an Appointment
          </h1>
          <p className="text-white text-sm">
            All fields marked <span className="text-red-500">*</span> are required.
          </p>
        </div>
      </div>
      <form
        onSubmit={createAppointment}
        className="max-w-5xl mx-auto bg-white p-8 md:p-10 rounded-b-3xl shadow-xl border border-gray-200"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Form Fields */}
          <div className="flex flex-col gap-6">
            {/* User Info Display */}
            {currentUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-800">Logged in as: </span>
                  <span className="text-blue-700">{formData.fullName || currentUser.email}</span>
                </div>
              </div>
            )}

            {!currentUser && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm font-medium">You must be logged in to create an appointment.</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                <CalendarDays className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
            )}

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Full Name<span className="text-red-500">*</span>
              </label>
              <input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter Full Name"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Purpose */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Purpose<span className="text-red-500">*</span>
              </label>
              <input
                name="purpose"
                type="text"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="What is the purpose of your visit?"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Time<span className="text-red-500">*</span>
              </label>
              <input
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!formData.date}
                required
              />
              {!formData.date && (
                <p className="text-xs text-gray-500">Select a date first</p>
              )}
            </div>

            {/* Booking Status */}
            {formData.date && availableDates.includes(formData.date) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                <span className="font-semibold">✓ Selected Date:</span> {formData.date}
                <br />
                <span className="font-semibold">Current Bookings:</span> {selectedDateBookings}
                {dateVolumeLimits[formData.date] && (
                  <span> / {dateVolumeLimits[formData.date]}</span>
                )}
              </div>
            )}

            {/* Reason Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Reason / Additional Notes
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Provide brief details..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition h-24"
              />
            </div>

            <button
              type="submit"
              disabled={!currentUser || availableDates.length === 0 || !formData.date || !availableDates.includes(formData.date) || !formData.fullName || !formData.purpose || !formData.time}
              className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CalendarDays className="w-5 h-5" />
              Confirm Appointment
            </button>
          </div>

          {/* Right Column - Calendar */}
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Select a Date
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Choose an available date for your appointment.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span className="text-gray-700 font-medium">Available</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 bg-red-400 rounded"></div>
                  <span className="text-gray-700 font-medium">Unavailable</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span className="text-gray-700 font-medium">At Capacity</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-700 font-medium">Selected</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button onClick={previousMonth} type="button" className="p-2 hover:bg-gray-200 rounded-lg transition">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h3 className="text-xl font-bold text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button onClick={nextMonth} type="button" className="p-2 hover:bg-gray-200 rounded-lg transition">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="aspect-square"></div>;
                    }

                    const isAvailable = isDateAvailable(day);
                    const isUnavailable = isDateUnavailable(day);
                    const isSelected = isDateSelected(day);
                    const inPast = isDateInPast(day);
                    const atCapacity = isDateAtCapacity(day);

                    let bgColor = "bg-gray-100 text-gray-400";
                    let cursor = "cursor-not-allowed";

                    if (inPast) {
                      bgColor = "bg-gray-200 text-gray-400 cursor-not-allowed";
                    } else if (isUnavailable) {
                      bgColor = "bg-red-500 text-white font-bold cursor-not-allowed";
                    } else if (atCapacity) {
                      bgColor = "bg-yellow-400 text-gray-800 font-bold cursor-not-allowed";
                    } else if (isSelected) {
                      bgColor = "bg-blue-600 text-white font-bold shadow-lg cursor-pointer";
                    } else if (isAvailable) {
                      bgColor = "bg-green-400 text-white font-bold hover:bg-green-500 cursor-pointer transition";
                    }

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (isAvailable && !inPast && !isUnavailable && !atCapacity) {
                            handleDateSelect(
                              `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                            );
                          }
                        }}
                        disabled={!isAvailable || inPast || isUnavailable || atCapacity}
                        type="button"
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold ${bgColor} ${cursor}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {availableDates.length === 0 ? (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-700 text-sm font-medium">No available dates at the moment.</p>
                </div>
              ) : (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700 text-sm font-medium">{availableDates.length} dates available in the next 90 days.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;