"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  Ambulance,
  Building2,
  CalendarDays,
  Clock3,
  HeartPlus,
  Info,
  Loader2,
  LogIn,
  MapPin,
  Phone,
  Shield,
  User,
} from "lucide-react";

import { supabase } from "../createClient";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

/* ══════════════════════════════════════════════════════════════════
   ACTOR RESOLUTION

   Resident:
     userId = profiles.user_id
     staffId = null
     reporter_name = logged-in account name

   Staff/Admin:
     userId = null
     staffId = staff_users.id
     reporter_name = manually entered reporter name

   outPatientCheckUp.userId references profiles.user_id.
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

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
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

async function lookupResident(email, authId = null) {
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

  if (email) {
    try {
      const { data, error } = await supabase.rpc(
        "lookup_resident_identity",
        {
          p_email: email,
        },
      );

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;

        if (row?.user_id) {
          return row;
        }
      }
    } catch {
      // No resident profile found.
    }
  }

  return null;
}

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
    const { data, error } = await supabase.rpc(
      "lookup_staff_identity",
      {
        p_user_id: workId,
      },
    );

    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;

      if (row) {
        return row;
      }
    }
  } catch {
    // No staff profile found.
  }

  return null;
}

function buildResidentActor(
  profile,
  fallback = {},
  authUser = null,
) {
  const profileUserId = String(
    profile.user_id || "",
  ).trim();

  if (!profileUserId) {
    return null;
  }

  const email =
    profile.email ||
    fallback.email ||
    authUser?.email ||
    "";

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
    role:
      profile.role ||
      fallback.role ||
      "user",
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
    email:
      row.email ||
      localStaff.email ||
      "",
    role:
      row.role ||
      localStaff.role ||
      "staff",
    department:
      row.department ||
      localStaff.department ||
      "",
    active: row.is_active !== false,
  };
}

async function resolveActor() {
  try {
    /*
     * Staff sessions use currentStaff and must be checked first
     * because manually authenticated staff normally do not have
     * a Supabase Auth session.
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
     * Try the local resident session first.
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
     * OAuth or migrated Supabase Auth user.
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
  } catch (error) {
    console.error(
      "Actor resolution error:",
      error,
    );

    return {
      kind: "error",
      reason: "lookup-failed",
    };
  }
}

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
    placeholder:
      "Barangay, purok, street, or landmark",
    autoComplete: "street-address",
  },
  {
    label: "Hospital Name",
    name: "hospitalName",
    placeholder:
      "Enter the destination hospital",
    autoComplete: "organization",
  },
  {
    label: "Patient Contact Details",
    name: "contactDetails",
    placeholder:
      "Patient phone number or email",
    autoComplete: "tel",
  },
];

const SELECT_FIELDS = [
  {
    label: "Mobility Requirement",
    name: "mobility",
    options: [
      {
        value: "stretcher",
        label: "Stretcher",
      },
      {
        value: "wheel-chair",
        label: "Wheel Chair",
      },
      {
        value: "walker",
        label: "Walker",
      },
    ],
  },
  {
    label: "Patient For",
    name: "patientFor",
    options: [
      {
        value: "admission",
        label: "Admission",
      },
      {
        value: "discharge",
        label: "Discharge",
      },
      {
        value: "check-up",
        label: "Check Up",
      },
    ],
  },
  {
    label: "Escort / Vehicle",
    name: "escort",
    options: [
      {
        value: "medical",
        label: "Medical Vehicle",
      },
      {
        value: "family",
        label: "Family Vehicle",
      },
      {
        value: "other",
        label: "Other — specify below",
      },
    ],
  },
];

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

export default function CheckUp() {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [actor, setActor] =
    useState(null);

  const [resolving, setResolving] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const isStaff = actor?.kind === "staff";
  const isResident =
    actor?.kind === "resident";

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const who = await resolveActor();

      if (cancelled) {
        return;
      }

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

      if (
        who.kind === "resident" ||
        who.kind === "staff"
      ) {
        setForm(
          buildInitialForm(who),
        );
      }

      setResolving(false);
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setSuccess("");
    }, 7000);

    return () => clearTimeout(timeout);
  }, [success]);

  const handleChange = useCallback(
    (event) => {
      const { name, value } = event.target;

      setForm((previous) => {
        const next = {
          ...previous,
          [name]: value,
        };

        if (
          name === "escort" &&
          value !== "other"
        ) {
          next.specificVehicle = "";
        }

        return next;
      });

      setSuccess("");
    },
    [],
  );

  const handleReset = useCallback(() => {
    setForm(buildInitialForm(actor));
    setError("");
    setSuccess("");
  }, [actor]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (submitting || resolving) {
        return;
      }

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

      const patientName =
        form.patientName.trim();

      const reporterName = isStaff
        ? form.reporterName.trim()
        : String(
            actor.displayName || "",
          ).trim();

      if (!patientName) {
        setError(
          "Patient name is required.",
        );

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

      if (
        isResident &&
        !actor.profileUserId
      ) {
        setError(
          "Your resident profile ID could not be determined.",
        );

        return;
      }

      setSubmitting(true);

      try {
        const finalEscort =
          form.escort === "other"
            ? form.specificVehicle.trim() ||
              "Other"
            : form.escort;

        const checkUpRequest = {
          patientName,
          reporter_name: reporterName,

          location: form.location.trim(),
          hospitalName:
            form.hospitalName.trim(),
          contactDetails:
            form.contactDetails.trim(),
          preferredDate:
            form.preferredDate,
          preferredTime:
            form.preferredTime,
          mobility: form.mobility,
          patientFor: form.patientFor,
          escort: finalEscort,

          status: "Pending",

          /*
           * Resident:
           *   profiles.user_id is the FK target.
           *
           * Staff:
           *   userId is null.
           */
          userId: isStaff
            ? null
            : actor.profileUserId,

          /*
           * Staff/Admin:
           *   staff_users.id is the FK target.
           *
           * Resident:
           *   staffId is null.
           */
          staffId: isStaff
            ? actor.staffId
            : null,
        };

        const { data, error: insertError } =
          await supabase
            .from("outPatientCheckUp")
            .insert([checkUpRequest])
            .select("id")
            .single();

        if (insertError) {
          if (
            insertError.message?.includes(
              "reporter_name",
            )
          ) {
            throw new Error(
              "The database is missing the reporter_name column. Run the required ALTER TABLE migration first.",
            );
          }

          throw new Error(
            insertError.message,
          );
        }

        setSuccess(
          `Check-up request #${data?.id ?? "—"} submitted successfully. It is now in the administrator queue for review.`,
        );

        setForm(
          buildInitialForm(actor),
        );

        window.dispatchEvent(
          new Event(
            "mdrrmo:notif-refresh",
          ),
        );
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

  if (resolving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Checking your account...
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Please wait while we verify your request identity.
          </p>
        </div>
      </div>
    );
  }

  if (
    !actor ||
    actor.kind === "none" ||
    actor.kind === "error"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-2 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600" />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50">
              <HeartPlus className="h-8 w-8 text-rose-600" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              {actor?.kind === "none"
                ? "Sign in required"
                : "Account not ready"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "You need an approved account before submitting a check-up request."}
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RequestFormShell
      icon={HeartPlus}
      eyebrow="Community Health Service"
      title="Outpatient Check-Up Request"
      description="Provide the patient's travel and care requirements so MDRRMO personnel can prepare the appropriate response."
      account={{
        name: actor.displayName,
        detail:
          actor.contact ||
          "No contact number available",
        badge: isStaff
          ? prettyRole(actor.role)
          : "Resident",
      }}
      onSubmit={handleSubmit}
      onReset={handleReset}
      error={error}
      success={success}
      submitting={submitting}
      submitLabel="Submit Check-Up Request"
      footerNote={
        isStaff
          ? "Staff submissions are reviewed by an administrator before the patient is scheduled."
          : "You will be notified once an administrator reviews your request."
      }
    >
      {isStaff ? (
        <div className="mb-7 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <p className="text-xs leading-6">
            You are signed in as {prettyRole(actor.role)}. Enter the patient name and the name of the person filing this request. Your staff account will be linked automatically.
          </p>
        </div>
      ) : (
        <div className="mb-7 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
          <User className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <p className="text-xs leading-6">
            Your reporter name and account ID are attached automatically. You only need to provide the patient and request information.
          </p>
        </div>
      )}

      <section>
        <FormSectionHeading
          icon={User}
          step="01"
          title="Patient & Reporter"
          description="Confirm who the patient is and who is filing this request."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="patientName"
            label="Patient Name"
            required
          >
            <input
              id="patientName"
              name="patientName"
              value={form.patientName}
              onChange={handleChange}
              placeholder="Full name of the patient"
              className={FORM_INPUT_CLASS}
              autoComplete="name"
              required
            />
          </FormField>

          <FormField
            id="reporterName"
            label="Reporter Name"
            required={isStaff}
            hint={
              isStaff
                ? `This request will be linked to staff ID #${actor.staffId}.`
                : `Automatically linked to account ID: ${actor.profileUserId}`
            }
          >
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                className={`${FORM_INPUT_CLASS} pl-11 ${
                  isStaff
                    ? ""
                    : "cursor-not-allowed bg-slate-200 dark:bg-slate-800"
                }`}
                readOnly={!isStaff}
                tabIndex={
                  isStaff ? 0 : -1
                }
                required={isStaff}
                aria-readonly={!isStaff}
              />
            </div>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={MapPin}
          step="02"
          title="Location & Destination"
          description="Tell us where the patient is located and where they need to go."
        />

        <div className="grid gap-5">
          {TEXT_FIELDS.map((field) => (
            <FormField
              key={field.name}
              id={field.name}
              label={field.label}
              required
            >
              <div className="relative">
                {field.name === "location" && (
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}

                {field.name === "hospitalName" && (
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}

                {field.name ===
                  "contactDetails" && (
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}

                <input
                  id={field.name}
                  name={field.name}
                  value={
                    form[field.name]
                  }
                  onChange={handleChange}
                  placeholder={
                    field.placeholder
                  }
                  autoComplete={
                    field.autoComplete
                  }
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                />
              </div>
            </FormField>
          ))}
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={CalendarDays}
          step="03"
          title="Preferred Schedule"
          description="Choose the preferred date and time for the patient."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="preferredDate"
            label="Preferred Date"
            required
          >
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={form.preferredDate}
                onChange={handleChange}
                min={todayStr()}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="preferredTime"
            label="Preferred Time"
            required
          >
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="preferredTime"
                name="preferredTime"
                type="time"
                value={form.preferredTime}
                onChange={handleChange}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={Accessibility}
          step="04"
          title="Mobility & Assistance"
          description="Select the support and escort required for the patient."
        />

        <div className="grid gap-5 md:grid-cols-2">
          {SELECT_FIELDS.map((field) => (
            <FormField
              key={field.name}
              id={field.name}
              label={field.label}
              required
              className={
                field.name === "escort"
                  ? "md:col-span-2"
                  : ""
              }
            >
              <div className="relative">
                {field.name === "mobility" && (
                  <Accessibility className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}

                {field.name === "escort" && (
                  <Ambulance className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}

                <select
                  id={field.name}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                >
                  <option value="">
                    Select an option
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
            </FormField>
          ))}
        </div>

        {form.escort === "other" && (
          <div className="mt-5">
            <FormField
              id="specificVehicle"
              label="Specify Escort / Vehicle"
              required
            >
              <div className="relative">
                <Ambulance className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="specificVehicle"
                  name="specificVehicle"
                  value={form.specificVehicle}
                  onChange={handleChange}
                  placeholder="e.g. Private ambulance or motorcycle with sidecar"
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                />
              </div>
            </FormField>
          </div>
        )}
      </section>
    </RequestFormShell>
  );
}
