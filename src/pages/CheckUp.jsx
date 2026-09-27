"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import {
  HeartPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  Info,
  User,
  Shield,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   ACTOR RESOLUTION

   Database behavior:

   Resident:
     userId = profiles.user_id
     staffId = null
     reporter_name = logged-in account name

   Staff/Admin:
     userId = null
     staffId = staff_users.id
     reporter_name = manually entered reporter name

   The current schema defines:
     outPatientCheckUp.userId → profiles.user_id

   Therefore, do not insert profiles.id into userId.
   ══════════════════════════════════════════════════════════════════ */

const PROFILE_COLUMNS = [
  "id",
  "user_id",
  "full_name",
  "first_name",
  "middle_name",
  "last_name",
  "mobile_number",
  "email",
  "role",
  "is_active",
].join(", ");

const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(" ")
    .trim();

async function getAuthUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (!error && data?.user) {
      return data.user;
    }
  } catch {
    // No Supabase Auth session.
  }

  return null;
}

/* ------------------------------------------------------------------
   Resident lookup
   ------------------------------------------------------------------ */

async function lookupResident(email, authId = null) {
  // Prefer the profile ID for OAuth/authenticated users.
  if (authId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", authId)
        .maybeSingle();

      if (!error && data?.user_id) {
        return data;
      }
    } catch {
      // Try the next lookup method.
    }
  }

  // Legacy/manual login lookup by email.
  if (email) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("email", email)
        .maybeSingle();

      if (!error && data?.user_id) {
        return data;
      }
    } catch {
      // Try the RPC fallback.
    }
  }

  // RPC fallback for manually authenticated users whose auth.uid() is null.
  if (email) {
    try {
      const { data, error } = await supabase.rpc(
        "lookup_resident_identity",
        { p_email: email },
      );

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.user_id) return row;
      }
    } catch {
      // No resident profile found.
    }
  }

  return null;
}

/* ------------------------------------------------------------------
   Staff lookup
   ------------------------------------------------------------------ */

async function lookupStaff(workId, email = null) {
  if (workId) {
    try {
      const { data, error } = await supabase
        .from("staff_users")
        .select(
          "id, user_id, full_name, email, role, department, mobile_number, is_active",
        )
        .eq("user_id", workId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {
      // Try the RPC fallback.
    }
  }

  if (email) {
    try {
      const { data, error } = await supabase
        .from("staff_users")
        .select(
          "id, user_id, full_name, email, role, department, mobile_number, is_active",
        )
        .eq("email", email)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {
      // Try the RPC fallback.
    }
  }

  try {
    const { data, error } = await supabase.rpc("lookup_staff_identity", {
      p_user_id: workId,
    });

    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return row;
    }
  } catch {
    // No staff profile found.
  }

  return null;
}

/* ------------------------------------------------------------------
   Actor builders
   ------------------------------------------------------------------ */

function buildResidentActor(profile, fallback = {}, authUser = null) {
  const profileUserId = String(profile.user_id || "").trim();

  if (!profileUserId) {
    return null;
  }

  const email =
    profile.email || fallback.email || authUser?.email || "";

  const displayName =
    profile.full_name ||
    cleanName(
      profile.first_name,
      profile.middle_name,
      profile.last_name,
    ) ||
    fallback.full_name ||
    fallback.username ||
    email ||
    "Resident";

  const contact =
    profile.mobile_number ||
    fallback.mobile_number ||
    email;

  return {
    kind: "resident",
    profileId: profile.id,
    profileUserId,
    staffId: null,
    workId: "",
    displayName,
    contact,
    email,
    role: profile.role || fallback.role || "user",
    department: "",
    active: profile.is_active !== false,
  };
}

function buildStaffActor(row, localStaff = {}) {
  const workId = String(
    row.user_id || localStaff.user_id || "",
  ).trim();

  return {
    kind: "staff",
    profileId: null,
    profileUserId: null,
    staffId: row.id,
    workId,
    displayName:
      row.full_name ||
      localStaff.full_name ||
      localStaff.username ||
      row.email ||
      localStaff.email ||
      workId ||
      "Staff Member",
    contact:
      row.mobile_number ||
      localStaff.mobile_number ||
      row.email ||
      localStaff.email ||
      "",
    email: row.email || localStaff.email || "",
    role: row.role || localStaff.role || "staff",
    department: row.department || localStaff.department || "",
    active: row.is_active !== false,
  };
}

/* ------------------------------------------------------------------
   Resolve the logged-in account
   ------------------------------------------------------------------ */

async function resolveActor() {
  try {
    /*
     * Staff sessions use currentStaff and must be checked first because
     * manually authenticated staff normally do not have a Supabase Auth
     * session.
     */
    const localStaff = readLocal("currentStaff");

    if (localStaff) {
      const workId = String(
        localStaff.user_id || "",
      ).trim();

      if (!workId) {
        return {
          kind: "error",
          reason: "missing-id",
        };
      }

      const staffRow = await lookupStaff(
        workId,
        localStaff.email || null,
      );

      if (!staffRow) {
        return {
          kind: "error",
          reason: "staff-not-found",
        };
      }

      if (
        staffRow.is_active === false ||
        localStaff.is_active === false
      ) {
        return {
          kind: "error",
          reason: "staff-inactive",
        };
      }

      return buildStaffActor(staffRow, localStaff);
    }

    const localUser = readLocal("currentUser");
    const authUser = await getAuthUser();

    /*
     * Try the local resident session first. This supports legacy/manual
     * accounts that do not have a Supabase Auth session.
     */
    if (localUser) {
      const localProfile = await lookupResident(
        localUser.email || "",
      );

      if (localProfile) {
        if (localProfile.is_active === false) {
          return {
            kind: "error",
            reason: "account-inactive",
          };
        }

        const actor = buildResidentActor(
          localProfile,
          localUser,
          null,
        );

        if (actor) {
          return actor;
        }
      }
    }

    /*
     * OAuth/migrated Supabase Auth user.
     */
    if (authUser) {
      const profile = await lookupResident(
        authUser.email || "",
        authUser.id,
      );

      if (!profile) {
        return {
          kind: "error",
          reason: "profile-missing",
        };
      }

      if (profile.is_active === false) {
        return {
          kind: "error",
          reason: "account-inactive",
        };
      }

      const actor = buildResidentActor(
        profile,
        {},
        authUser,
      );

      if (actor) {
        return actor;
      }

      return {
        kind: "error",
        reason: "profile-owner-id-missing",
      };
    }

    if (localUser) {
      return {
        kind: "error",
        reason: "profile-missing",
      };
    }

    return {
      kind: "none",
    };
  } catch (err) {
    console.error("Actor resolution error:", err);

    return {
      kind: "error",
      reason: "lookup-failed",
    };
  }
}

/* ══════════════════════════════════════════════════════════════════
   FORM CONFIG
   ══════════════════════════════════════════════════════════════════ */

const INITIAL_FORM = {
  patientName: "",
  reporterName: "",
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

/*
 * Residents do not enter their own reporter name. It is populated from
 * the logged-in account.
 *
 * Staff members must enter the name of the person filing the request.
 */
function buildInitialForm(actor) {
  if (actor?.kind === "resident") {
    return {
      ...INITIAL_FORM,
      reporterName: actor.displayName || "",
      contactDetails: actor.contact || "",
    };
  }

  return {
    ...INITIAL_FORM,
  };
}

const TEXT_FIELDS = [
  {
    label: "Location / Address",
    name: "location",
    placeholder: "Barangay, purok, street",
  },
  {
    label: "Hospital Name",
    name: "hospitalName",
    placeholder: "Destination hospital",
  },
  {
    label: "Contact Details",
    name: "contactDetails",
    placeholder: "Patient phone number or email",
  },
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
    label: "Patient For",
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

const labelCls =
  "text-sm font-semibold text-gray-700 dark:text-slate-200";

const reqCls = "text-red-500";

function todayStr() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function prettyRole(role) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  if (role === "staff") return "Staff";
  return "Resident";
}

const ERROR_COPY = {
  "missing-id":
    "Your staff session is missing its work ID. Please sign out and log in again.",

  "staff-not-found":
    "Your staff account could not be verified. Ask an administrator to confirm your staff_users row.",

  "staff-inactive":
    "Your staff account has been deactivated. Contact your administrator.",

  "profile-missing":
    "We could not match your account to a resident profile. Make sure your registration was approved, then sign out and sign in again.",

  "profile-owner-id-missing":
    "Your approved profile is missing profiles.user_id. Ask an administrator to repair your profile before submitting a check-up request.",

  "account-inactive":
    "Your account has been deactivated. Contact an administrator.",

  "lookup-failed":
    "We could not verify your account right now. Please try again.",
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
  const isResident = actor?.kind === "resident";

  /* ── Resolve the current account ──────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const who = await resolveActor();

      if (cancelled) return;

      if (who.kind === "error") {
        setActor(who);
        setError(
          ERROR_COPY[who.reason] ||
            "Could not verify your account.",
        );
        setResolving(false);
        return;
      }

      setActor(who);

      if (who.kind === "resident" || who.kind === "staff") {
        setForm(buildInitialForm(who));
      }

      setResolving(false);
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Clear success message after a few seconds ───────────────── */

  useEffect(() => {
    if (!success) return undefined;

    const timeout = setTimeout(() => {
      setSuccess("");
    }, 6000);

    return () => clearTimeout(timeout);
  }, [success]);

  /* ── Form change handler ──────────────────────────────────────── */

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === "escort" && value !== "other") {
        next.specificVehicle = "";
      }

      return next;
    });
  }, []);

  /* ── Reset form ──────────────────────────────────────────────── */

  const handleReset = useCallback(() => {
    setForm(buildInitialForm(actor));
    setError("");
    setSuccess("");
  }, [actor]);

  /* ── Submit form ─────────────────────────────────────────────── */

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (submitting || resolving) return;

      setError("");
      setSuccess("");

      if (
        !actor ||
        actor.kind === "none" ||
        actor.kind === "error"
      ) {
        setError(
          "You must be signed in to submit a check-up request.",
        );
        return;
      }

      const patientName = form.patientName.trim();

      /*
       * Resident:
       *   Reporter name and user ID come from the logged-in account.
       *
       * Staff:
       *   Reporter name must be manually entered.
       */
      const reporterName = isStaff
        ? form.reporterName.trim()
        : String(actor.displayName || "").trim();

      if (!patientName) {
        setError("Patient name is required.");
        return;
      }

      if (!reporterName) {
        setError(
          isStaff
            ? "Reporter name is required."
            : "Your account name could not be determined.",
        );
        return;
      }

      if (isStaff && !actor.staffId) {
        setError(
          "Your staff account ID could not be determined.",
        );
        return;
      }

      if (isResident && !actor.profileUserId) {
        setError(
          "Your resident profile ID could not be determined.",
        );
        return;
      }

      setSubmitting(true);

      try {
        const finalEscort =
          form.escort === "other"
            ? form.specificVehicle.trim() || "Other"
            : form.escort;

        const checkUpRequest = {
          patientName,
          reporter_name: reporterName,

          location: form.location.trim(),
          hospitalName: form.hospitalName.trim(),
          contactDetails: form.contactDetails.trim(),
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          mobility: form.mobility,
          patientFor: form.patientFor,
          escort: finalEscort,

          status: "Pending",

          /*
           * Resident:
           *   profiles.user_id is the foreign-key target.
           *
           * Staff:
           *   userId is null.
           */
          userId: isStaff ? null : actor.profileUserId,

          /*
           * Staff/Admin:
           *   staff_users.id is an integer/bigint.
           *
           * Resident:
           *   staffId is null.
           */
          staffId: isStaff ? actor.staffId : null,
        };

        const { data, error: insertError } = await supabase
          .from("outPatientCheckUp")
          .insert([checkUpRequest])
          .select("id")
          .single();

        if (insertError) {
          if (
            insertError.message?.includes("reporter_name")
          ) {
            throw new Error(
              "The database is missing the reporter_name column. Run the required ALTER TABLE migration first.",
            );
          }

          throw new Error(insertError.message);
        }

        setSuccess(
          `Check-up request #${data?.id ?? "—"} submitted successfully. ` +
            "It is now in the administrator queue for review.",
        );

        setForm(buildInitialForm(actor));

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new Event("mdrrmo:notif-refresh"),
          );
        }
      } catch (submitError) {
        console.error(
          "Check-up submit error:",
          submitError,
        );

        setError(
          submitError?.message ||
            "Failed to submit the check-up request.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      actor,
      form,
      isResident,
      isStaff,
      resolving,
      submitting,
    ],
  );

  /* ── Loading state ───────────────────────────────────────────── */

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

  /* ── Signed-out or invalid account state ─────────────────────── */

  if (
    !actor ||
    actor.kind === "none" ||
    actor.kind === "error"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-xl p-8 text-center">
          <HeartPlus className="h-12 h-12 text-red-500 mx-auto mb-4" />

          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
            {actor?.kind === "none"
              ? "Sign in required"
              : "Account not ready"}
          </h2>

          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            {error ||
              "You need an approved account before submitting a check-up request."}
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

  /* ── Form ────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen pt-10 pb-16 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl px-5 pt-6 pb-5">
          <div className="flex flex-col items-center text-center">
            <HeartPlus className="h-12 w-12 text-white mb-2" />

            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Out Patient Check Up
            </h1>

            <p className="text-white/90 text-xs sm:text-sm mt-1">
              Fields marked{" "}
              <span className="text-red-300">*</span> are required for
              assessment.
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
                    Filing on behalf of a patient ·{" "}
                    {prettyRole(actor.role)}
                    {actor.department
                      ? ` · ${actor.department}`
                      : ""}
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
                You are signed in as {prettyRole(actor.role)}.
                Enter the patient name and the name of the person
                filing this request as the reporter. Your staff account
                will also be linked to the submission.
              </p>
            </div>
          )}

          {!isStaff && (
            <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-5">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />

              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                Your reporter name and account ID are attached
                automatically. You only need to enter the patient
                information below.
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

              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                {success}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Patient name */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="patientName"
                className={labelCls}
              >
                Patient Name{" "}
                <span className={reqCls}>*</span>
              </label>

              <input
                id="patientName"
                name="patientName"
                value={form.patientName}
                onChange={handleChange}
                placeholder="Full name of the patient"
                className={inputCls}
                autoComplete="name"
                required
              />
            </div>

            {/* Reporter name */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reporterName"
                className={labelCls}
              >
                Reporter Name{" "}
                {isStaff && (
                  <span className={reqCls}>*</span>
                )}
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                <input
                  id="reporterName"
                  name="reporterName"
                  value={
                    isStaff
                      ? form.reporterName
                      : actor.displayName
                  }
                  onChange={handleChange}
                  placeholder={
                    isStaff
                      ? "Enter the reporter's full name"
                      : "Automatically taken from your account"
                  }
                  className={`${inputCls} pl-10 ${
                    isStaff
                      ? ""
                      : "bg-gray-100 dark:bg-slate-900 cursor-not-allowed"
                  }`}
                  readOnly={!isStaff}
                  tabIndex={isStaff ? 0 : -1}
                  required={isStaff}
                  aria-readonly={!isStaff}
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isStaff
                  ? `The request will also be linked to staff ID #${actor.staffId}.`
                  : `Automatically linked to account ID: ${actor.profileUserId}`}
              </p>
            </div>

            {/* Location, hospital, and contact */}

            {TEXT_FIELDS.map((field) => (
              <div
                key={field.name}
                className="flex flex-col gap-1.5 md:col-span-2"
              >
                <label
                  htmlFor={field.name}
                  className={labelCls}
                >
                  {field.label}{" "}
                  <span className={reqCls}>*</span>
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

            {/* Preferred date */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="preferredDate"
                className={labelCls}
              >
                Preferred Date{" "}
                <span className={reqCls}>*</span>
              </label>

              <input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={form.preferredDate}
                onChange={handleChange}
                min={todayStr()}
                className={inputCls}
                required
              />
            </div>

            {/* Preferred time */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="preferredTime"
                className={labelCls}
              >
                Preferred Time{" "}
                <span className={reqCls}>*</span>
              </label>

              <input
                id="preferredTime"
                name="preferredTime"
                type="time"
                value={form.preferredTime}
                onChange={handleChange}
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Select fields */}

          <div className="mt-5 space-y-5">
            {SELECT_FIELDS.map((field) => (
              <div
                key={field.name}
                className="flex flex-col gap-1.5"
              >
                <label
                  htmlFor={field.name}
                  className={labelCls}
                >
                  {field.label}{" "}
                  <span className={reqCls}>*</span>
                </label>

                <select
                  id={field.name}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className={inputCls}
                  required
                >
                  <option value="">
                    Select an Option
                  </option>

                  {field.options.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {form.escort === "other" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="specificVehicle"
                  className={labelCls}
                >
                  Specify Escort/Vehicle{" "}
                  <span className={reqCls}>*</span>
                </label>

                <input
                  id="specificVehicle"
                  name="specificVehicle"
                  value={form.specificVehicle}
                  onChange={handleChange}
                  placeholder="e.g. Private ambulance or motorcycle with sidecar"
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
