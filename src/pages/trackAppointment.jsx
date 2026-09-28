"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Activity,
  Ambulance,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  Clock,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Stethoscope,
  TriangleAlert,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../createClient";

/* ══════════════════════════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════════════════════════ */

const REQUEST_GRADIENT =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

/* ══════════════════════════════════════════════════════════════════
   STATUS CONFIGURATION
   ══════════════════════════════════════════════════════════════════ */

const STATUS_META = {
  pending: {
    label: "Pending Review",
    tone: "amber",
    icon: Clock,
  },

  approved: {
    label: "Approved",
    tone: "emerald",
    icon: CheckCircle,
  },

  confirmed: {
    label: "Confirmed",
    tone: "blue",
    icon: CheckCircle,
  },

  active: {
    label: "Active",
    tone: "blue",
    icon: Activity,
  },

  "in progress": {
    label: "In Progress",
    tone: "blue",
    icon: Activity,
  },

  dispatched: {
    label: "Dispatched",
    tone: "indigo",
    icon: Ambulance,
  },

  ongoing: {
    label: "Ongoing",
    tone: "blue",
    icon: Activity,
  },

  resolved: {
    label: "Resolved",
    tone: "emerald",
    icon: CheckCircle,
  },

  completed: {
    label: "Completed",
    tone: "emerald",
    icon: CheckCircle,
  },

  rejected: {
    label: "Rejected",
    tone: "red",
    icon: XCircle,
  },

  declined: {
    label: "Declined",
    tone: "red",
    icon: XCircle,
  },

  cancelled: {
    label: "Cancelled",
    tone: "slate",
    icon: XCircle,
  },

  canceled: {
    label: "Cancelled",
    tone: "slate",
    icon: XCircle,
  },
};

const TONE_CLASSES = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",

  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",

  blue:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",

  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",

  red:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",

  slate:
    "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const prettyStatus = (value) => {
  const status = String(value || "Unknown").trim();

  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
};

const statusMeta = (value) => {
  const key = normalizeStatus(value);

  return (
    STATUS_META[key] || {
      label: prettyStatus(value),
      tone: "slate",
      icon: Clock,
    }
  );
};

const OPEN_STATUSES = new Set([
  "pending",
  "approved",
  "confirmed",
  "active",
  "in progress",
  "dispatched",
  "ongoing",
]);

const DONE_STATUSES = new Set([
  "resolved",
  "completed",
]);

const ATTENTION_STATUSES = new Set([
  "rejected",
  "declined",
  "cancelled",
  "canceled",
]);

/* ══════════════════════════════════════════════════════════════════
   REQUEST TYPE CONFIGURATION
   ══════════════════════════════════════════════════════════════════ */

const KIND_META = {
  appointment: {
    label: "Appointment",
    plural: "Appointments",
    icon: CalendarDays,
    route: "/appointment",
    action: "Book Appointment",
    gradient: "from-blue-600 to-blue-600",
    soft:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  },

  incident: {
    label: "Incident",
    plural: "Incidents",
    icon: Siren,
    route: "/report",
    action: "Report Incident",
    gradient: "from-red-600 to-orange-500",
    soft:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },

  borrow: {
    label: "Vehicle",
    plural: "Vehicles",
    icon: Ambulance,
    route: "/borrow",
    action: "Request Vehicle",
    gradient: "from-emerald-600 to-teal-500",
    soft:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },

  checkup: {
    label: "Check-Up",
    plural: "Check-Ups",
    icon: Stethoscope,
    route: "/checkup",
    action: "Request Check-Up",
    gradient: "from-cyan-600 to-blue-600",
    soft:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300",
  },

  hazard: {
    label: "Hazard",
    plural: "Hazards",
    icon: TriangleAlert,
    route: "/hazard-report",
    action: "Report Hazard",
    gradient: "from-violet-600 to-purple-600",
    soft:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
  },
};

/* ══════════════════════════════════════════════════════════════════
   DATE AND TIME HELPERS
   ══════════════════════════════════════════════════════════════════ */

const toKey = (value) =>
  value
    ? String(value).split("T")[0]
    : "";

const formatDateLong = (value) => {
  const key = toKey(value);

  if (!key) {
    return "Date not set";
  }

  const match = key.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  );

  if (!match) {
    return key;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (Number.isNaN(date.getTime())) {
    return key;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const to12h = (time) => {
  if (!time) {
    return "";
  }

  const raw = String(time).trim();

  const match = raw.match(
    /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(am|pm)?/i,
  );

  if (!match) {
    return raw;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = match[3]?.toLowerCase();

  if (suffix === "pm" && hour < 12) {
    hour += 12;
  }

  if (suffix === "am" && hour === 12) {
    hour = 0;
  }

  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${minute} ${period}`;
};

const timestampOf = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
};

const localDateTimestamp = (value) => {
  const key = toKey(value);

  if (!key) {
    return 0;
  }

  const match = key.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  );

  if (!match) {
    return timestampOf(value);
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).getTime();
};

const timeAgo = (value) => {
  const timestamp = timestampOf(value);

  if (!timestamp) {
    return "";
  }

  const difference = Date.now() - timestamp;

  if (difference <= 0) {
    return "just now";
  }

  const minutes = Math.floor(
    difference / (1000 * 60),
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days}d ago`;
  }

  return new Date(value).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
};

const phoneDigits = (value) =>
  String(value || "").replace(/\D/g, "");

const cleanText = (value) =>
  String(value || "").trim();

const sentenceCase = (value) => {
  const text = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
};

/* ══════════════════════════════════════════════════════════════════
   LOCAL SESSION HELPERS
   ══════════════════════════════════════════════════════════════════ */

const readLocalSession = (key) => {
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

/* ══════════════════════════════════════════════════════════════════
   IDENTITY RESOLUTION
   ══════════════════════════════════════════════════════════════════ */

const resolveIdentity = async () => {
  const ids = new Set();

  const addId = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return;
    }

    ids.add(String(value));
  };

  let authId = null;
  let pendingId = null;
  let profileId = null;
  let staffId = null;
  let workId = null;
  let name = "";
  let email = "";
  let phone = "";
  let role = "user";
  let isStaff = false;
  let exists = false;

  /* 1. Supabase Auth */
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      exists = true;
      authId = user.id;
      addId(user.id);

      email = user.email || "";
      phone =
        user.phone ||
        user.phone_metadata?.phone_number ||
        "";

      name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email;

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, middle_name, last_name, user_id, role, mobile_number",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        profileId = profile.id;
        addId(profile.id);
        addId(profile.user_id);

        workId = profile.user_id || workId;
        phone = profile.mobile_number || phone;
        role = profile.role || role;

        name =
          profile.full_name ||
          [
            profile.first_name,
            profile.middle_name,
            profile.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          name;
      }
    }
  } catch {
    // Continue with local session.
  }

  /* 2. Resident session */
  const storedUser = readLocalSession(
    "currentUser",
  );

  if (storedUser) {
    exists = true;
    pendingId = storedUser.id || null;

    addId(storedUser.id);
    addId(storedUser.user_id);

    email = email || storedUser.email || "";
    phone =
      phone ||
      storedUser.mobile_number ||
      "";

    if (
      !name ||
      name === email
    ) {
      name =
        storedUser.full_name ||
        [
          storedUser.first_name,
          storedUser.middle_name,
          storedUser.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        storedUser.email ||
        "Resident";
    }

    if (storedUser.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, middle_name, last_name, user_id, role, mobile_number",
        )
        .eq("email", storedUser.email)
        .maybeSingle();

      if (profile) {
        profileId = profile.id;
        addId(profile.id);
        addId(profile.user_id);

        workId = profile.user_id || workId;
        phone = profile.mobile_number || phone;
        role = profile.role || role;

        if (
          !name ||
          name === email ||
          name === "Resident"
        ) {
          name =
            profile.full_name ||
            [
              profile.first_name,
              profile.middle_name,
              profile.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            name;
        }
      }
    }
  }

  /* 3. Staff/admin session */
  const storedStaff = readLocalSession(
    "currentStaff",
  );

  if (storedStaff) {
    exists = true;
    isStaff = true;

    staffId = storedStaff.id ?? null;
    workId =
      storedStaff.user_id || workId;

    addId(storedStaff.id);
    addId(storedStaff.user_id);
    addId(storedStaff.email);

    email = email || storedStaff.email || "";

    phone =
      phone ||
      storedStaff.mobile_number ||
      "";

    role =
      storedStaff.role || "staff";

    name =
      storedStaff.full_name ||
      storedStaff.username ||
      storedStaff.user_id ||
      "Staff Member";

    if (storedStaff.user_id) {
      const [staffResult, profileResult] =
        await Promise.all([
          supabase
            .from("staff_users")
            .select(
              "id, full_name, email, mobile_number, role, department, user_id",
            )
            .eq(
              "user_id",
              storedStaff.user_id,
            )
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "id, full_name, mobile_number, user_id",
            )
            .eq(
              "user_id",
              storedStaff.user_id,
            )
            .maybeSingle(),
        ]);

      const staff = staffResult.data;
      const profile = profileResult.data;

      if (staff) {
        staffId = staff.id;
        addId(staff.id);
        addId(staff.user_id);

        name =
          staff.full_name ||
          name;

        email =
          email ||
          staff.email ||
          "";

        phone =
          phone ||
          staff.mobile_number ||
          "";

        role =
          staff.role || role;
      }

      if (profile) {
        profileId = profile.id;
        addId(profile.id);
        addId(profile.user_id);

        name =
          profile.full_name ||
          name;

        phone =
          profile.mobile_number ||
          phone;
      }
    }
  }

  for (const value of [...ids]) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      ids.delete(value);
    }
  }

  return {
    ids: [...ids],
    idSet: ids,
    authId,
    pendingId,
    profileId,
    staffId,
    workId,
    name,
    email,
    phone,
    role,
    isStaff,
    exists,
  };
};

/* ══════════════════════════════════════════════════════════════════
   OWNERSHIP MATCHING
   ══════════════════════════════════════════════════════════════════ */

const OWNER_ID_FIELDS = [
  "userId",
  "user_id",
  "user_id_from_auth",
  "profileId",
  "profile_id",
  "staffId",
  "staff_id",
];

const OWNER_EMAIL_FIELDS = [
  "email",
  "reporterContact",
  "contactNum",
  "contactDetails",
  "reporter_contact",
];

const OWNER_PHONE_FIELDS = [
  "mobile_number",
  "reporterContact",
  "contactNum",
  "contactDetails",
  "reporter_contact",
];

const OWNER_NAME_FIELDS = [
  "requestedBy",
  "reporter_name",
  "fullName",
];

const rowBelongsTo = (row, who) => {
  if (
    !row ||
    !who ||
    !who.idSet ||
    who.idSet.size === 0
  ) {
    return false;
  }

  for (const field of OWNER_ID_FIELDS) {
    const value = row[field];

    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      who.idSet.has(String(value))
    ) {
      return true;
    }
  }

  const myEmail = cleanText(
    who.email,
  ).toLowerCase();

  if (myEmail) {
    for (const field of OWNER_EMAIL_FIELDS) {
      const value = cleanText(
        row[field],
      ).toLowerCase();

      if (value && value === myEmail) {
        return true;
      }
    }
  }

  const myPhone = phoneDigits(
    who.phone,
  );

  if (myPhone.length >= 10) {
    for (const field of OWNER_PHONE_FIELDS) {
      const value = phoneDigits(
        row[field],
      );

      if (
        value.length >= 10 &&
        value.slice(-10) ===
          myPhone.slice(-10)
      ) {
        return true;
      }
    }
  }

  const myName = cleanText(
    who.name,
  ).toLowerCase();

  if (myName) {
    for (const field of OWNER_NAME_FIELDS) {
      const value = cleanText(
        row[field],
      ).toLowerCase();

      if (value && value === myName) {
        return true;
      }
    }
  }

  return false;
};

/* ══════════════════════════════════════════════════════════════════
   RECORD NORMALIZERS
   ══════════════════════════════════════════════════════════════════ */

const normalizeAppointment = (row) => {
  const status = normalizeStatus(
    row.status || "pending",
  );

  return {
    key: `appointment-${row.appointmentId}`,
    kind: "appointment",
    id: row.appointmentId,
    title:
      row.purpose ||
      "General Appointment",
    subject:
      row.fullName ||
      "Resident request",
    status,
    dateText: row.date,
    timeText: row.time,
    summary: row.reason || "",
    detail: row.reason || "",
    detailLabel: "Your Request Notes",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photo: null,
    photoCount: 0,
    risk: "",
    onMap: false,
    fields: [
      row.email && {
        label: "Email",
        value: row.email,
      },

      row.mobile_number && {
        label: "Mobile",
        value: row.mobile_number,
      },

      row.account_status && {
        label: "Account Status",
        value: sentenceCase(
          row.account_status,
        ),
      },
    ].filter(Boolean),
    cancellable: status === "pending",
    cancelLabel: "Cancel Appointment",
  };
};

const normalizeIncident = (row) => ({
  key: `incident-${row.reportIncidentId}`,
  kind: "incident",
  id: row.reportIncidentId,
  title:
    row.incidentType ||
    "Incident Report",
  subject:
    row.patientName ||
    "Resident report",
  status: normalizeStatus(
    row.status || "pending",
  ),
  dateText: row.date,
  timeText: row.time,
  summary:
    row.address ||
    row.specialNeeds ||
    "",
  detail: row.adminResponse || "",
  detailLabel: "MDRRMO Response",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  photo:
    typeof row.pictureOfIncident ===
      "string" &&
    /^https?:\/\//i.test(
      row.pictureOfIncident,
    )
      ? row.pictureOfIncident
      : null,
  photoCount: row.pictureOfIncident
    ? 1
    : 0,
  risk: "",
  onMap: false,
  fields: [
    row.address && {
      label: "Address",
      value: row.address,
    },

    row.landMark && {
      label: "Landmark",
      value: row.landMark,
    },

    row.priorityLevel && {
      label: "Priority",
      value: row.priorityLevel,
    },

    row.specialNeeds && {
      label: "Special Needs",
      value: row.specialNeeds,
    },

    row.requiredTools && {
      label: "Required Tools",
      value: row.requiredTools,
    },
  ].filter(Boolean),
  cancellable: false,
  cancelLabel: "",
});

const normalizeBorrow = (row) => {
  const status = normalizeStatus(
    row.status || "pending",
  );

  const hasDeparture = Boolean(
    row.departure,
  );

  const hasArrival = Boolean(
    row.arrival,
  );

  return {
    key: `vehicle-${row.borrowerId}`,
    kind: "borrow",
    id: row.borrowerId,
    title:
      row.purpose ||
      "Vehicle Dispatch Request",
    subject:
      row.requestedBy ||
      "Resident request",
    status,
    dateText: row.date,
    timeText: row.time,
    summary:
      row.destination ||
      row.purpose ||
      "",
    detail: row.adminNotes || "",
    detailLabel: "Dispatch Update",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photo: null,
    photoCount: 0,
    risk: "",
    onMap: false,
    fields: [
      row.dispatchNum && {
        label: "Dispatch Number",
        value: row.dispatchNum,
      },

      row.vehicle && {
        label: "Vehicle",
        value: String(row.vehicle)
          .replace(/-/g, " "),
      },

      row.destination && {
        label: "Destination",
        value: row.destination,
      },

      hasDeparture && {
        label: "Starting Odometer",
        value: row.departure,
      },

      hasArrival && {
        label: "Ending Odometer",
        value: row.arrival,
      },
    ].filter(Boolean),
    cancellable: status === "pending",
    cancelLabel: "Cancel Vehicle Request",
  };
};

const normalizeCheckup = (row) => {
  const status = normalizeStatus(
    row.status || "pending",
  );

  return {
    key: `checkup-${row.id}`,
    kind: "checkup",
    id: row.id,
    title: row.patientFor
      ? `Check-Up — ${sentenceCase(
          row.patientFor,
        )}`
      : "Outpatient Check-Up Request",
    subject:
      row.patientName ||
      "Patient request",
    status,
    dateText: row.preferredDate,
    timeText: row.preferredTime,
    summary:
      row.hospitalName ||
      row.location ||
      "",
    detail: row.staffNote || "",
    detailLabel: "MDRRMO Staff Note",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.respondedAt,
    photo: null,
    photoCount: 0,
    risk: "",
    onMap: false,
    fields: [
      row.hospitalName && {
        label: "Hospital",
        value: row.hospitalName,
      },

      row.location && {
        label: "Location",
        value: row.location,
      },

      row.mobility && {
        label: "Mobility",
        value: String(row.mobility)
          .replace(/-/g, " "),
      },

      row.escort && {
        label: "Escort",
        value: row.escort,
      },
    ].filter(Boolean),
    cancellable: ["pending", "approved"].includes(
      status,
    ),
    cancelLabel: "Cancel Check-Up Request",
  };
};

const normalizeHazard = (row) => {
  const status = normalizeStatus(
    row.report_status || row.status || "pending",
  );

  const photos = Array.isArray(
    row.hazard_photos,
  )
    ? row.hazard_photos
    : [];

  return {
    key: `hazard-${row.id}`,
    kind: "hazard",
    id: row.id,
    title: row.hazard_category
      ? `${sentenceCase(
          row.hazard_category,
        )} Hazard`
      : "Hazard Report",
    subject:
      row.reporter_name ||
      "Anonymous",
    status,
    dateText: row.date_observed,
    timeText: row.time_observed,
    summary:
      row.hazard_description || "",
    detail: row.admin_remarks || "",
    detailLabel: "Administrator Response",
    createdAt: row.created_at,
    updatedAt: row.reviewed_at,
    photo: null,
    photoCount: photos.length,
    risk: row.risk_level || "",
    onMap:
      status === "approved" &&
      row.show_on_heatmap === true,
    fields: [
      row.hazard_description && {
        label: "Hazard Description",
        value: row.hazard_description,
      },

      row.address && {
        label: "Address",
        value: row.address,
      },

      row.landmark && {
        label: "Landmark",
        value: row.landmark,
      },

      row.risk_level && {
        label: "Risk Level",
        value: sentenceCase(
          row.risk_level,
        ),
      },

      row.recommended_action && {
        label: "Recommended Action",
        value: row.recommended_action,
      },
    ].filter(Boolean),
    cancellable: status === "pending",
    cancelLabel: "Dismiss Hazard Report",
  };
};

/* ══════════════════════════════════════════════════════════════════
   REQUEST SOURCES
   ══════════════════════════════════════════════════════════════════ */

const REQUEST_SOURCES = [
  {
    kind: "appointment",
    table: "appointments",
    label: "appointments",
    normalize: normalizeAppointment,
  },

  {
    kind: "incident",
    table: "reportIncident",
    label: "incidents",
    normalize: normalizeIncident,
  },

  {
    kind: "borrow",
    table: "borrow-vehicle",
    label: "vehicle requests",
    normalize: normalizeBorrow,
  },

  {
    kind: "checkup",
    table: "outPatientCheckUp",
    label: "check-ups",
    normalize: normalizeCheckup,
  },

  {
    kind: "hazard",
    table: "hazard_reports",
    label: "hazards",
    normalize: normalizeHazard,
  },
];

/* ══════════════════════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════════════════ */

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  wrapperClass,
  iconClass,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${wrapperClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-75 sm:text-xs">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black leading-none">
            {value}
          </p>

          {detail && (
            <p className="mt-2 text-xs font-semibold opacity-70">
              {detail}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  record,
  expanded,
  onToggle,
  onCancel,
  cancelling,
}) {
  const kind = KIND_META[record.kind];
  const KindIcon = kind.icon;

  const meta = statusMeta(record.status);
  const StatusIcon = meta.icon;

  const status = normalizeStatus(
    record.status,
  );

  const needsAttention =
    ATTENTION_STATUSES.has(status);

  const isDone = DONE_STATUSES.has(
    status,
  );

  const noteTone = needsAttention
    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
    : isDone
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200";

  const riskTone =
    record.risk === "critical"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
      : record.risk === "high"
        ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
        : record.risk === "medium"
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
      <div
        className={`h-1 bg-gradient-to-r ${kind.gradient}`}
        aria-hidden="true"
      />

      <div className="p-4 sm:p-5">
        {/* Summary */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md sm:h-12 sm:w-12 ${kind.gradient}`}
          >
            <KindIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {kind.label}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black sm:text-xs ${
                  TONE_CLASSES[
                    meta.tone
                  ] || TONE_CLASSES.slate
                }`}
              >
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </span>

              {record.risk && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${riskTone}`}
                >
                  {record.risk} risk
                </span>
              )}
            </div>

            <h3 className="truncate text-sm font-black text-slate-800 sm:text-base dark:text-white">
              {record.title}
            </h3>

            {record.subject && (
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                {record.subject}
              </p>
            )}

            {record.summary && (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {record.summary}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {record.dateText && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                  {formatDateLong(
                    record.dateText,
                  )}
                </span>
              )}

              {record.timeText && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-500" />
                  {to12h(record.timeText)}
                </span>
              )}

              {record.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Submitted {timeAgo(
                    record.createdAt,
                  )}
                </span>
              )}

              {record.photoCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {record.photoCount} photo
                  {record.photoCount === 1
                    ? ""
                    : "s"}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-label={
              expanded
                ? `Hide ${kind.label.toLowerCase()} details`
                : `Show ${kind.label.toLowerCase()} details`
            }
            aria-expanded={expanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${
                expanded
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>
        </div>

        {/* Note */}
        {record.detail && (
          <div
            className={`mt-4 rounded-2xl border p-4 ${noteTone}`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
              {record.detailLabel}
            </p>

            <p className="mt-1.5 whitespace-pre-line text-sm leading-6">
              {record.detail}
            </p>
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            {record.photo && (
              <a
                href={record.photo}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <img
                  src={record.photo}
                  alt="Attached incident evidence"
                  className="max-h-72 w-full object-cover transition group-hover:scale-[1.02]"
                />

                <span className="absolute bottom-3 right-3 rounded-xl bg-slate-950/75 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                  Open full-size image
                </span>
              </a>
            )}

            {record.fields.length > 0 && (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {record.fields.map(
                  (field, index) => (
                    <div
                      key={`${field.label}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                    >
                      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {field.label}
                      </dt>

                      <dd className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                        {field.value}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {record.cancellable && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={cancelling}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  {cancelling
                    ? "Updating..."
                    : record.cancelLabel}
                </button>
              )}

              {record.onMap && (
                <Link
                  to="/hazardmap"
                  className={`${REQUEST_GRADIENT} inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105`}
                >
                  <MapPin className="h-4 w-4" />
                  View on Public Map
                </Link>
              )}

              <span className="ml-auto font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Request #{record.id}
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function QuickActionCard({
  kind,
}) {
  const Icon = kind.icon;

  return (
    <Link
      to={kind.route}
      className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${kind.gradient}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <Plus className="h-4 w-4 text-slate-300 transition group-hover:rotate-90 group-hover:text-indigo-500 dark:text-slate-700 dark:group-hover:text-indigo-400" />
      </div>

      <div>
        <p className="text-sm font-black text-slate-800 dark:text-white">
          {kind.action}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          Create a new {kind.label.toLowerCase()} request.
        </p>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function MyRequests() {
  const navigate = useNavigate();

  const [identity, setIdentity] =
    useState(null);

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [tab, setTab] =
    useState("all");

  const [query, setQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [expanded, setExpanded] =
    useState({});

  const [cancellingId, setCancellingId] =
    useState(null);

  const loadSequenceRef = useRef(0);

  /* ------------------------------------------------------------
     LOAD REQUESTS
  ------------------------------------------------------------ */

  const load = useCallback(async (who) => {
    if (!who) {
      return;
    }

    const requestId =
      ++loadSequenceRef.current;

    setRefreshing(true);
    setError("");

    const results =
      await Promise.allSettled(
        REQUEST_SOURCES.map(
          (source) =>
            supabase
              .from(source.table)
              .select("*")
              .order("created_at", {
                ascending: false,
              })
              .limit(1000),
        ),
      );

    if (requestId !== loadSequenceRef.current) {
      return;
    }

    const failed = [];
    const allRecords = [];

    results.forEach(
      (result, index) => {
        const source =
          REQUEST_SOURCES[index];

        if (
          result.status ===
          "rejected"
        ) {
          failed.push(source.label);

          console.error(
            `Failed to load ${source.table}:`,
            result.reason,
          );

          return;
        }

        const response = result.value;

        if (response?.error) {
          failed.push(source.label);

          console.error(
            `Failed to load ${source.table}:`,
            response.error,
          );

          return;
        }

        const rows = response?.data || [];

        const ownedRows = rows.filter(
          (row) => rowBelongsTo(row, who),
        );

        allRecords.push(
          ...ownedRows.map(
            source.normalize,
          ),
        );
      },
    );

    allRecords.sort(
      (first, second) => {
        const firstTime =
          timestampOf(
            first.updatedAt ||
              first.createdAt,
          ) ||
          localDateTimestamp(
            first.dateText,
          );

        const secondTime =
          timestampOf(
            second.updatedAt ||
              second.createdAt,
          ) ||
          localDateTimestamp(
            second.dateText,
          );

        return secondTime - firstTime;
      },
    );

    setRecords(allRecords);

    if (failed.length > 0) {
      setError(
        `Could not load ${failed.join(
          ", ",
        )}. This is usually a row-level-security rule on one of the request tables.`,
      );
    }
  }, []);

  /* ------------------------------------------------------------
     INITIAL LOAD
  ------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);

      const who = await resolveIdentity();

      if (cancelled) {
        return;
      }

      if (!who.exists) {
        setLoading(false);

        navigate("/login", {
          replace: true,
          state: {
            error:
              "Please log in to view your requests.",
          },
        });

        return;
      }

      setIdentity(who);

      await load(who);

      if (!cancelled) {
        setLoading(false);
      }
    };

    boot();

    return () => {
      cancelled = true;
      loadSequenceRef.current += 1;
    };
  }, [load, navigate]);

  /* ------------------------------------------------------------
     REALTIME + PERIODIC REFRESH
  ------------------------------------------------------------ */

  useEffect(() => {
    if (!identity) {
      return undefined;
    }

    let refreshTimer = null;

    const scheduleRefresh = () => {
      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      refreshTimer =
        window.setTimeout(() => {
          load(identity);
        }, 350);
    };

    const channel = REQUEST_SOURCES.reduce(
      (currentChannel, source) =>
        currentChannel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: source.table,
          },
          scheduleRefresh,
        ),
      supabase.channel(
        "my-requests-watch-v3",
      ),
    );

    channel.subscribe();

    const pollingTimer =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          load(identity);
        }
      }, 30000);

    return () => {
      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      window.clearInterval(
        pollingTimer,
      );

      supabase.removeChannel(channel);
    };
  }, [identity, load]);

  /* ------------------------------------------------------------
     NOTICE TIMEOUT
  ------------------------------------------------------------ */

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout =
      window.setTimeout(() => {
        setNotice("");
      }, 6000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  /* ------------------------------------------------------------
     DERIVED COUNTS
  ------------------------------------------------------------ */

  const counts = useMemo(() => {
    const nextCounts = {
      all: records.length,
      appointment: 0,
      incident: 0,
      borrow: 0,
      checkup: 0,
      hazard: 0,
      open: 0,
      done: 0,
      attention: 0,
    };

    records.forEach((record) => {
      nextCounts[record.kind] += 1;

      const status = normalizeStatus(
        record.status,
      );

      if (OPEN_STATUSES.has(status)) {
        nextCounts.open += 1;
      }

      if (DONE_STATUSES.has(status)) {
        nextCounts.done += 1;
      }

      if (
        ATTENTION_STATUSES.has(status)
      ) {
        nextCounts.attention += 1;
      }
    });

    return nextCounts;
  }, [records]);

  /* ------------------------------------------------------------
     FILTERED RECORDS
  ------------------------------------------------------------ */

  const filtered = useMemo(() => {
    const search = query
      .trim()
      .toLowerCase();

    return records
      .filter((record) =>
        tab === "all"
          ? true
          : record.kind === tab,
      )
      .filter((record) => {
        const status = normalizeStatus(
          record.status,
        );

        if (statusFilter === "all") {
          return true;
        }

        if (statusFilter === "open") {
          return OPEN_STATUSES.has(
            status,
          );
        }

        if (statusFilter === "done") {
          return DONE_STATUSES.has(
            status,
          );
        }

        if (
          statusFilter === "attention"
        ) {
          return ATTENTION_STATUSES.has(
            status,
          );
        }

        return status === statusFilter;
      })
      .filter((record) => {
        if (!search) {
          return true;
        }

        const values = [
          record.title,
          record.subject,
          record.summary,
          record.detail,
          record.status,
          record.dateText,
          KIND_META[record.kind].label,
          ...record.fields.map(
            (field) =>
              `${field.label} ${field.value}`,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return values.includes(search);
      });
  }, [records, tab, statusFilter, query]);

  /* ------------------------------------------------------------
     CARD EXPANSION
  ------------------------------------------------------------ */

  const toggleExpanded = (key) => {
    setExpanded((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  /* ------------------------------------------------------------
     CANCEL / DISMISS REQUEST
  ------------------------------------------------------------ */

  const handleCancel = async (
    record,
  ) => {
    if (cancellingId) {
      return;
    }

    if (record.kind === "incident") {
      setError(
        "Incident reports cannot be cancelled from this page. Please contact MDRRMO for urgent assistance.",
      );

      return;
    }

    const action =
      record.kind === "hazard"
        ? "dismiss"
        : "cancel";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this ${KIND_META[
        record.kind
      ].label.toLowerCase()}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setCancellingId(record.key);
    setError("");
    setNotice("");

    try {
      let updateResult;

      if (record.kind === "appointment") {
        updateResult = await supabase
          .from("appointments")
          .update({
            status: "cancelled",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "appointmentId",
            record.id,
          );
      } else if (
        record.kind === "borrow"
      ) {
        updateResult = await supabase
          .from("borrow-vehicle")
          .update({
            status: "Cancelled",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "borrowerId",
            record.id,
          );
      } else if (
        record.kind === "checkup"
      ) {
        updateResult = await supabase
          .from("outPatientCheckUp")
          .update({
            status: "Cancelled",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", record.id);
      } else if (
        record.kind === "hazard"
      ) {
        updateResult = await supabase
          .from("hazard_reports")
          .update({
            status: "rejected",
            report_status: "rejected",
          })
          .eq("id", record.id);
      } else {
        throw new Error(
          "This request type cannot be cancelled here.",
        );
      }

      if (updateResult.error) {
        throw updateResult.error;
      }

      setNotice(
        record.kind === "hazard"
          ? "Hazard report dismissed successfully."
          : "Request cancelled successfully.",
      );

      window.dispatchEvent(
        new Event(
          "mdrrmo:notif-refresh",
        ),
      );

      await load(identity);
    } catch (operationError) {
      console.error(
        "Request update error:",
        operationError,
      );

      setError(
        operationError?.message ||
          "Could not update the request.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  /* ------------------------------------------------------------
     LOADING SCREEN
  ------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div
            className={`${REQUEST_GRADIENT} mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl shadow-blue-600/20`}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <h1 className="mt-5 text-lg font-black text-slate-800 dark:text-white">
            Loading your requests
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Checking the latest status of your
            submitted requests.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------
     TABS
  ------------------------------------------------------------ */

  const tabs = [
    {
      id: "all",
      label: "All",
      icon: Layers,
      count: counts.all,
    },

    {
      id: "appointment",
      label:
        KIND_META.appointment.plural,
      icon: CalendarDays,
      count: counts.appointment,
    },

    {
      id: "incident",
      label: KIND_META.incident.plural,
      icon: Siren,
      count: counts.incident,
    },

    {
      id: "borrow",
      label: KIND_META.borrow.plural,
      icon: Ambulance,
      count: counts.borrow,
    },

    {
      id: "checkup",
      label: KIND_META.checkup.plural,
      icon: Stethoscope,
      count: counts.checkup,
    },

    {
      id: "hazard",
      label: KIND_META.hazard.plural,
      icon: TriangleAlert,
      count: counts.hazard,
    },
  ];

  const accountName =
    identity?.name || "My Requests";

  const accountDetail =
    identity?.email ||
    identity?.workId ||
    "Verified SafeResponse account";

  const accountBadge = identity?.isStaff
    ? String(
        identity?.role || "staff",
      )
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase(),
        )
    : "Resident";

  const filtersActive =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    tab !== "all";

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 dark:bg-slate-950">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-32 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-20 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
      />

      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section
          className={`${REQUEST_GRADIENT} relative overflow-hidden rounded-[2rem] px-5 py-7 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8`}
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-28 left-24 h-64 w-64 rounded-full bg-indigo-950/20 blur-2xl"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                <Layers className="h-8 w-8 text-white" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  SafeResponse Request Center
                </p>

                <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                  My Requests
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/85">
                  Track your appointments, emergency reports, vehicle requests, check-ups, and hazard submissions in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                Status Updates Enabled
              </div>

              <div className="rounded-full bg-white px-4 py-2 text-center shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                  Total Requests
                </p>

                <p className="text-xl font-black text-slate-900">
                  {counts.all}
                </p>
              </div>
            </div>
          </div>

          {/* Account card */}
          <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-black text-white ring-1 ring-white/20">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {accountName}
              </p>

              <p className="mt-0.5 truncate text-xs text-blue-50/80">
                {accountDetail}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/15">
              {accountBadge}
            </span>
          </div>
        </section>

        {/* Main card */}
        <section className="relative z-10 -mt-5 sm:-mt-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
            <div
              className={`h-1.5 ${REQUEST_GRADIENT}`}
              aria-hidden="true"
            />

            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
              {/* Statistics */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-blue-600" />

                  <h2 className="text-base font-black text-slate-800 dark:text-white">
                    Request Overview
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    icon={Layers}
                    label="Total"
                    value={counts.all}
                    detail="All submissions"
                    wrapperClass="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                    iconClass="bg-blue-600 text-white"
                  />

                  <StatCard
                    icon={Activity}
                    label="Active"
                    value={counts.open}
                    detail="Pending or ongoing"
                    wrapperClass="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                    iconClass="bg-amber-500 text-white"
                  />

                  <StatCard
                    icon={CheckCircle2}
                    label="Completed"
                    value={counts.done}
                    detail="Resolved requests"
                    wrapperClass="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    iconClass="bg-emerald-600 text-white"
                  />

                  <StatCard
                    icon={XCircle}
                    label="Attention"
                    value={counts.attention}
                    detail="Declined or cancelled"
                    wrapperClass="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    iconClass="bg-rose-600 text-white"
                  />
                </div>
              </section>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="font-semibold leading-6">
                    {error}
                  </p>
                </div>
              )}

              {/* Notice */}
              {notice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="flex-1 font-semibold leading-6">
                    {notice}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setNotice("")
                    }
                    aria-label="Dismiss notification"
                    className="rounded-lg p-1 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Search and filters */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <label
                      htmlFor="request-search"
                      className="sr-only"
                    >
                      Search requests
                    </label>

                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="request-search"
                      type="search"
                      value={query}
                      onChange={(event) =>
                        setQuery(event.target.value)
                      }
                      placeholder="Search purpose, status, hospital, address..."
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="min-w-0 sm:w-56">
                    <label
                      htmlFor="request-status-filter"
                      className="sr-only"
                    >
                      Filter requests by status
                    </label>

                    <select
                      id="request-status-filter"
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value,
                        )
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition hover:border-indigo-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="all">
                        All Statuses
                      </option>

                      <option value="open">
                        Active / Pending
                      </option>

                      <option value="done">
                        Completed
                      </option>

                      <option value="attention">
                        Needs Attention
                      </option>

                      <option value="pending">
                        Pending Review
                      </option>

                      <option value="approved">
                        Approved
                      </option>

                      <option value="confirmed">
                        Confirmed
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="resolved">
                        Resolved
                      </option>

                      <option value="rejected">
                        Rejected
                      </option>

                      <option value="declined">
                        Declined
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      load(identity)
                    }
                    disabled={refreshing}
                    className={`${REQUEST_GRADIENT} inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    {refreshing
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>
                </div>
              </section>

              {/* Request type tabs */}
              <section>
                <div
                  className="no-scrollbar flex gap-2 overflow-x-auto pb-2"
                  role="tablist"
                  aria-label="Request categories"
                >
                  {tabs.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() =>
                          setTab(item.id)
                        }
                        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-black transition ${
                          active
                            ? `${REQUEST_GRADIENT} border-transparent text-white shadow-lg shadow-blue-600/20`
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                        }`}
                      >
                        <Icon className="h-4 w-4" />

                        <span>
                          {item.label}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Result heading */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-white">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Request History
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Select a request to view complete details.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Showing {filtered.length} of {records.length}
                </span>
              </div>

              {/* Request list */}
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950">
                    <CircleSlash className="h-8 w-8 text-slate-400" />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-800 dark:text-white">
                    {filtersActive
                      ? "No matching requests"
                      : "No requests yet"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {filtersActive
                      ? "Try selecting another request category, status, or search term."
                      : "Your submitted appointment, incident, vehicle, check-up, and hazard requests will appear here."}
                  </p>

                  {filtersActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("all");
                        setStatusFilter("all");
                        setQuery("");
                      }}
                      className="mt-5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((record) => (
                    <RequestCard
                      key={record.key}
                      record={record}
                      expanded={
                        Boolean(
                          expanded[record.key],
                        )
                      }
                      onToggle={() =>
                        toggleExpanded(
                          record.key,
                        )
                      }
                      onCancel={() =>
                        handleCancel(record)
                      }
                      cancelling={
                        cancellingId ===
                        record.key
                      }
                    />
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={`${REQUEST_GRADIENT} flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md`}
                  >
                    <Plus className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white">
                      Submit a New Request
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Choose the service you need.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {Object.entries(KIND_META).map(
                    ([, kind]) => (
                      <QuickActionCard
                        key={kind.route}
                        kind={kind}
                      />
                    ),
                  )}
                </div>
              </section>

              <div className="border-t border-slate-200 pt-5 text-center dark:border-slate-800">
                <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">
                  Request statuses may take a few seconds to update while administrative actions are synchronized.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
