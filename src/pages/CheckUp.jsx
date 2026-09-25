"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import {
  HeartPlus, AlertCircle, CheckCircle2, Loader2, RotateCcw,
  Send, Info, User, Shield,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   ACTOR RESOLUTION
   ──────────────────────────────────────────────────────────────────
   outPatientCheckUp.userId is plain text with NO foreign key, and
   staffId is int8. So we need exactly one correct identifier per
   account type — not a speculative list of candidates.

     resident -> userId  = profiles.id  (uuid as text)
     staff    -> staffId = staff_users.id (int8), userId = null

   This mirrors borrow-vehicle and borrower_slip exactly, so
   /track, the notification engine, and the admin joins all line up.
   ══════════════════════════════════════════════════════════════════ */

const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join(" ")
    .trim();

async function resolveActor() {
  // ── 1. Supabase Auth (OAuth, or migrated accounts) ──────────────
  let authUser = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) authUser = data.user;
  } catch {
    /* no session — continue */
  }

  if (authUser) {
    const byId = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, mobile_number, is_active")
      .eq("id", authUser.id)
      .maybeSingle();

    const p = byId.data || (await lookupResident(authUser.email));
    if (p) {
      return {
        kind: "resident",
        residentId: p.id,
        staffId: null,
        displayName:
          p.full_name || cleanName(p.first_name, p.last_name) || authUser.email,
        contact: p.mobile_number || authUser.email || "",
        email: authUser.email || "",
        role: "user",
        department: "",
        active: p.is_active !== false,
      };
    }
  }

  // ── 2. Staff / admin (manual login -> currentStaff) ──────────────
  const staff = readLocal("currentStaff");
  if (staff) {
    const workId = staff.user_id || staff.id;
    if (!workId) {
      return { kind: "error", reason: "missing-id" };
    }

    const row = await lookupStaff(workId);
    if (!row) {
      return { kind: "error", reason: "staff-not-found" };
    }
    if (row.is_active === false) {
      return { kind: "error", reason: "staff-inactive" };
    }

    return {
      kind: "staff",
      residentId: null,
      staffId: row.id,
      displayName: row.full_name || staff.full_name || staff.user_id,
      contact: row.mobile_number || staff.mobile_number || row.email || "",
      email: row.email || staff.email || "",
      role: row.role || staff.role || "staff",
      department: row.department || staff.department || "",
      active: true,
    };
  }

  // ── 3. Resident (manual login -> currentUser) ───────────────────
  const user = readLocal("currentUser");
  if (user) {
    const email = user.email || "";
    if (email.endsWith("@local.user") && !authUser) {
      // Legacy password accounts were created with a synthetic email and
      // have no Supabase auth session. They cannot be resolved safely.
      return { kind: "error", reason: "legacy-account" };
    }

    const p = authUser ? null : await lookupResident(email);
    if (p) {
      return {
        kind: "resident",
        residentId: p.id,
        staffId: null,
        displayName:
          p.full_name ||
          cleanName(user.first_name, user.middle_name, user.last_name) ||
          email,
        contact: p.mobile_number || user.mobile_number || "",
        email,
        role: user.role || "user",
        department: "",
        active: p.is_active !== false,
      };
    }

    return { kind: "error", reason: "profile-missing" };
  }

  return { kind: "none" };
}

/* Profile lookup: try the table first, fall back to the RPC.
   The RPC is what works for manual-login users, whose auth.uid() is
   null and who therefore fail every direct RLS check. */
async function lookupResident(email) {
  if (!email) return null;
  try {
    const direct = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, mobile_number, is_active")
      .eq("email", email)
      .maybeSingle();
    if (direct.data) return direct.data;
  } catch {
    /* fall through to RPC */
  }
  try {
    const { data, error } = await supabase.rpc("lookup_resident_identity", {
      p_email: email,
    });
    if (!error && data && data.length) return data[0];
  } catch {
    /* no access */
  }
  return null;
}

async function lookupStaff(workId) {
  if (!workId) return null;
  try {
    const direct = await supabase
      .from("staff_users")
      .select("id, full_name, email, role, department, mobile_number, is_active")
      .eq("user_id", workId)
      .maybeSingle();
    if (direct.data) return direct.data;
  } catch {
    /* fall through to RPC */
  }
  try {
    const { data, error } = await supabase.rpc("lookup_staff_identity", {
      p_user_id: workId,
    });
    if (!error && data && data.length) return data[0];
  } catch {
    /* no access */
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   FORM CONFIG
   ══════════════════════════════════════════════════════════════════ */

const INITIAL_FORM = {
  patientName: "",
  location: "",
  hospitalName: "",
  contactDetails: "",
  preferredDate: "",
  preferredTime: "",
  mobility: "",
  patientFor: "",
  specificVehicle: "",
  escort: "",
};

const TEXT_FIELDS = [
  { label: "Patient Name", name: "patientName", placeholder: "Full name of the patient" },
  { label: "Location / Address", name: "location", placeholder: "Barangay, purok, street" },
  { label: "Hospital Name", name: "hospitalName", placeholder: "Destination hospital" },
  { label: "Contact Details", name: "contactDetails", placeholder: "Phone number or email" },
];

const SELECT_FIELDS = [
  {
    label: "Mobility",
    name: "mobility",
    options: [
      { value: "stretcher", label: "Stretcher" },
      { value: "wheel-chair", label: "Wheel Chair" },
      { value: "walker", label: "Walker" },
    ],
  },
  {
    label: "Patient for",
    name: "patientFor",
    options: [
      { value: "admission", label: "Admission" },
      { value: "discharge", label: "Discharge" },
      { value: "check-up", label: "Check Up" },
    ],
  },
  {
    label: "Escort / Vehicle",
    name: "escort",
    options: [
      { value: "medical", label: "Medical" },
      { value: "family", label: "Family" },
      { value: "other", label: "Other (specify below)" },
    ],
  },
];

const inputCls =
  "w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-400 dark:placeholder:text-slate-500";

const labelCls = "text-sm font-semibold text-gray-700 dark:text-slate-200";
const reqCls = "text-red-500";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const prettyRole = (role) => {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  if (role === "staff") return "Staff";
  return "Resident";
};

const ERROR_COPY = {
  "missing-id":
    "Your staff session is missing its work ID. Please sign out and log in again.",
  "staff-not-found":
    "Your staff account could not be found. Ask an administrator to confirm your staff_users row.",
  "staff-inactive":
    "Your staff account has been deactivated. Contact your administrator.",
  "legacy-account":
    "Accounts created with a username and password need to be migrated to Supabase Auth before they can submit requests. Please sign in with Google instead, or ask an administrator to migrate your account.",
  "profile-missing":
    "We could not match your account to a resident profile. Please make sure your registration was approved, then sign out and back in.",
};

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function CheckUp() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [actor, setActor] = useState(null);
  const [resolving, setResolving] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isStaff = actor?.kind === "staff";
  const isHandler = isStaff || actor?.kind === "resident";

  /* ── Resolve on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const who = await resolveActor();
      if (cancelled) return;

      if (who.kind === "error") {
        setError(ERROR_COPY[who.reason] || "Could not verify your account.");
        setActor(who);
        setResolving(false);
        return;
      }

      setActor(who);
      // Residents file for themselves, so prefill their name and contact.
      // Staff file on behalf of a patient, so both stay blank.
      if (who.kind === "resident") {
        setForm((prev) => ({
          ...prev,
          patientName: prev.patientName || who.displayName,
          contactDetails: prev.contactDetails || who.contact,
        }));
      }
      setResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Toast auto-dismiss ────────────────────────────────────────── */
  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(""), 6000);
    return () => clearTimeout(t);
  }, [success]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "escort" && value !== "other") next.specificVehicle = "";
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      ...(actor?.kind === "resident"
        ? { patientName: actor.displayName, contactDetails: actor.contact }
        : {}),
    });
    setError("");
    setSuccess("");
  }, [actor]);

  /* ── Submit ────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (submitting || resolving) return;

      setError("");
      setSuccess("");

      if (!actor || actor.kind === "none" || actor.kind === "error") {
        setError("You must be signed in to submit a check-up request.");
        return;
      }

      setSubmitting(true);

      try {
        const finalEscort =
          form.escort === "other"
            ? form.specificVehicle.trim() || "Other"
            : form.escort;

        const base = {
          patientName: form.patientName.trim(),
          location: form.location.trim(),
          hospitalName: form.hospitalName.trim(),
          contactDetails: form.contactDetails.trim(),
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          mobility: form.mobility,
          patientFor: form.patientFor,
          escort: finalEscort,
          // Capital P — this is what checkUpTable.jsx filters on
          status: "Pending",
          // resident -> profiles.id as text; staff -> null + staffId
          userId: actor.residentId ?? null,
          staffId: actor.staffId ?? null,
        };

        let { data, error: insertError } = await supabase
          .from("outPatientCheckUp")
          .insert([base])
          .select("id")
          .single();

        // Tolerate a not-yet-migrated schema: retry without staffId.
        if (
          insertError &&
          /staffId|staff_id/i.test(insertError.message || "")
        ) {
          const { staffId: _omit, ...withoutStaff } = base;
          const retry = await supabase
            .from("outPatientCheckUp")
            .insert([withoutStaff])
            .select("id")
            .single();
          data = retry.data;
          insertError = retry.error;
        }

        if (insertError) throw new Error(insertError.message);

        setSuccess(
          `Check-up request #${data?.id ?? "—"} submitted successfully. ` +
            (isHandler
              ? "It is now in the admin queue for review."
              : "An administrator will review it shortly.")
        );

        setForm({
          ...INITIAL_FORM,
          ...(actor.kind === "resident"
            ? { patientName: actor.displayName, contactDetails: actor.contact }
            : {}),
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("mdrrmo:notif-refresh"));
        }
      } catch (err) {
        console.error("Check-up submit error:", err);
        setError(
          `Failed to submit: ${err?.message || "unknown error"}`
        );
      } finally {
        setSubmitting(false);
      }
    },
    [actor, form, submitting, resolving, isHandler]
  );

  /* ── RENDER: loading ───────────────────────────────────────────── */
  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400 font-semibold">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  /* ── RENDER: signed out / unresolvable ─────────────────────────── */
  if (!actor || actor.kind === "none" || actor.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-xl p-8 text-center">
          <HeartPlus className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
            {actor?.kind === "none" ? "Sign in required" : "Account not ready"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            {error || "You need an account before submitting a check-up request."}
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  /* ── RENDER: form ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pt-10 pb-16 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl px-5 pt-6 pb-5">
          <div className="flex flex-col items-center text-center">
            <HeartPlus className="h-12 w-12 text-white mb-2" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Out Patient Check Up
            </h1>
            <p className="text-white/90 text-xs sm:text-sm mt-1">
              Fields marked <span className="text-red-300">*</span> are required for assessment.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
            <span className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
              {(actor.displayName || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-bold truncate">
                {actor.displayName}
              </p>
              <p className="text-white/75 text-[11px] flex items-center gap-1">
                {isStaff ? (
                  <>
                    <Shield className="h-3 w-3" />
                    Filing on behalf of a patient · {prettyRole(actor.role)}
                    {actor.department ? ` · ${actor.department}` : ""}
                  </>
                ) : (
                  "Submitting your own request"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 px-5 sm:px-8 py-6 rounded-b-3xl shadow-xl border border-t-0 border-gray-200 dark:border-slate-700"
        >
          {isStaff && (
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-5">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                You are signed in as {prettyRole(actor.role)}. The patient name
                and contact are required and are not auto-filled. Your request
                will appear in the admin queue for review.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {error}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 mb-5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  {success}
                </p>
               
              </div>
            </div>
          )}

          {/* Text fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TEXT_FIELDS.map((field) => (
              <div
                key={field.name}
                className="flex flex-col gap-1.5 md:col-span-2"
              >
                <label htmlFor={field.name} className={labelCls}>
                  {field.label} <span className={reqCls}>*</span>
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={inputCls}
                  required
                />
              </div>
            ))}

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preferredDate" className={labelCls}>
                Preferred Date <span className={reqCls}>*</span>
              </label>
              <input
                id="preferredDate"
                type="date"
                name="preferredDate"
                value={form.preferredDate}
                onChange={handleChange}
                min={todayStr()}
                className={inputCls}
                required
              />
            </div>

            {/* Time */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preferredTime" className={labelCls}>
                Preferred Time <span className={reqCls}>*</span>
              </label>
              <input
                id="preferredTime"
                type="time"
                name="preferredTime"
                value={form.preferredTime}
                onChange={handleChange}
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Selects */}
          <div className="mt-5 space-y-5">
            {SELECT_FIELDS.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label htmlFor={field.name} className={labelCls}>
                  {field.label} <span className={reqCls}>*</span>
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select an Option</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {form.escort === "other" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="specificVehicle" className={labelCls}>
                  Specify Escort/Vehicle <span className={reqCls}>*</span>
                </label>
                <input
                  id="specificVehicle"
                  name="specificVehicle"
                  value={form.specificVehicle}
                  onChange={handleChange}
                  placeholder="e.g. Private ambulance, motorcycle with sidecar..."
                  className={inputCls}
                  required
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="sm:w-auto px-5 py-4 border border-gray-300 dark:border-slate-600 rounded-2xl text-gray-700 dark:text-slate-200 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>

            <button
              type="submit"
              disabled={submitting || resolving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-5">
          {isStaff
            ? "Staff submissions are reviewed by an administrator before the patient is scheduled."
            : "You will be notified once an administrator reviews your request."}
        </p>
      </div>
    </div>
  );
}
