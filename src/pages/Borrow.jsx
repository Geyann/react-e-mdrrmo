"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import { Ambulance, AlertCircle, CheckCircle, Loader2, User } from "lucide-react";

const Borrow = () => {
  const navigate = useNavigate();

  const [borrow, setBorrow] = useState({
    dispatchNum: "",
    departure: "",
    arrival: "",
    contactNum: "",
    vehicle: "",
    requestedBy: "",
    purpose: "",
    destination: "",
    date: "",
    time: "",
  });

  const [requester, setRequester] = useState(null); // { userId, fullName, contact }
  const [loadingRequester, setLoadingRequester] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // Auto-detect the requester from the session (same logic as
  // Report.jsx). requestedBy + contactNum come from the account,
  // never typed by the user.
  // ============================================================
  useEffect(() => {
    const loadRequester = async () => {
      try {
        // 1) Staff / Admin session
        const storedStaff = localStorage.getItem("currentStaff");
        if (storedStaff) {
          const parsed = JSON.parse(storedStaff);
          const staffCustomId = parsed.user_id || parsed.id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, mobile_number, email")
            .eq("user_id", staffCustomId)
            .maybeSingle();

          if (!profile?.id) {
            throw new Error("Staff account not found in profiles — ask an admin to add your profile row.");
          }

          const contact = profile.mobile_number || parsed.mobile_number || profile.email || "";
          const fullName = profile.full_name || parsed.full_name || parsed.role || "Staff";

          setRequester({ userId: profile.id, fullName, contact });
          setBorrow((prev) => ({ ...prev, requestedBy: fullName, contactNum: contact }));
          return;
        }

        // 2) Regular user session
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          const [{ data: profileData }, { data: pendingData }] = await Promise.all([
            supabase.from("profiles").select("*").eq("email", parsed.email).maybeSingle(),
            supabase.from("pending_registrations").select("*").eq("email", parsed.email).maybeSingle(),
          ]);

          if (!profileData?.id) {
            throw new Error("Your account isn't approved in profiles yet — ask an admin to approve your registration.");
          }

          const mobile = profileData.mobile_number || pendingData?.mobile_number || "";
          const contact = mobile || profileData.email || parsed.email || "";
          const fullName =
            profileData.full_name ||
            parsed.full_name ||
            `${parsed.first_name || ""} ${parsed.middle_name || ""} ${parsed.last_name || ""}`.trim();

          setRequester({ userId: profileData.id, fullName, contact });
          setBorrow((prev) => ({ ...prev, requestedBy: fullName, contactNum: contact }));
          return;
        }

        // 3) No session → bounce to login
        navigate("/login", { replace: true, state: { error: "Please log in first." } });
      } catch (err) {
        console.error("Error loading requester:", err);
        setError(err.message || "Failed to load your session. Please log in again.");
      } finally {
        setLoadingRequester(false);
      }
    };

    loadRequester();
  }, [navigate]);

  function handleChange(event) {
    setBorrow((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  // ============================================================
  // Submit → insert into borrow-vehicle with the profile UUID
  // ============================================================
  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!requester?.userId) {
        throw new Error("No authenticated user found. Please log in.");
      }

      const { error } = await supabase.from("borrow-vehicle").insert({
        dispatchNum: borrow.dispatchNum,
        departure: borrow.departure,
        arrival: borrow.arrival,
        contactNum: requester.contact,     // auto-filled, never typed
        vehicle: borrow.vehicle,
        requestedBy: requester.fullName,   // auto-filled, never typed
        purpose: borrow.purpose,
        destination: borrow.destination,
        date: borrow.date,
        time: borrow.time,
        userId: requester.userId,          // profiles.id UUID → matches FK
      });

      if (error) throw new Error(error.message);

      setSuccess("Dispatch request submitted successfully!");

      // Reset the form, keep the auto-detected requester
      setBorrow({
        dispatchNum: "",
        departure: "",
        arrival: "",
        contactNum: requester.contact,
        vehicle: "",
        requestedBy: requester.fullName,
        purpose: "",
        destination: "",
        date: "",
        time: "",
      });
    } catch (err) {
      console.error("Insert error:", err);
      setError(err.message || "Failed to submit the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRequester) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading requester details...</p>
        </div>
      </div>
    );
  }

  if (!requester) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <p className="text-red-600 font-bold text-lg">
            {error || "You must be logged in to request a vehicle."}
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-3xl mx-auto rounded-t-4xl shadow-t-xl border border-b-transparent border-gray-100">
        <div className="flex flex-col items-center mb-3 pt-5">
          <Ambulance className="w-15 h-auto text-slate-200" />
          <h1 className="text-3xl font-bold text-white text-center">
            Emergency Response Vehicle Dispatch
          </h1>
          <p className="text-white text-sm">
            All fields marked <span className="text-red-500">*</span> are required.
          </p>
        </div>
      </div>

      <form
        onSubmit={submitRequest}
        className="max-w-3xl mx-auto bg-white px-12 pb-10 pt-5 rounded-b-3xl shadow-b-xl border border-gray-100"
      >
        {/* Auto-detected requester banner */}
        {requester && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
            <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-gray-800">Requesting as: {requester.fullName}</p>
              <p className="text-gray-600">{requester.contact}</p>
              <p className="text-xs text-gray-400">
                Requester identity is detected automatically from your account.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Kilometer Reading
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Departure", name: "departure", type: "text", placeholder: "e.g. 12,450 km" },
            { label: "Date", name: "date", type: "date" },
            { label: "Arrival", name: "arrival", type: "text", placeholder: "e.g. 12,512 km" },
            { label: "Time", name: "time", type: "time" },
            { label: "Dispatch No.", name: "dispatchNum", type: "text", placeholder: "e.g. DISP-2026-001" },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {field.label} <span className="text-red-500">*</span>
              </label>
              <input
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={borrow[field.name]}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Vehicle to be used <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicle"
              onChange={handleChange}
              value={borrow.vehicle}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white outline-none focus:border-blue-500"
              required
            >
              <option value="">Select an Option</option>
              <option value="ambulance">Ambulance</option>
              <option value="rescue-truck">Rescue Truck</option>
              <option value="utility-van">Utility Van</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              name="purpose"
              onChange={handleChange}
              value={borrow.purpose}
              placeholder="e.g. Transport patient to hospital"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              name="destination"
              onChange={handleChange}
              value={borrow.destination}
              placeholder="e.g. City General Hospital"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit ERVD"
          )}
        </button>
      </form>
    </div>
  );
};

export default Borrow;