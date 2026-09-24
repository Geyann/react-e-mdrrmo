"use client";

import { Link, useNavigate } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import { TriangleAlertIcon } from "lucide-react";
import { useSettings } from "../pages/SettingsContext";

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const HAZARD_BUCKET = "hazard-photos";

/* ══════════════════════════════════════════════════════════════════════
   PHOTO PREVIEW — owns its object URL so it can be revoked
   ══════════════════════════════════════════════════════════════════════ */
const PhotoPreview = ({ file, index }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />;
  }

  return (
    <div className="relative">
      <img
        src={url}
        alt={`Photo preview ${index + 1}`}
        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-slate-600"
      />
      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
        {index + 1}
      </span>
    </div>
  );
};

/* ── Form shape ───────────────────────────────────────────────────── */
const initialForm = {
  reporterName: "",
  department: "",
  address: "",
  landMark: "",
  reporterContact: "",
  dateObserved: "",
  timeObserved: "",
  hazardCategory: "",
  riskLevel: "",
  hazardPhotos: [],
  hazardDescription: "",
  recommendedAction: "",
  latitude: null,
  longitude: null,
};

const photoSummary = (count) =>
  count === 0
    ? null
    : `${count} photo${count === 1 ? "" : "s"} attached as evidence.`;

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
const HazardReport = () => {
  const navigate = useNavigate();
  const { prefs, setPref } = useSettings();

  const [realName, setRealName] = useState("");
  const [identity, setIdentity] = useState("resident"); // resident | staff | none
  const [resolving, setResolving] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);

  const [form, setForm] = useState(initialForm);

  /* ── Preference flags ─────────────────────────────────────────── */
  const nameIsMasked = prefs.public_name === false;
  const locationEnabled = prefs.location_access !== false;

  /* Local "today" (avoids UTC off-by-one) — blocks future dates */
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  /* ════════════════════════════════════════════════════════════════
     IDENTITY
     ════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;

    const resolveIdentity = async () => {
      let resolved = false;

      // 1. Supabase Auth (Google / migrated accounts)
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser && !cancelled) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, first_name, last_name")
            .eq("id", supabaseUser.id)
            .maybeSingle();

          if (!cancelled) {
            setRealName(
              profile?.full_name ||
                `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
                supabaseUser.email ||
                "User"
            );
            setIdentity("resident");
            resolved = true;
          }
        }
      } catch {
        /* network or RLS failure — fall through to local sessions */
      }
      if (resolved || cancelled) { setResolving(false); return; }

      // 2. Custom localStorage resident session
      const rawUser = localStorage.getItem("currentUser");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (!cancelled) {
            setRealName(
              parsed.full_name ||
                `${parsed.first_name || ""} ${parsed.last_name || ""}`.trim() ||
                parsed.email ||
                "User"
            );
            setIdentity("resident");
            resolved = true;
          }
        } catch {
          /* malformed JSON — try staff next */
        }
      }
      if (resolved || cancelled) { setResolving(false); return; }

      // 3. Staff / admin session
      const rawStaff = localStorage.getItem("currentStaff");
      if (rawStaff) {
        try {
          const s = JSON.parse(rawStaff);
          if (!cancelled) {
            setRealName(s.full_name || s.username || s.user_id || "Staff Member");
            setIdentity("staff");
            resolved = true;
          }
        } catch {
          /* malformed — fall through */
        }
      }
      if (resolved || cancelled) { setResolving(false); return; }

      // 4. Nobody signed in
      if (!cancelled) {
        setIdentity("none");
        setResolving(false);
      }
    };

    resolveIdentity();
    return () => { cancelled = true; };
  }, []);

  /* ════════════════════════════════════════════════════════════════
     "Show My Name on Public Reports" — applied reactively
     ════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      reporterName: nameIsMasked ? "Anonymous" : realName,
    }));
  }, [nameIsMasked, realName]);

  /* ════════════════════════════════════════════════════════════════
     GPS
     ════════════════════════════════════════════════════════════════ */
  const fetchLocation = useCallback(() => {
    return new Promise((resolve) => {
      setGeoLoading(true);
      setGeoError(null);

      if (!navigator.geolocation) {
        setGeoLoading(false);
        setGeoError("Geolocation is not supported by this browser.");
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setGeoLoading(false);
          resolve(true);
        },
        (err) => {
          setGeoLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setGeoError(
              "Location permission was denied. Enable location for this site, then tap Retry."
            );
            // Be honest: if the browser says no, turn the preference off so the
            // banner switches to the "off" state and offers a clean re-enable.
            setPref("location_access", false);
          } else {
            setGeoError(
              "Unable to retrieve GPS location. Check your connection and tap Retry."
            );
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [setPref]);

  // Runs once on mount, then again whenever the user flips the toggle.
  useEffect(() => {
    if (!locationEnabled) {
      setGeoLoading(false);
      setGeoError(null);
      setForm((prev) => ({ ...prev, latitude: null, longitude: null }));
      return;
    }
    fetchLocation();
  }, [locationEnabled, fetchLocation]);

  /* Flip the pref — the effect above does the actual permission prompt,
     so the browser never sees two prompts in a row. */
  const handleEnableLocation = useCallback(() => {
    setPref("location_access", true);
  }, [setPref]);

  /* ════════════════════════════════════════════════════════════════
     PHOTOS
     ════════════════════════════════════════════════════════════════ */
  const uploadPhotos = async (files) => {
    const uploadedPaths = [];
    const failures = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        failures.push(`${file.name} is larger than 8 MB`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        failures.push(`${file.name} is not an image`);
        continue;
      }

      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      // Path is relative to the bucket — never include the bucket name here.
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(HAZARD_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        failures.push(`${file.name}: ${uploadError.message}`);
        continue;
      }
      uploadedPaths.push(filePath);
    }

    return { uploadedPaths, failures };
  };

  /* ════════════════════════════════════════════════════════════════
     FORM HANDLERS
     ════════════════════════════════════════════════════════════════ */
  function handleChange(event) {
    const { name, value, type, files } = event.target;

    if (type === "file") {
      setForm((prev) => ({
        ...prev,
        hazardPhotos: Array.from(files).slice(0, MAX_PHOTOS),
      }));
      return;
    }

    // The reporter name is locked while anonymity is on.
    if (name === "reporterName" && nameIsMasked) return;

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleResetForAnother() {
    setSuccess(false);
    setError("");
    setForm((prev) => ({
      ...initialForm,
      reporterName: nameIsMasked ? "Anonymous" : realName,
      department: prev.department,
      latitude: prev.latitude,
      longitude: prev.longitude,
    }));
  }

  /* ════════════════════════════════════════════════════════════════
     SUBMIT
     ════════════════════════════════════════════════════════════════ */
  async function createHazardReport(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      // 1. Photos first. If every upload fails, abort rather than filing a
      //    report that claims evidence but has an empty array.
      let photoPaths = [];
      if (form.hazardPhotos.length > 0) {
        const { uploadedPaths, failures } = await uploadPhotos(form.hazardPhotos);
        photoPaths = uploadedPaths;

        if (photoPaths.length === 0) {
          throw new Error(
            `None of the selected photos could be uploaded. ${
              failures.join("; ") || "Please try again."
            }`
          );
        }
        if (failures.length > 0) {
          setError(
            `${failures.length} photo(s) were skipped: ${failures.join("; ")}. The rest were attached.`
          );
        }
      }

      // 2. Only attach user_id when there is a REAL auth session — the column
      //    is a uuid FK and a localStorage UUID would be rejected.
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const hasValidUser = typeof supabaseUser?.id === "string" && supabaseUser.id.length > 10;

      const reportData = {
        reporter_name: nameIsMasked ? "Anonymous" : (form.reporterName || "Anonymous"),
        reporter_contact: form.reporterContact || "",
        address: form.address,
        landmark: form.landMark || "",
        date_observed: form.dateObserved,
        time_observed: form.timeObserved,
        hazard_category: form.hazardCategory,
        risk_level: form.riskLevel,
        hazard_description: form.hazardDescription,
        recommended_action: form.recommendedAction || "",
        hazard_photos: photoPaths,
        latitude: locationEnabled ? form.latitude : null,
        longitude: locationEnabled ? form.longitude : null,
        // Both status columns are written so admin views reading either agree.
        status: "pending",
        report_status: "pending",
        show_on_heatmap: false,
      };

      if (hasValidUser) reportData.user_id = supabaseUser.id;

      // `department` is collected but hazard_reports has no such column, so it
      // is intentionally not persisted. ALTER TABLE to add it if needed.

      const { error: insertError } = await supabase
        .from("hazard_reports")
        .insert([reportData]);

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(
        err.message
          ? `Failed to submit report: ${err.message}`
          : "Failed to submit report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER — resolving identity
     ════════════════════════════════════════════════════════════════ */
  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-slate-300 font-semibold">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER — not signed in (no redirect loop, no infinite spinner)
     ════════════════════════════════════════════════════════════════ */
  if (identity === "none") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl p-8 text-center">
          <TriangleAlertIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
            Sign in required
          </h2>
          <p className="text-gray-600 dark:text-slate-300 text-sm mb-6">
            You need an approved account before you can file a hazard report.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER — success
     ════════════════════════════════════════════════════════════════ */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 p-4">
        <div
          role="status"
          aria-live="polite"
          className="max-w-md w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-10 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Report Submitted!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-2">
            Your hazard report has been received. It will appear on the map once
            reviewed and approved by an administrator.
          </p>

          {photoSummary(form.hazardPhotos.length) && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {photoSummary(form.hazardPhotos.length)}
            </p>
          )}

          {nameIsMasked && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Filed as <strong>Anonymous</strong> — your name was withheld per your
              privacy setting.
            </p>
          )}

          {!locationEnabled && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              No GPS coordinates were attached — location access is off.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleResetForAnother}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Submit Another
            </button>
            <Link
              to="/home"
              className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition text-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER — form
     ════════════════════════════════════════════════════════════════ */
  const bannerName = realName || "User";
  const bannerInitial = (bannerName[0] || "U").toUpperCase();
  const hasCoords = form.latitude != null && form.longitude != null;

  return (
    <div className="min-h-screen pt-4 sm:pt-10 px-4 sm:px-6 ">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto rounded-t-3xl shadow-xl px-4 pb-6">
        <div className="flex flex-col items-center pt-5">
          <TriangleAlertIcon className="w-14 h-14 text-slate-200" aria-hidden="true" />
          <h1 id="hazard-report-title" className="text-2xl sm:text-3xl font-bold text-white text-center">
            Hazard &amp; Risk Report
          </h1>
          <p className="text-white text-sm text-center">
            Identify risks. Fields marked <span className="text-red-300">*</span> are required.
          </p>
        </div>
      </div>

      <form
        onSubmit={createHazardReport}
        aria-labelledby="hazard-report-title"
        className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-5 sm:p-8 md:p-10 rounded-b-3xl shadow-xl border border-gray-200 dark:border-slate-700"
      >
        <div className="flex flex-col gap-6">

          {/* Identity banner — always shows the real name (only they see it) */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  Reporting as:{" "}
                  <span className="text-blue-900 dark:text-blue-100">{bannerName}</span>
                  {identity === "staff" && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-semibold uppercase">
                      Staff
                    </span>
                  )}
                </p>
                {nameIsMasked && (
                  <p className="text-[11px] mt-0.5 text-blue-700 dark:text-blue-300">
                    Your name will be submitted as <strong>Anonymous</strong>.{" "}
                    <Link to="/settings" className="underline font-semibold">
                      Change this in Settings
                    </Link>
                  </p>
                )}
              </div>
              <div className="w-8 h-8 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-200 font-bold text-sm shrink-0">
                {bannerInitial}
              </div>
            </div>
          </div>

          {/* Submission error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <TriangleAlertIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Reporter Name + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reporterName" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Reporter Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="reporterName"
                  name="reporterName"
                  value={form.reporterName}
                  onChange={handleChange}
                  readOnly={nameIsMasked}
                  required
                  autoComplete="name"
                  aria-describedby={nameIsMasked ? "anonHint" : undefined}
                  className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 dark:bg-slate-900 read-only:bg-gray-100 dark:read-only:bg-slate-800"
                />
                {nameIsMasked && (
                  <p id="anonHint" className="text-xs text-gray-500 dark:text-slate-400">
                    Anonymity is on, so this field is locked to “Anonymous”.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reporterContact" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Contact Details
                </label>
                <input
                  id="reporterContact"
                  name="reporterContact"
                  value={form.reporterContact}
                  onChange={handleChange}
                  placeholder="Phone or email"
                  autoComplete="tel"
                  className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 dark:bg-slate-900"
                />
                {nameIsMasked && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Consider leaving this blank — a contact number can still identify you.
                  </p>
                )}
              </div>
            </div>

            {/* Hazard Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardCategory" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Hazard Category <span className="text-red-500">*</span>
              </label>
              <select
                id="hazardCategory"
                name="hazardCategory"
                value={form.hazardCategory}
                onChange={handleChange}
                required
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select Category --</option>
                <option value="physical">Physical</option>
                <option value="chemical/biological">Chemical / Biological</option>
                <option value="electrical">Electrical</option>
                <option value="procedural/safety practices">Procedural / Safety Practices</option>
                <option value="natural disaster">Natural Disaster</option>
              </select>
            </div>

            {/* Risk Level */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="riskLevel" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Risk Level <span className="text-red-500">*</span>
              </label>
              <select
                id="riskLevel"
                name="riskLevel"
                value={form.riskLevel}
                onChange={handleChange}
                required
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select Risk Level --</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Location / Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                autoComplete="street-address"
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 dark:bg-slate-900"
              />
            </div>

            {/* Landmark */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="landMark" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Landmark
              </label>
              <input
                id="landMark"
                name="landMark"
                value={form.landMark}
                onChange={handleChange}
                placeholder="Optional landmark near the hazard"
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 dark:bg-slate-900"
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="department" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Department
              </label>
              <input
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="Optional — not stored server-side"
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 dark:bg-slate-900"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateObserved" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Date Observed <span className="text-red-500">*</span>
                </label>
                <input
                  id="dateObserved"
                  name="dateObserved"
                  type="date"
                  value={form.dateObserved}
                  onChange={handleChange}
                  required
                  max={todayStr}
                  className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 dark:bg-slate-900"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="timeObserved" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Time Observed <span className="text-red-500">*</span>
                </label>
                <input
                  id="timeObserved"
                  name="timeObserved"
                  type="time"
                  value={form.timeObserved}
                  onChange={handleChange}
                  required
                  className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardDescription" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Hazard Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="hazardDescription"
                name="hazardDescription"
                value={form.hazardDescription}
                onChange={handleChange}
                required
                placeholder="Describe the hazard in detail..."
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-900"
              />
            </div>

            {/* Recommended Action */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recommendedAction" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Recommended Action
              </label>
              <textarea
                id="recommendedAction"
                name="recommendedAction"
                value={form.recommendedAction}
                onChange={handleChange}
                placeholder="What action do you recommend to address this hazard?"
                className="text-base p-3 border border-gray-300 dark:border-slate-600 rounded-xl min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-900"
              />
            </div>

            {/* Photos */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardPhotos" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Photo Evidence (up to {MAX_PHOTOS} images) <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="hazardPhotos"
                className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 focus-within:ring-2 focus-within:ring-blue-500 min-h-[56px]"
              >
                <img src={reportImg} alt="" className="w-8 h-8 shrink-0" />
                <span className="text-gray-500 dark:text-slate-400 text-sm truncate">
                  {form.hazardPhotos.length > 0
                    ? `${form.hazardPhotos.length} image(s) selected`
                    : "Tap to take a photo or select files"}
                </span>
                <input
                  id="hazardPhotos"
                  name="hazardPhotos"
                  type="file"
                  multiple
                  onChange={handleChange}
                  className="sr-only"
                  accept="image/*"
                  required
                  aria-describedby="photoHint"
                />
              </label>
              <p id="photoHint" className="text-xs text-gray-500 dark:text-slate-400">
                On your phone you can use the camera directly or pick up to {MAX_PHOTOS} images
                from your gallery. Each file must be under 8 MB.
              </p>
              {form.hazardPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.hazardPhotos.map((file, i) => (
                    <PhotoPreview key={`${file.name}-${i}`} file={file} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* GPS Status */}
            <div
              role="status"
              aria-live="polite"
              className={`text-xs p-3 rounded-lg flex flex-wrap items-center gap-2 ${
                !locationEnabled
                  ? "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                  : hasCoords
                    ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                    : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
              }`}
            >
              {!locationEnabled ? (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>
                    Location access is off — this report will be filed without GPS coordinates.
                  </span>
                  <button
                    type="button"
                    onClick={handleEnableLocation}
                    className="ml-auto px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Enable Location
                  </button>
                </>
              ) : hasCoords ? (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    GPS Location acquired:{" "}
                    <strong>
                      {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={geoLoading}
                    className="ml-auto px-3 py-1.5 text-xs font-semibold underline hover:no-underline disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </>
              ) : geoLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Acquiring GPS location... Please ensure location services are enabled.</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{geoError || "GPS location unavailable."}</span>
                  <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={geoLoading}
                    className="ml-auto px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>

            {/* Terms */}
            <label htmlFor="termsAgree" className="flex items-start gap-3 text-sm text-gray-600 dark:text-slate-300 cursor-pointer">
              <input
                id="termsAgree"
                type="checkbox"
                required
                className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600 cursor-pointer"
              />
              <span>
                I agree to the{" "}
                <Link to="/about" className="text-blue-600 dark:text-blue-400 underline">
                  Terms &amp; Conditions
                </Link>{" "}
                and authorize the use of my GPS coordinates.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Submitting Report...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Hazard Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default HazardReport;
