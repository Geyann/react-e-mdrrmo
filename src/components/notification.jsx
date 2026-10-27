"use client";

import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  Bell, BellRing, CheckCheck, CheckCircle2, XCircle, Info, AlertTriangle,
  Trash2, X, CalendarCheck2, Truck, Stethoscope, Siren, TriangleAlert,
  UserPlus, ClipboardList, Ambulance, Radio, CalendarClock, FileText,
  Loader2, RefreshCw, Wrench, Ban,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const POLL_MS_USER = 8000;
const POLL_MS_HANDLER = 12000;
const MAX_NOTIFICATIONS = 80;
const SCAN_LIMIT = 300;
const QUEUE_BACKFILL = 10;
const USER_BACKFILL = 12;
const READ_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_READ_ENTRIES = 1000;
const DISMISS_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_DISMISS_ENTRIES = 1000;
const QUERY_TIMEOUT_MS = 8000;
const DEBUG = import.meta.env?.DEV ?? false;

const dbg = (...a) => {
  if (DEBUG) console.log("[Notif]", ...a);
};

const REFRESH_EVENT = "mdrrmo:notif-refresh";

/* ══════════════════════════════════════════════════════════════════
   NETWORK SAFETY
   ══════════════════════════════════════════════════════════════════ */

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      );
      if (t && typeof t.unref === "function") t.unref();
    }),
  ]);

const safeQuery = async (builder, fallback, label, ms = QUERY_TIMEOUT_MS) => {
  try {
    const res = await withTimeout(builder, ms, label);
    if (res?.error) return fallback;
    return res?.data ?? fallback;
  } catch {
    return fallback;
  }
};

/* ══════════════════════════════════════════════════════════════════
   TEXT HELPERS
   ══════════════════════════════════════════════════════════════════ */

const trimReason = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
};

const DECLINED_STATUSES = new Set([
  "declined",
  "rejected",
  "cancelled",
  "canceled",
  "reject",
]);

const APPROVED_STATUSES = new Set([
  "approved",
  "confirmed",
  "active",
  "in progress",
  "dispatched",
  "ongoing",
  "resolved",
  "completed",
]);

const isDeclinedStatus = (value) =>
  DECLINED_STATUSES.has(String(value || "").trim().toLowerCase());

const isApprovedStatus = (value) =>
  APPROVED_STATUSES.has(String(value || "").trim().toLowerCase());

const withReason = (parts, { declined, reason, prefix = "Reason" }) => {
  if (!declined) return parts;
  const cleaned = trimReason(reason);
  if (!cleaned) return parts;
  return [...parts, `${prefix}: ${cleaned}`];
};

/* ══════════════════════════════════════════════════════════════════
   STORAGE
   ══════════════════════════════════════════════════════════════════ */

const readJSON = (k, fb) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : fb;
  } catch {
    return fb;
  }
};

const writeJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota or private mode */
  }
};

const listKey = (k) => `mdrrmo_notif_list_${k}`;
const readKey = (k) => `mdrrmo_notif_read_${k}`;
const dismissKey = (k) => `mdrrmo_notif_dismiss_${k}`;
const cacheKey = (k) => `mdrrmo_notif_cache_${k}`;

const prune = (map, ttl, max) => {
  const now = Date.now();
  const entries = Object.entries(map)
    .filter(([, ts]) => typeof ts === "number" && now - ts < ttl)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
  return Object.fromEntries(entries);
};

const pruneRead = (m) => prune(m, READ_TTL_MS, MAX_READ_ENTRIES);
const pruneDismiss = (m) => prune(m, DISMISS_TTL_MS, MAX_DISMISS_ENTRIES);

const makeId = (table, recordId, kind, extra = "") =>
  extra
    ? `${table}::${recordId}::${kind}::${extra}`
    : `${table}::${recordId}::${kind}`;

/* ══════════════════════════════════════════════════════════════════
   SOURCE REGISTRY
   ══════════════════════════════════════════════════════════════════ */

const SOURCES = [
  {
    table: "appointments",
    idKey: "appointmentId",
    icon: CalendarCheck2,
    label: "Appointment",
    scopes: ["self", "queue"],
    queueRoles: ["admin"],
    actionable: ["pending"],
    selfKeys: ["email", "mobile_number", "username"],
    selfTones: {
      approved: "success",
      confirmed: "success",
      rejected: "error",
      declined: "error",
      cancelled: "info",
      canceled: "info",
    },
    queueTones: { approved: "info" },
    link: { user: "/track", staff: "/track", admin: "/admin/appointment" },
    describe: (r) => {
      const status = String(r.status || "").toLowerCase();
      const declined = isDeclinedStatus(status);
      const approved = isApprovedStatus(status);
      const reason = r.decline_reason || r.review_notes;

      const parts = withReason(
        [
          r.purpose || "General visit",
          [r.date, r.time].filter(Boolean).join(" at "),
        ].filter(Boolean),
        { declined, reason }
      );

      if (approved && !declined) {
        return {
          title: "Appointment Approved",
          message: `Your appointment for "${r.purpose || "appointment"}" on ${r.date || ""} at ${r.time || ""} has been approved.`,
        };
      }

      if (declined) {
        return {
          title: "Appointment Declined",
          message: `Your appointment for "${r.purpose || "appointment"}" on ${r.date || ""} at ${r.time || ""} has been declined.\n\n${withReason([], { declined, reason }).join("\n") || "Reason: No reason provided."}`,
        };
      }

      return {
        title: "Appointment",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "reportIncident",
    idKey: "reportIncidentId",
    icon: Siren,
    label: "Incident Report",
    scopes: ["self", "queue"],
    queueRoles: ["admin", "staff"],
    actionable: ["pending"],
    selfKeys: ["reporterContact"],
    selfTones: {
      "in progress": "info",
      dispatched: "info",
      resolved: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: {},
    link: { user: "/track", staff: "/track", admin: "/admin/report" },
    describe: (r) => {
      const status = String(r.status || "").toLowerCase();
      const declined = isDeclinedStatus(status);
      const approved = isApprovedStatus(status);
      const reason = r.review_notes || r.adminResponse;

      if (approved && !declined) {
        return {
          title: "Incident Report Approved",
          message: `${r.incidentType || "Incident"} has been processed. ${r.adminResponse ? `Response: ${r.adminResponse}` : ""}`.trim(),
        };
      }

      if (declined) {
        return {
          title: "Incident Report Declined",
          message: `${r.incidentType || "Incident"} was declined.\n\n${withReason([], { declined, reason }).join("\n") || "Reason: No reason provided."}`,
        };
      }

      const parts = withReason(
        [
          r.incidentType,
          r.priorityLevel ? `${r.priorityLevel} priority` : null,
          r.address,
          r.adminResponse ? `Response: ${r.adminResponse}` : null,
        ].filter(Boolean),
        { declined, reason }
      );

      return {
        title: "Incident Report",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "borrow-vehicle",
    idKey: "borrowerId",
    icon: Truck,
    label: "Vehicle Dispatch",
    scopes: ["self", "queue"],
    queueRoles: ["admin", "staff"],
    actionable: ["pending"],
    selfKeys: ["contactNum"],
    selfTones: {
      approved: "success",
      declined: "error",
      rejected: "error",
      completed: "success",
      cancelled: "info",
      canceled: "info",
      ongoing: "info",
    },
    queueTones: { ongoing: "info", completed: "info" },
    link: { user: "/track", staff: "/staff/borrow", admin: "/admin/borrow" },
    describe: (r) => {
      const status = String(r.status || "").toLowerCase();
      const declined = isDeclinedStatus(status);
      const approved = isApprovedStatus(status);
      const reason = r.review_notes || r.adminNotes;

      if (approved && !declined) {
        return {
          title: "Vehicle Dispatch Approved",
          message: `Your dispatch request for ${r.vehicle ? String(r.vehicle).replace(/-/g, " ") : "a vehicle"} to ${r.destination || "your destination"} has been approved.`,
        };
      }

      if (declined) {
        return {
          title: "Vehicle Dispatch Declined",
          message: `Your dispatch request for ${r.vehicle ? String(r.vehicle).replace(/-/g, " ") : "a vehicle"} to ${r.destination || "your destination"} was declined.\n\n${withReason([], { declined, reason }).join("\n") || "Reason: No reason provided."}`,
        };
      }

      const parts = withReason(
        [
          r.vehicle ? String(r.vehicle).replace(/-/g, " ") : null,
          r.destination,
          r.requestedBy ? `by ${r.requestedBy}` : null,
          r.adminNotes ? `Note: ${r.adminNotes}` : null,
        ].filter(Boolean),
        { declined, reason }
      );

      return {
        title: "Vehicle Dispatch",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "outPatientCheckUp",
    idKey: "id",
    icon: Stethoscope,
    label: "Check-Up Request",
    scopes: ["self", "queue"],
    queueRoles: ["admin", "staff"],
    actionable: ["pending"],
    selfKeys: ["contactDetails"],
    selfTones: {
      approved: "success",
      confirmed: "success",
      completed: "success",
      declined: "error",
      rejected: "error",
      cancelled: "info",
      canceled: "info",
    },
    queueTones: { approved: "warning", confirmed: "info" },
    link: { user: "/track", staff: "/staff/checkupqueue", admin: "/admin/checkup" },
    describe: (r) => {
      const status = String(r.status || "").toLowerCase();
      const declined = isDeclinedStatus(status);
      const approved = isApprovedStatus(status);
      const reason = r.review_notes || r.staffNote;

      if (approved && !declined) {
        return {
          title: "Check-Up Request Approved",
          message: `Check-up request for ${r.patientName || "your patient"} at ${r.hospitalName || "the hospital"} on ${r.preferredDate || ""} at ${r.preferredTime || ""} has been approved.`,
        };
      }

      if (declined) {
        return {
          title: "Check-Up Request Declined",
          message: `Check-up request for ${r.patientName || "your patient"} at ${r.hospitalName || "the hospital"} on ${r.preferredDate || ""} at ${r.preferredTime || ""} was declined.\n\n${withReason([], { declined, reason }).join("\n") || "Reason: No reason provided."}`,
        };
      }

      const parts = withReason(
        [
          r.patientName ? `Patient: ${r.patientName}` : null,
          r.hospitalName,
          [r.preferredDate, r.preferredTime].filter(Boolean).join(" at "),
          r.staffNote ? `Staff note: ${r.staffNote}` : null,
        ].filter(Boolean),
        { declined, reason }
      );

      return {
        title: "Check-Up Request",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "hazard_reports",
    idKey: "id",
    icon: TriangleAlert,
    label: "Hazard Report",
    scopes: ["self", "queue"],
    queueRoles: ["admin", "staff"],
    actionable: ["pending"],
    selfKeys: ["reporter_contact", "reporterContact", "contact", "phone", "email", "reporter_email"],
    statusOf: (r) => {
      /*
       * Prefer explicit review workflow when past pending.
       * Otherwise treat as approved/rejected if EITHER status
       * column says so — do NOT let a leftover "pending"
       * report_status hide an approved status (that blocked notifs).
       */
      const review = String(r.review_status || "").trim().toLowerCase();
      const s = String(r.status || "").trim().toLowerCase();
      const rs = String(r.report_status || "").trim().toLowerCase();

      if (review && review !== "pending") return review;

      if (rs === "approved" || s === "approved") return "approved";
      if (
        rs === "rejected" ||
        s === "rejected" ||
        rs === "declined" ||
        s === "declined"
      ) {
        return "rejected";
      }

      return s || rs || "pending";
    },
    selfTones: {
      approved: "success",
      under_review: "info",
      resolved: "success",
      rejected: "error",
      declined: "error",
      pending: "info",
    },
    queueTones: {
      under_review: "info",
      resolved: "success",
      approved: "info",
      rejected: "error",
      declined: "error",
      pending: "warning",
    },
    link: {
      user: "/track",
      staff: "/staff/hazard-reports",
      admin: "/admin/hazard-map",
    },
    describe: (r) => {
      const status = String(
        r.review_status || r.report_status || r.status || "",
      ).toLowerCase();
      const declined = isDeclinedStatus(status);
      const approved =
        isApprovedStatus(status) ||
        status === "resolved" ||
        status === "under_review";

      const reason = r.admin_remarks || r.review_notes;
      const category = r.hazard_category || "hazard";
      const address = r.address || "your location";
      const assigned =
        r.assigned_to_name ||
        (r.assigned_to_staff_id ? `Staff #${r.assigned_to_staff_id}` : null);

      if (status === "under_review") {
        return {
          title: "Hazard Report Under Review",
          message: [
            `Your ${category} report at ${address} is now under review.`,
            assigned ? `Assigned to: ${assigned}` : null,
            reason ? `Remarks: ${reason}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

      if (status === "resolved" || (approved && !declined && status !== "under_review")) {
        return {
          title:
            status === "resolved"
              ? "Hazard Report Resolved"
              : "Hazard Report Approved",
          message: [
            `Your ${category} report at ${address} has been ${
              status === "resolved" ? "resolved" : "approved"
            }.`,
            status !== "resolved"
              ? "It may appear on the public hazard map."
              : null,
            assigned ? `Handled by: ${assigned}` : null,
            reason ? `Remarks: ${reason}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

      if (declined) {
        return {
          title: "Hazard Report Declined",
          message: `Your ${category} report at ${address} was declined.\n\n${
            withReason([], { declined, reason, prefix: "Remarks" }).join("\n") ||
            "Remarks: No reason provided."
          }`,
        };
      }

      const parts = withReason(
        [
          category,
          r.risk_level ? `${r.risk_level} risk` : null,
          address,
          assigned ? `Assigned: ${assigned}` : null,
        ].filter(Boolean),
        { declined, reason, prefix: "Remarks" },
      );

      return {
        title: "Hazard Report",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "pending_registrations",
    idKey: "id",
    icon: UserPlus,
    label: "Account",
    scopes: ["self", "queue"],
    queueRoles: ["admin"],
    actionable: ["pending"],
    selfKeys: ["email"],
    selfTones: {
      approved: "success",
      rejected: "error",
      declined: "error",
    },
    queueTones: {},
    link: { user: "/settings", staff: "/staff/settings", admin: "/admin/pending-account" },
    describe: (r) => {
      const declined = isDeclinedStatus(r.status);
      const approved = r.status === "approved";
      const reason = r.review_notes;

      if (approved) {
        return {
          title: "Account Approved",
          message: `${[r.first_name, r.last_name].filter(Boolean).join(" ") || r.username || "Your account"} has been approved. You can now sign in.`,
        };
      }

      if (declined) {
        return {
          title: "Account Declined",
          message: `${[r.first_name, r.last_name].filter(Boolean).join(" ") || r.username || "Your account"} was declined.\n\n${withReason([], { declined, reason }).join("\n") || "Reason: No reason provided."}`,
        };
      }

      const parts = withReason(
        [
          [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
          r.status === "approved" ? "You can now sign in." : null,
        ].filter(Boolean),
        { declined, reason }
      );

      return {
        title: "Account Registration",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "inventory_reports",
    idKey: "id",
    icon: FileText,
    label: "Inventory Report",
    scopes: ["queue"],
    queueRoles: ["admin"],
    actionable: ["pending_approval"],
    selfTones: {},
    queueTones: {},
    link: { user: "/settings", staff: "/staff/inventory", admin: "/admin/inventory" },
    describe: (r) => {
      const declined = isDeclinedStatus(r.status);
      const reason = r.admin_notes || r.review_notes;

      const parts = withReason(
        [
          r.title,
          r.generated_by_name ? `by ${r.generated_by_name}` : null,
        ].filter(Boolean),
        { declined, reason, prefix: "Notes" }
      );

      return {
        title: "Inventory Report",
        message: parts.join(" — "),
      };
    },
  },
  {
    table: "borrower_slip",
    idKey: "id",
    icon: ClipboardList,
    label: "Borrower Slip",
    scopes: ["queue"],
    queueRoles: [],
    actionable: [],
    selfTones: {},
    queueTones: {},
    link: { user: "/track", staff: "/staff/borrower-slip", admin: "/admin/borrow" },
    describe: (r) => ({
      title: "Borrower Slip",
      message: [
        r.borrower_name,
        r.plateNo ? `Plate: ${r.plateNo}` : null,
        r.hospital,
      ].filter(Boolean).join(" — "),
    }),
  },
  {
    table: "ambulances",
    idKey: "id",
    icon: Ambulance,
    label: "Ambulance",
    scopes: ["queue"],
    queueRoles: [],
    actionable: [],
    selfTones: {},
    queueTones: { maintenance: "warning", out_of_service: "error" },
    link: { user: "/home", staff: "/staff/dashboard", admin: "/admin/inventory" },
    describe: (r) => ({
      title: "Ambulance",
      message: [
        r.unit_number,
        r.plate_number,
        r.assigned_driver ? `Driver: ${r.assigned_driver}` : null,
      ].filter(Boolean).join(" — "),
    }),
  },
  {
    table: "ambulance_usage",
    idKey: "id",
    icon: Radio,
    label: "Ambulance Usage",
    scopes: ["queue"],
    queueRoles: [],
    actionable: [],
    selfTones: {},
    queueTones: { completed: "info", in_progress: "info" },
    link: { user: "/home", staff: "/staff/dashboard", admin: "/admin/inventory" },
    describe: (r) => ({
      title: "Ambulance Usage",
      message: [
        r.purpose,
        r.destination,
        r.staff_name ? `by ${r.staff_name}` : null,
      ].filter(Boolean).join(" — "),
    }),
  },
  {
    table: "date_restrictions",
    idKey: "id",
    icon: CalendarClock,
    label: "Date Availability",
    scopes: ["queue"],
    queueRoles: [],
    actionable: [],
    selfTones: {},
    queueTones: {},
    link: { user: "/appointment", staff: "/staff/dashboard", admin: "/admin/appointment" },
    describe: (r) => ({
      title: "Date Availability",
      message: [
        r.date,
        r.is_unavailable ? "Unavailable" : "Available",
        r.volume_limit ? `Limit: ${r.volume_limit}` : null,
      ].filter(Boolean).join(" — "),
    }),
  },
];

const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.table, s]));

const statusOf = (src, row) =>
  src.statusOf ? src.statusOf(row) : String(row.status || "").trim().toLowerCase();

const idOf = (src, row) => row[src.idKey] ?? "unknown";

/* ══════════════════════════════════════════════════════════════════
   NOTIFICATIONS TABLE MAPPING
   ══════════════════════════════════════════════════════════════════ */

const NOTIF_TONE_MAP = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
};

const guessFromNotification = (row, w) => {
  const title = String(row.title || "").toLowerCase();

  if (title.includes("appointment")) {
    return {
      iconKey: "appointments",
      label: "Appointment",
      link: w.isAdminRole
        ? "/admin/appointment"
        : w.isStaffRole
          ? "/track"
          : "/track",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("incident")) {
    return {
      iconKey: "reportIncident",
      label: "Incident Report",
      link: w.isAdminRole ? "/admin/report" : "/track",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("vehicle") || title.includes("dispatch")) {
    return {
      iconKey: "borrow-vehicle",
      label: "Vehicle Dispatch",
      link: w.isAdminRole
        ? "/admin/borrow"
        : w.isStaffRole
          ? "/staff/borrow"
          : "/track",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("check")) {
    return {
      iconKey: "outPatientCheckUp",
      label: "Check-Up Request",
      link: w.isAdminRole
        ? "/admin/checkup"
        : w.isStaffRole
          ? "/staff/checkupqueue"
          : "/track",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("hazard")) {
    return {
      iconKey: "hazard_reports",
      label: "Hazard Report",
      link: w.isAdminRole ? "/admin/hazard-map" : "/track",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("account") || title.includes("registration")) {
    return {
      iconKey: "pending_registrations",
      label: "Account",
      link: w.isAdminRole
        ? "/admin/pending-account"
        : "/settings",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  if (title.includes("inventory")) {
    return {
      iconKey: "inventory_reports",
      label: "Inventory Report",
      link: w.isAdminRole
        ? "/admin/inventory"
        : "/staff/inventory",
      tone: NOTIF_TONE_MAP[row.type] || "info",
    };
  }

  return {
    iconKey: null,
    label: "Notification",
    link: "/home",
    tone: NOTIF_TONE_MAP[row.type] || "info",
  };
};

const notifRowToItem = (row, w) => {
  if (!row || !row.id) return null;

  const meta = guessFromNotification(row, w);

  return {
    id: `notification::${row.id}`,
    table: "notifications",
    recordId: String(row.id),
    scope: "self",
    kind: "status",
    tone: meta.tone,
    label: meta.label,
    iconKey: meta.iconKey,
    title: row.title || meta.label,
    message: row.message || "",
    link: meta.link,
    createdAt: row.created_at || new Date().toISOString(),
    dbRead: row.is_read === true,
  };
};

/* ══════════════════════════════════════════════════════════════════
   TONES
   ══════════════════════════════════════════════════════════════════ */

const TONE_ICON = {
  success: CheckCircle2, error: XCircle,
  warning: AlertTriangle, info: Info,
};

const TONE_BG = {
  success: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  info: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
};

const TONE_HEADER = {
  success: "border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40",
  error: "border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40",
  warning: "border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40",
  info: "border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40",
};

/* ══════════════════════════════════════════════════════════════════
   IDENTITY
   ══════════════════════════════════════════════════════════════════ */

const digits = (s) => String(s || "").replace(/\D/g, "");

const resolveIdentity = async () => {
  const ids = new Set();
  const add = (v) => {
    if (v === null || v === undefined || v === "") return;
    ids.add(String(v));
  };

  let authId = null;
  let profileId = null;
  let staffRowId = null;
  let email = "";
  let phone = "";
  let name = "";
  let role = "user";
  let exists = false;

  const absorbProfile = (p) => {
    if (!p) return;
    profileId = p.id;
    add(p.id);
    add(p.user_id);
    if (!email && p.email) email = p.email;
    if (!phone && p.mobile_number) phone = p.mobile_number;
    if (p.role && role === "user") role = p.role;
    const n = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
    if (n && (name === "" || name === "Resident")) name = n;
  };

  const PROFILE_FIELDS =
    "id, full_name, first_name, last_name, user_id, role, email, mobile_number";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      exists = true;
      authId = user.id;
      add(user.id);
      email = user.email || "";
      name = name || email;

      const p = await safeQuery(
        supabase.from("profiles").select(PROFILE_FIELDS)
          .eq("id", user.id).maybeSingle(),
        null, "profiles/auth"
      );
      if (p) {
        absorbProfile(p);
      } else {
        const m = user.user_metadata || {};
        const n = m.full_name ||
          `${m.first_name || ""} ${m.last_name || ""}`.trim();
        if (n) name = n;
      }
    }
  } catch (e) {
    dbg("auth lookup failed:", e?.message);
  }

  const rawUser = localStorage.getItem("currentUser");
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      exists = true;
      add(u.id);
      add(u.user_id);
      if (!email && u.email) email = u.email;
      if (!phone && u.mobile_number) phone = u.mobile_number;
      if (!name) {
        name = u.full_name ||
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.email || "Resident";
      }

      if (u.email) {
        const p = await safeQuery(
          supabase.from("profiles").select(PROFILE_FIELDS)
            .eq("email", u.email).maybeSingle(),
          null, "profiles/email"
        );
        if (p) absorbProfile(p);

        if (!phone) {
          const pr = await safeQuery(
            supabase.from("pending_registrations").select("mobile_number")
              .eq("email", u.email).maybeSingle(),
            null, "pending/email"
          );
          if (pr?.mobile_number) phone = pr.mobile_number;
        }
      }
    } catch {
      /* malformed JSON */
    }
  }

  const rawStaff = localStorage.getItem("currentStaff");
  if (rawStaff) {
    try {
      const s = JSON.parse(rawStaff);
      exists = true;
      add(s.id);
      add(s.user_id);
      if (s.email) {
        add(s.email);
        if (!email) email = s.email;
      }
      if (s.mobile_number) {
        add(s.mobile_number);
        if (!phone) phone = s.mobile_number;
      }
      role = s.role || "staff";
      name = s.full_name || s.username || s.user_id || "Staff Member";

      if (s.user_id) {
        const row = await safeQuery(
          supabase.from("staff_users")
            .select("id, full_name, role, mobile_number")
            .eq("user_id", s.user_id).maybeSingle(),
          null, "staff_users"
        );
        if (row) {
          staffRowId = row.id;
          add(row.id);
          role = row.role || role;
          name = row.full_name || name;
          if (row.mobile_number && !phone) phone = row.mobile_number;
        }
      }
    } catch {
      /* malformed JSON */
    }
  }

  const isHandler = ["admin", "staff", "moderator"].includes(role);
  const firstId = [...ids][0] || "anon";
  const storageKey = `${role}-${authId || profileId || staffRowId || firstId}`;

  return {
    idSet: ids, authId, profileId, staffRowId,
    email, phone, name, role, isHandler, exists, storageKey,
    isAdminRole: role === "admin",
    isStaffRole: isHandler && role !== "admin",
  };
};

/* ══════════════════════════════════════════════════════════════════
   MATCHING
   ══════════════════════════════════════════════════════════════════ */

const OWNERSHIP_ID_COLUMNS = [
  "userId",
  "user_id",
  "user_id_from_auth",
  "staffId",
  "staff_id",
  "created_by",
  "reporter_id",
];

const HAZARD_ASSIGN_COLUMNS = [
  "assigned_to_staff_id",
  "reviewed_by_staff_id",
  "reviewed_by",
];

const matchRow = (src, row, w) => {
  if (!w || !w.idSet || w.idSet.size === 0) return { ok: false, via: null };

  for (const col of OWNERSHIP_ID_COLUMNS) {
    const v = row[col];
    if (v === null || v === undefined || v === "") continue;
    if (w.idSet.has(String(v))) return { ok: true, via: col };
  }

  if (src.table === "hazard_reports") {
    for (const col of HAZARD_ASSIGN_COLUMNS) {
      const v = row[col];
      if (v === null || v === undefined || v === "") continue;
      if (w.idSet.has(String(v))) return { ok: true, via: col };
    }
  }

  const myEmail = (w.email || "").trim().toLowerCase();
  const myPhone = digits(w.phone);

  for (const col of src.selfKeys || []) {
    const rawVal = row[col];
    if (!rawVal) continue;
    const v = String(rawVal).trim();
    if (myEmail && v.toLowerCase() === myEmail) return { ok: true, via: col };
    if (myPhone && myPhone.length >= 10 &&
      digits(v).slice(-10) === myPhone.slice(-10)) {
      return { ok: true, via: col };
    }
  }

  return { ok: false, via: null };
};

const sourcesFor = (w) =>
  SOURCES.filter((s) => s.scopes.includes(w.isHandler ? "queue" : "self"));

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function Notification() {
  const navigate = useNavigate();

  const [who, setWho] = useState(null);
  const [booting, setBooting] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [readMap, setReadMap] = useState({});
  const [dismissMap, setDismissMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [diag, setDiag] = useState({});
  const [pos, setPos] = useState(null);

  const btnRef = useRef(null);
  const whoRef = useRef(null);
  const cacheRef = useRef({});
  const notifRef = useRef([]);
  const readRef = useRef({});
  const dismissRef = useRef({});
  const seededRef = useRef(false);
  const scanPromiseRef = useRef(null);
  const bootRef = useRef(null);

  const persistAll = useCallback(() => {
    const w = whoRef.current;
    if (!w) return;
    writeJSON(listKey(w.storageKey), notifRef.current);
    writeJSON(readKey(w.storageKey), readRef.current);
    writeJSON(dismissKey(w.storageKey), dismissRef.current);
  }, []);

  const persistCache = useCallback(() => {
    const w = whoRef.current;
    if (!w) return;
    writeJSON(cacheKey(w.storageKey), cacheRef.current);
  }, []);

  const push = useCallback((p, { silent = false } = {}) => {
    if (dismissRef.current[p.id] !== undefined) return;
    if (notifRef.current.some((x) => x.id === p.id)) return;

    const n = { read: false, ...p };
    const next = [n, ...notifRef.current].slice(0, MAX_NOTIFICATIONS);

    notifRef.current = next;
    setNotifications(next);
    persistAll();

    if (!silent) dbg("push:", n.tone, n.title, n.id);
  }, [persistAll]);

  const linkFor = useCallback(
    (src, w) =>
      (src.link || {})[
        w.isAdminRole ? "admin" : w.isStaffRole ? "staff" : "user"
      ] || "/home",
    []
  );

  const onCreated = useCallback((src, row, scope) => {
    const w = whoRef.current;
    if (!w) return;

    const { title, message } = src.describe(row || {});
    const rid = String(idOf(src, row));

    push({
      id: makeId(src.table, rid, "created"),
      table: src.table,
      recordId: rid,
      scope,
      kind: "created",
      tone: scope === "queue" ? "warning" : "success",
      label: src.label,
      iconKey: src.table,
      title: scope === "queue" ? `New ${title} Submitted` : `${title} Submitted`,
      message: scope === "queue"
        ? `Awaiting review — ${message}`
        : message || "Received and pending review.",
      link: linkFor(src, w),
      createdAt: row?.created_at || new Date().toISOString(),
    });
  }, [push, linkFor]);

  const onStatus = useCallback((src, row, scope, status, previous) => {
    if (!status) return;
    const w = whoRef.current;
    if (!w) return;

    const mapped = (scope === "queue" ? src.queueTones : src.selfTones)[status];
    // Always notify on terminal / important hazard statuses even if
    // the tone map was incomplete for a given label.
    const fallbackTone =
      status === "approved" || status === "resolved" || status === "confirmed"
        ? "success"
        : status === "rejected" || status === "declined" || status === "cancelled" || status === "canceled"
          ? "error"
          : status === "under_review" || status === "in progress" || status === "dispatched"
            ? "info"
            : null;
    const tone = mapped || fallbackTone;
    if (!tone) return;

    const { title, message } = src.describe(row || {});
    const pretty = status.charAt(0).toUpperCase() + status.slice(1);
    const rid = String(idOf(src, row));

    push({
      id: makeId(src.table, rid, "status", `${previous || "none"}->${status}`),
      table: src.table,
      recordId: rid,
      scope,
      kind: "status",
      tone,
      label: src.label,
      iconKey: src.table,
      title: title || `${src.label} ${pretty}`,
      message: message || `Status changed to ${pretty}.`,
      link: linkFor(src, w),
      previousStatus: previous,
      createdAt: row?.updated_at || row?.respondedAt || row?.reviewed_at || new Date().toISOString(),
    });
  }, [push, linkFor]);

  const scanNotificationsTable = useCallback(async (w) => {
    if (!w || !w.authId) {
      setDiag((d) => ({
        ...d,
        notifications: { mine: 0, total: 0, note: "no auth id" },
      }));
      return;
    }

    const rows = await safeQuery(
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", w.authId)
        .order("created_at", { ascending: false })
        .limit(SCAN_LIMIT),
      null,
      "scan notifications",
      10000
    );

    if (rows === null) {
      setBlocked((p) =>
        p.includes("notifications") ? p : [...p, "notifications"]
      );
      setDiag((d) => ({
        ...d,
        notifications: { error: "unreadable or timed out", mine: 0 },
      }));
      return;
    }

    setBlocked((p) => p.filter((t) => t !== "notifications"));

    let added = 0;
    let skippedRead = 0;

    for (const row of rows) {
      const item = notifRowToItem(row, w);
      if (!item) continue;

      if (dismissRef.current[item.id] !== undefined) continue;
      if (notifRef.current.some((x) => x.id === item.id)) continue;

      if (item.dbRead && readRef.current[item.id] === undefined) {
        readRef.current = {
          ...readRef.current,
          [item.id]: new Date(row.created_at || Date.now()).getTime(),
        };
        skippedRead += 1;
      }

      const n = { read: item.dbRead === true, ...item };
      notifRef.current = [n, ...notifRef.current].slice(0, MAX_NOTIFICATIONS);
      added += 1;
    }

    if (added > 0 || skippedRead > 0) {
      setNotifications([...notifRef.current]);
      setReadMap({ ...readRef.current });
      persistAll();
    }

    setDiag((d) => ({
      ...d,
      notifications: { mine: rows.length, total: rows.length },
    }));
  }, [persistAll]);

  const scanSource = useCallback(async (src, w) => {
    const rows = await safeQuery(
      supabase.from(src.table).select("*")
        .order("created_at", { ascending: false }).limit(SCAN_LIMIT),
      null, `scan ${src.table}`, 10000
    );

    if (rows === null) {
      setBlocked((p) => (p.includes(src.table) ? p : [...p, src.table]));
      setDiag((d) => ({
        ...d, [src.table]: { error: "unreadable or timed out", mine: 0 },
      }));
      return;
    }

    setBlocked((p) => p.filter((t) => t !== src.table));

    const isQueue = src.scopes.includes("queue");
    const wantsQueue = src.queueRoles.includes(w.role) ||
      (w.isStaffRole && src.queueRoles.includes("staff"));

    const queueBackfill = [];
    const mine = [];

    for (const row of rows) {
      const rid = idOf(src, row);
      const key = `${src.table}::${rid}`;
      const status = statusOf(src, row);
      const m = matchRow(src, row, w);
      const prev = cacheRef.current[key];

      cacheRef.current[key] = status;
      if (m.ok) mine.push({ row, status, via: m.via });

      if (!seededRef.current) {
        if (w.isHandler && wantsQueue &&
          (src.actionable || []).includes(status)) {
          queueBackfill.push(row);
        }
        continue;
      }

      if (w.isHandler && isQueue) {
        if (prev === undefined) {
          if (wantsQueue) onCreated(src, row, "queue");
        } else if (prev !== status) {
          if (m.ok) onStatus(src, row, "self", status, prev);
          else if (wantsQueue) onStatus(src, row, "queue", status, prev);
        }
        continue;
      }

      if (!w.isHandler && m.ok) {
        if (prev === undefined) {
          onCreated(src, row, "self");
        } else if (prev !== status) {
          onStatus(src, row, "self", status, prev);
        }
      }
    }

    setDiag((d) => ({
      ...d,
      [src.table]: {
        total: rows.length,
        mine: mine.length,
        via: mine.reduce((a, m) => {
          a[m.via] = (a[m.via] || 0) + 1;
          return a;
        }, {}),
      },
    }));

    if (w.isHandler && queueBackfill.length) {
      queueBackfill.slice(0, QUEUE_BACKFILL).forEach((row) => {
        const { title, message } = src.describe(row);
        const rid = String(idOf(src, row));
        push({
          id: makeId(src.table, rid, "backfill"),
          table: src.table,
          recordId: rid,
          scope: "queue",
          kind: "backfill",
          tone: "info",
          label: src.label,
          iconKey: src.table,
          title: `${title} — Pending Review`,
          message: message || "Waiting for review.",
          link: linkFor(src, w),
          createdAt: row.created_at || new Date().toISOString(),
        }, { silent: true });
      });
    }

    if (!w.isHandler && !seededRef.current && mine.length) {
      mine.slice(0, USER_BACKFILL).forEach(({ row, status }) => {
        const { title, message } = src.describe(row);
        const rid = String(idOf(src, row));
        const pretty = status && status !== "pending"
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : "Pending Review";
        push({
          id: makeId(src.table, rid, "backfill"),
          table: src.table,
          recordId: rid,
          scope: "self",
          kind: "backfill",
          tone: "info",
          label: src.label,
          iconKey: src.table,
          title: `${title} — ${pretty}`,
          message: message || "Your request.",
          link: linkFor(src, w),
          createdAt: row.created_at || new Date().toISOString(),
        }, { silent: true });
      });
    }
  }, [onCreated, onStatus, push, linkFor]);

  const scanAll = useCallback(async () => {
    const w = whoRef.current;
    if (!w) return;

    if (scanPromiseRef.current) {
      return scanPromiseRef.current;
    }

    const run = (async () => {
      try {
        await scanNotificationsTable(w);

        await Promise.allSettled(
          sourcesFor(w).map((s) => scanSource(s, w))
        );

        persistCache();
      } finally {
        scanPromiseRef.current = null;
      }
    })();

    scanPromiseRef.current = run;
    return run;
  }, [scanNotificationsTable, scanSource, persistCache]);

  useEffect(() => {
    if (!bootRef.current) {
      bootRef.current = (async () => {
        const w = await resolveIdentity();
        if (!w.exists) return null;

        whoRef.current = w;
        cacheRef.current = readJSON(cacheKey(w.storageKey), {});

        const list = readJSON(listKey(w.storageKey), []);
        const rmap = pruneRead(readJSON(readKey(w.storageKey), {}));
        const dmap = pruneDismiss(readJSON(dismissKey(w.storageKey), {}));

        notifRef.current = list;
        readRef.current = rmap;
        dismissRef.current = dmap;
        writeJSON(readKey(w.storageKey), rmap);
        writeJSON(dismissKey(w.storageKey), dmap);

        await scanAll();
        seededRef.current = true;
        return w;
      })();
    }

    let alive = true;

    bootRef.current
      .then((w) => {
        if (!alive) return;
        setNotifications(notifRef.current);
        setReadMap(readRef.current);
        setDismissMap(dismissRef.current);
        if (w) setWho(w);
        setBooting(false);
      })
      .catch(() => {
        if (alive) setBooting(false);
      });

    return () => { alive = false; };
  }, [scanAll]);

  useEffect(() => {
    if (!who || booting) return undefined;
    const ms = who.isHandler ? POLL_MS_HANDLER : POLL_MS_USER;
    const tick = () => {
      if (document.visibilityState === "visible") scanAll();
    };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [who, booting, scanAll]);

  useEffect(() => {
    if (!who || booting) return undefined;
    const onRefresh = () => scanAll();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [who, booting, scanAll]);

  useEffect(() => {
    if (!who || booting) return undefined;

    const ch = supabase
      .channel("mdrrmo-notif-v6")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (pl) => {
          const w = whoRef.current;
          if (!w || !w.authId) return;
          const row = pl.new;
          if (!row || String(row.user_id) !== String(w.authId)) return;

          const item = notifRowToItem(row, w);
          if (!item) return;
          if (dismissRef.current[item.id] !== undefined) return;
          if (notifRef.current.some((x) => x.id === item.id)) return;

          const n = { read: false, ...item };
          notifRef.current = [n, ...notifRef.current].slice(0, MAX_NOTIFICATIONS);
          setNotifications([...notifRef.current]);
          persistAll();
        }
      )
      .on("postgres_changes", { event: "*", schema: "public" }, (pl) => {
        const w = whoRef.current;
        if (!w) return;

        const src = SOURCE_MAP[pl.table];
        if (!src) return;
        if (!sourcesFor(w).some((s) => s.table === pl.table)) return;

        const row = pl.new;
        if (!row) return;

        const rid = idOf(src, row);
        const key = `${src.table}::${rid}`;
        const status = statusOf(src, row);
        const prev = cacheRef.current[key];
        const m = matchRow(src, row, w);
        const isQueue = src.scopes.includes("queue");
        const wantsQueue = src.queueRoles.includes(w.role) ||
          (w.isStaffRole && src.queueRoles.includes("staff"));

        if (pl.eventType === "INSERT" && seededRef.current) {
          if (!w.isHandler && m.ok) onCreated(src, row, "self");
          else if (w.isHandler && isQueue && wantsQueue) {
            onCreated(src, row, "queue");
          }
        }

        if (pl.eventType === "UPDATE" && prev !== status) {
          if (m.ok) onStatus(src, row, "self", status, prev);
          else if (w.isHandler && isQueue && wantsQueue) {
            onStatus(src, row, "queue", status, prev);
          }
        }

        cacheRef.current[key] = status;
        persistCache();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [who, booting, onCreated, onStatus, persistAll, persistCache]);

  const place = useCallback(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const m = 12;
    const w = Math.min(384, window.innerWidth - m * 2);
    const h = Math.min(460, window.innerHeight - m * 2);
    const r = btnRef.current.getBoundingClientRect();

    let left = r.right - w;
    if (left < m) left = m;
    if (left + w > window.innerWidth - m) left = window.innerWidth - w - m;

    const below = r.bottom + 8;
    const fits = below + h <= window.innerHeight - m;
    const above = r.top - h - 8;

    setPos({
      left,
      top: fits ? below : Math.max(m, above),
      width: w,
      listMax: fits ? undefined : Math.max(160, above - m - 110),
    });
  }, [open]);

  useLayoutEffect(() => { place(); }, [place]);

  useEffect(() => {
    if (!open) return undefined;
    const f = () => place();
    window.addEventListener("resize", f);
    window.addEventListener("scroll", f, true);
    return () => {
      window.removeEventListener("resize", f);
      window.removeEventListener("scroll", f, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open && !selected) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selected]);

  const isRead = useCallback(
    (n) => readMap[n.id] !== undefined,
    [readMap]
  );

  const unread = useMemo(
    () => notifications.filter((n) => readMap[n.id] === undefined).length,
    [notifications, readMap]
  );

  const markRead = useCallback((id) => {
    if (readRef.current[id] !== undefined) return;
    const next = { ...readRef.current, [id]: Date.now() };
    readRef.current = next;
    setReadMap(next);
    persistAll();

    if (id.startsWith("notification::")) {
      const dbId = id.split("::")[1];
      if (dbId) {
        void supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", dbId)
          .then(({ error }) => {
            if (error) dbg("mark read sync failed:", error.message);
          });
      }
    }
  }, [persistAll]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    const next = { ...readRef.current };
    const dbIds = [];
    notifRef.current.forEach((n) => {
      next[n.id] = now;
      if (n.id.startsWith("notification::")) {
        const dbId = n.id.split("::")[1];
        if (dbId) dbIds.push(dbId);
      }
    });
    readRef.current = next;
    setReadMap(next);
    persistAll();

    if (dbIds.length > 0) {
      void supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", dbIds)
        .then(({ error }) => {
          if (error) dbg("mark all read sync failed:", error.message);
        });
    }
  }, [persistAll]);

  const markUnread = useCallback((id) => {
    if (readRef.current[id] === undefined) return;
    const next = { ...readRef.current };
    delete next[id];
    readRef.current = next;
    setReadMap(next);
    persistAll();

    if (id.startsWith("notification::")) {
      const dbId = id.split("::")[1];
      if (dbId) {
        void supabase
          .from("notifications")
          .update({ is_read: false })
          .eq("id", dbId)
          .then(({ error }) => {
            if (error) dbg("mark unread sync failed:", error.message);
          });
      }
    }
  }, [persistAll]);

  const dismissOne = useCallback((id) => {
    if (dismissRef.current[id] !== undefined) return;
    const next = { ...dismissRef.current, [id]: Date.now() };
    dismissRef.current = next;
    setDismissMap(next);

    const kept = notifRef.current.filter((n) => n.id !== id);
    notifRef.current = kept;
    setNotifications(kept);

    setSelected((s) => (s && s.id === id ? null : s));

    persistAll();
  }, [persistAll]);

  const dismissAll = useCallback(() => {
    const now = Date.now();
    const d = { ...dismissRef.current };
    notifRef.current.forEach((n) => { d[n.id] = now; });
    dismissRef.current = d;
    setDismissMap(d);

    notifRef.current = [];
    setNotifications([]);
    persistAll();
  }, [persistAll]);

  const openItem = useCallback((n) => {
    markRead(n.id);
    setOpen(false);
    setSelected(n);
  }, [markRead]);

  const handleToggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const hardReset = useCallback(() => {
    const w = whoRef.current;
    if (!w) return;
    localStorage.removeItem(listKey(w.storageKey));
    localStorage.removeItem(readKey(w.storageKey));
    localStorage.removeItem(dismissKey(w.storageKey));
    localStorage.removeItem(cacheKey(w.storageKey));
    cacheRef.current = {};
    seededRef.current = false;
    notifRef.current = [];
    readRef.current = {};
    dismissRef.current = {};
    setNotifications([]);
    setReadMap({});
    setDismissMap({});
    setDiag({});
    setBlocked([]);
  }, []);

  const timeAgo = useCallback((iso) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
  }, []);

  /* New = unread; Earlier = read within 7 days; Old = read older than 7 days */
  const EARLIER_MS = 7 * 24 * 60 * 60 * 1000;

  const { newList, earlierList, oldList } = useMemo(() => {
    const now = Date.now();
    const unreadItems = [];
    const earlierItems = [];
    const oldItems = [];

    notifications.forEach((n) => {
      if (readMap[n.id] === undefined) {
        unreadItems.push(n);
        return;
      }
      const ts = new Date(n.createdAt).getTime();
      const age = Number.isNaN(ts) ? 0 : now - ts;
      if (age <= EARLIER_MS) earlierItems.push(n);
      else oldItems.push(n);
    });

    if (filter === "unread" || filter === "new") {
      return { newList: unreadItems, earlierList: [], oldList: [] };
    }
    if (filter === "earlier") {
      return { newList: [], earlierList: earlierItems, oldList: [] };
    }
    if (filter === "old") {
      return { newList: [], earlierList: [], oldList: oldItems };
    }

    return {
      newList: unreadItems,
      earlierList: earlierItems,
      oldList: oldItems,
    };
  }, [notifications, filter, readMap]);

  const earlierCount = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => {
      if (readMap[n.id] === undefined) return false;
      const ts = new Date(n.createdAt).getTime();
      const age = Number.isNaN(ts) ? 0 : now - ts;
      return age <= EARLIER_MS;
    }).length;
  }, [notifications, readMap]);

  const oldCount = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => {
      if (readMap[n.id] === undefined) return false;
      const ts = new Date(n.createdAt).getTime();
      const age = Number.isNaN(ts) ? 0 : now - ts;
      return age > EARLIER_MS;
    }).length;
  }, [notifications, readMap]);

  if (booting) {
    return (
      <div className="inline-flex p-2" role="status" aria-label="Loading notifications">
        <Loader2 className="h-5 w-5 animate-spin text-white/70" />
      </div>
    );
  }

  if (!who) return null;

  const filters = [
    { id: "all", label: "All", count: notifications.length },
    ...(unread > 0 ? [{ id: "new", label: "New", count: unread }] : []),
    ...(earlierCount > 0
      ? [{ id: "earlier", label: "Earlier", count: earlierCount }]
      : []),
    ...(oldCount > 0
      ? [{ id: "old", label: "Old", count: oldCount }]
      : []),
  ];

  const diagRows = Object.entries(diag);

  const renderItem = (n) => {
    const Icon = SOURCE_MAP[n.iconKey]?.icon || Bell;
    const wasRead = isRead(n);

    return (
      <div
        key={n.id}
        className={`flex items-start gap-2 border-b border-slate-50 dark:border-slate-700/60 px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
          wasRead
            ? "bg-white dark:bg-slate-800 opacity-70"
            : "bg-blue-50/60 dark:bg-blue-950/20"
        }`}
      >
        <button
          type="button"
          onClick={() => openItem(n)}
          className="flex items-start gap-3 flex-1 min-w-0 text-left"
        >
          <span
            className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${TONE_BG[n.tone]}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {n.title}
                {wasRead && (
                  <CheckCheck
                    className="inline w-3 h-3 ml-1 text-slate-400 align-middle"
                    aria-label="read"
                  />
                )}
              </span>
              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                {timeAgo(n.createdAt)}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 line-clamp-2 whitespace-pre-line">
              {n.message}
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {n.label}
              </span>
            </span>
          </span>
          {!wasRead && (
            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => dismissOne(n.id)}
          aria-label={`Delete notification: ${n.title}`}
          title="Delete"
          className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition shrink-0"
        >
          <Ban className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggleOpen}
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-white hover:bg-white/20 active:scale-95 transition"
      >
        {unread > 0 ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {typeof document !== "undefined" && createPortal(
        <>
          {open && (
            <div
              className="fixed inset-0 z-[99998]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}

          {open && pos && (
            <div
              style={{ left: pos.left, top: pos.top, width: pos.width }}
              className="notif-drop fixed z-[99999] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Notifications
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {who.role}
                    </span>
                  </p>
                  {unread > 0 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-0.5">
                      {unread} unread
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => scanAll()}
                    title="Refresh now"
                    aria-label="Refresh"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {notifications.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={markAllRead}
                        title="Mark all as read"
                        aria-label="Mark all as read"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={dismissAll}
                        title="Delete all"
                        aria-label="Delete all notifications"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {filters.length > 1 && (
                <div className="flex gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                        filter === f.id
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {f.label}
                      <span className="opacity-70">{f.count}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-y-auto" style={{ maxHeight: pos.listMax || 360 }}>
                {newList.length === 0 && earlierList.length === 0 && oldList.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                    <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {filter === "all"
                        ? "No notifications yet"
                        : filter === "new" || filter === "unread"
                          ? "Nothing new"
                          : filter === "earlier"
                            ? "Nothing earlier"
                            : filter === "old"
                              ? "Nothing old"
                              : "No notifications"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[16rem]">
                      {who.isHandler
                        ? "You'll be alerted when residents submit requests and when staff update the queues you handle — including hazard reports."
                        : "Submit an appointment, incident, vehicle request, check-up, or hazard report — you'll be alerted here whenever its status changes."}
                    </p>
                  </div>
                ) : (
                  <>
                    {newList.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 sticky top-0 z-10">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            New · {newList.length}
                          </p>
                        </div>
                        {newList.map(renderItem)}
                      </>
                    )}

                    {earlierList.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Earlier · {earlierList.length}
                          </p>
                        </div>
                        {earlierList.map(renderItem)}
                      </>
                    )}

                    {oldList.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Old · {oldList.length}
                          </p>
                        </div>
                        {oldList.map(renderItem)}
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                {blocked.length > 0 && (
                  <p className="px-4 pt-2 text-[10px] text-amber-600 dark:text-amber-400 text-center">
                    <AlertTriangle className="inline w-3 h-3 mr-1" />
                    Unreadable: {blocked.join(", ")}
                  </p>
                )}

                {DEBUG && diagRows.length > 0 && (
                  <details className="px-4 py-2">
                    <summary className="text-[10px] text-slate-400 dark:text-slate-500 cursor-pointer select-none flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Diagnostics ({diagRows.length}) ·{" "}
                      {notifications.length} shown ·{" "}
                      {Object.keys(readRef.current).length} read ·{" "}
                      {Object.keys(dismissRef.current).length} deleted
                    </summary>
                    <div className="mt-1.5 space-y-0.5 max-h-24 overflow-y-auto">
                      {diagRows.map(([t, d]) => (
                        <p
                          key={t}
                          className="text-[10px] font-mono text-slate-500 dark:text-slate-400"
                        >
                          {t}:{" "}
                          {d.error ? `ERR ${d.error}` : `${d.mine}/${d.total} mine`}
                          {d.via && Object.keys(d.via).length > 0 && (
                            <span className="text-slate-400">
                              {" "}via{" "}
                              {Object.entries(d.via)
                                .map(([k, v]) => `${k}:${v}`)
                                .join(",")}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={hardReset}
                      className="mt-2 w-full text-[10px] font-bold uppercase text-red-600 dark:text-red-400 hover:underline"
                    >
                      Clear cache &amp; re-scan
                    </button>
                  </details>
                )}

                <div className="px-4 py-2 flex items-center justify-center gap-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                    {who.isHandler ? "Admin / Staff" : "Resident"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selected && (() => {
            const ToneIcon = TONE_ICON[selected.tone] || Info;
            const wasRead = isRead(selected);
            return (
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                onClick={() => setSelected(null)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={selected.title}
                  className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`border-b px-6 py-4 ${TONE_HEADER[selected.tone]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${TONE_BG[selected.tone]}`}
                        >
                          <ToneIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                            {selected.title}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {selected.label} · #{selected.recordId} ·{" "}
                            {timeAgo(selected.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        aria-label="Close"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line mb-4">
                      {selected.message}
                    </p>

                    {selected.previousStatus && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                        Previous status:{" "}
                        <strong>{selected.previousStatus}</strong>
                      </p>
                    )}

                    {selected.scope === "queue" && (
                      <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Waiting in a queue you handle.
                      </p>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => dismissOne(selected.id)}
                        className="rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-700 px-3.5 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition"
                      >
                        <Ban className="w-4 h-4 inline mr-1" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => markUnread(selected.id)}
                        className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                      >
                        {wasRead ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const t = selected.link;
                          setSelected(null);
                          if (t) navigate(t);
                        }}
                        className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-md transition"
                      >
                        View Details
                      </button>
                    </div>

                    <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 text-center">
                      {wasRead
                        ? "Saved as read on this device."
                        : "Unread on this device."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </>,
        document.body
      )}

      <style>{`
        @keyframes notifDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-drop { animation: notifDrop 0.16s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}