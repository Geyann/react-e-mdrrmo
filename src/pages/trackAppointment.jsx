"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  CalendarDays, Clock, User, AlertCircle, CheckCircle, XCircle, Search,
  RefreshCw, Siren, Ambulance, Stethoscope, TriangleAlert, Plus, MapPin,
  Phone, Image as ImageIcon, ChevronDown, FileText, Activity, Package,
  Wrench, Calendar, X, Layers,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════════ */

const TABLES = [
  "appointments",
  "reportIncident",
  "borrow-vehicle",
  "outPatientCheckUp",
  "hazard_reports",
];

/* ══════════════════════════════════════════════════════════════════════
   STATUS METADATA
   ──────────────────────────────────────────────────────────────────────
   One map for every status string used anywhere in the app, normalised
   to a single tone so cards look identical across all five sources.
   ══════════════════════════════════════════════════════════════════════ */
const STATUS_META = {
  // appointments
  pending:   { label: "Pending Review",  tone: "amber",  icon: Clock },
  approved:  { label: "Approved",        tone: "emerald", icon: CheckCircle },
  confirmed: { label: "Confirmed",       tone: "blue",   icon: CheckCircle },
  // incident_reports
  active:      { label: "Active",       tone: "blue",   icon: Activity },
  "in progress": { label: "In Progress", tone: "blue",   icon: Activity },
  dispatched:   { label: "Dispatched",   tone: "indigo", icon: Ambulance },
  resolved:     { label: "Resolved",     tone: "emerald", icon: CheckCircle },
  ongoing:      { label: "Ongoing",      tone: "blue",   icon: Activity },
  // shared negatives
  rejected:   { label: "Rejected",       tone: "red",    icon: XCircle },
  declined:   { label: "Declined",       tone: "red",    icon: XCircle },
  cancelled:  { label: "Cancelled",      tone: "slate",  icon: XCircle },
  completed:  { label: "Completed",      tone: "emerald", icon: CheckCircle },
  // fallback
  unknown:    { label: "Unknown",        tone: "slate",  icon: Clock },
};

const statusMeta = (raw) => {
  const key = String(raw || "").trim().toLowerCase();
  return STATUS_META[key] || { label: raw || "Unknown", tone: "slate", icon: Clock };
};

const TONE_CLASSES = {
  amber:   "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  blue:    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  indigo:  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  red:     "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  slate:   "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  purple:  "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
};

/* ══════════════════════════════════════════════════════════════════════
   DATE / TIME HELPERS  (all date columns here are TEXT)
   ══════════════════════════════════════════════════════════════════════ */

const toKey = (value) => (value ? String(value).split("T")[0] : "");

const formatDateLong = (value) => {
  const key = toKey(value);
  if (!key) return "Date not set";
  const m = key.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return key;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

const to12h = (time) => {
  if (!time) return "";
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(time);
  const h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m[2]} ${suffix}`;
};

const timestampOf = (iso) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const timeAgo = (iso) => {
  const ms = Date.now() - timestampOf(iso);
  if (ms <= 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* ══════════════════════════════════════════════════════════════════════
   IDENTITY
   ──────────────────────────────────────────────────────────────────────
   Resolves EVERY id the current person might be stored as, because the
   five tables disagree on which one they use.
   ══════════════════════════════════════════════════════════════════════ */
const resolveIdentity = async () => {
  const ids = new Set();
  let authId = null;
  let pendingId = null;
  let profileId = null;
  let staffId = null;
  let workId = null;
  let name = "";
  let email = "";
  let isStaff = false;
  let exists = false;

  // 1. Supabase Auth session
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      authId = user.id;
      ids.add(user.id);
      email = user.email || "";
      exists = true;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, user_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        profileId = profile.id;
        ids.add(profile.id);
        if (profile.user_id) { workId = profile.user_id; ids.add(String(profile.user_id)); }
        name =
          profile.full_name ||
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          email;
      } else {
        name = email;
      }
    }
  } catch {
    /* no auth session, or the profiles read was blocked — continue */
  }

  // 2. Local resident session
  const rawUser = localStorage.getItem("currentUser");
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      exists = true;
      pendingId = u.id || null;
      if (u.user_id) ids.add(String(u.user_id));
      if (u.id) ids.add(String(u.id));
      if (!email) email = u.email || "";
      if (!name) {
        name =
          u.full_name ||
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.email ||
          "Resident";
      }

      // profiles row by email → gives us the profiles UUID used by
      // reportIncident.userId and borrow-vehicle.userId
      if (u.email) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, user_id")
          .eq("email", u.email)
          .maybeSingle();
        if (p) {
          profileId = p.id;
          ids.add(p.id);
          if (p.user_id) { workId = p.user_id; ids.add(String(p.user_id)); }
          if (!name || name === "Resident") {
            name = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || name;
          }
        }
      }
    } catch {
      /* malformed JSON — keep going */
    }
  }

  // 3. Local staff / admin session
  const rawStaff = localStorage.getItem("currentStaff");
  if (rawStaff) {
    try {
      const s = JSON.parse(rawStaff);
      exists = true;
      isStaff = true;
      staffId = s.id ?? null;
      if (staffId != null) ids.add(String(staffId));
      if (s.user_id) { workId = s.user_id; ids.add(String(s.user_id)); }
      if (s.email) ids.add(String(s.email));
      if (!email) email = s.email || "";
      name = s.full_name || s.username || s.user_id || "Staff Member";

      if (s.user_id) {
        const { data: row } = await supabase
          .from("staff_users")
          .select("id, full_name, email")
          .eq("user_id", s.user_id)
          .maybeSingle();
        if (row) {
          staffId = row.id;
          ids.add(String(row.id));
          name = row.full_name || name;
        }
      }
    } catch {
      /* malformed */
    }
  }

  // Drop blanks so comparisons never match an empty string
  for (const v of [...ids]) if (v === null || v === undefined || v === "") ids.delete(v);

  return { ids: [...ids], authId, pendingId, profileId, staffId, workId, name, email, isStaff, exists };
};

/* ══════════════════════════════════════════════════════════════════════
   OWNERSHIP MATCHING
   ══════════════════════════════════════════════════════════════════════ */
const rowBelongsTo = (row, idSet, opts = {}) => {
  if (idSet.size === 0) return false;

  for (const raw of Object.values(row)) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "object") continue; // skip arrays / jsonb
    if (idSet.has(String(raw))) return true;
  }

  // Fallbacks for rows written before the id columns were populated
  if (opts.email && opts.email === row.reporterContact) return true;
  if (opts.name && opts.name && row.requestedBy && opts.name === row.requestedBy) return true;
  if (opts.name && opts.name && row.patientName && opts.name === row.patientName) return true;

  return false;
};

/* ══════════════════════════════════════════════════════════════════════
   NORMALISERS → one common record shape
   ══════════════════════════════════════════════════════════════════════ */
const normalizeAppointment = (r) => ({
  key: `appt-${r.appointmentId}`,
  kind: "appointment",
  id: r.appointmentId,
  title: r.purpose || "Appointment",
  subject: r.fullName || "",
  status: r.status || "pending",
  dateText: r.date,
  timeText: r.time,
  detail: r.reason || "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  photo: null,
  photoCount: 0,
  fields: [
    r.email && { label: "Email", value: r.email },
    r.mobile_number && { label: "Mobile", value: r.mobile_number },
  ].filter(Boolean),
  cancellable: (r.status || "pending") === "pending",
});

const normalizeIncident = (r) => ({
  key: `inc-${r.reportIncidentId}`,
  kind: "incident",
  id: r.reportIncidentId,
  title: r.incidentType || "Incident Report",
  subject: r.patientName || "",
  status: r.status || "Pending",
  dateText: r.date,
  timeText: r.time,
  detail: r.adminResponse || "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  photo: r.pictureOfIncident || null,
  photoCount: r.pictureOfIncident ? 1 : 0,
  fields: [
    r.address && { label: "Address", value: r.address },
    r.landMark && { label: "Landmark", value: r.landMark },
    r.priorityLevel && { label: "Priority", value: r.priorityLevel },
    r.specialNeeds && { label: "Special needs", value: r.specialNeeds },
    r.requiredTools && { label: "Required tools", value: r.requiredTools },
  ].filter(Boolean),
  cancellable: false,
});

const normalizeBorrow = (r) => ({
  key: `bor-${r.borrowerId}`,
  kind: "borrow",
  id: r.borrowerId,
  title: r.purpose || "Vehicle Dispatch Request",
  subject: r.requestedBy || "",
  status: r.status || "Pending",
  dateText: r.date,
  timeText: r.time,
  detail: r.adminNotes || "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  photo: null,
  photoCount: 0,
  fields: [
    r.dispatchNum && { label: "Dispatch no.", value: r.dispatchNum },
    r.vehicle && { label: "Vehicle", value: r.vehicle.replace(/-/g, " ") },
    r.destination && { label: "Destination", value: r.destination },
    r.departure && r.arrival && { label: "Odometer", value: `${r.departure} → ${r.arrival}` },
  ].filter(Boolean),
  cancellable: (r.status || "Pending") === "Pending",
});

const normalizeCheckup = (r) => ({
  key: `chk-${r.id}`,
  kind: "checkup",
  id: r.id,
  title: r.patientFor ? `${r.patientFor.charAt(0).toUpperCase()}${r.patientFor.slice(1)}` : "Out-Patient Check-Up",
  subject: r.patientName || "",
  status: r.status || "Pending",
  dateText: r.preferredDate,
  timeText: r.preferredTime,
  detail: r.staffNote || "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  respondedAt: r.respondedAt,
  photo: null,
  photoCount: 0,
  fields: [
    r.hospitalName && { label: "Hospital", value: r.hospitalName },
    r.location && { label: "Location", value: r.location },
    r.mobility && { label: "Mobility", value: r.mobility.replace(/-/g, " ") },
    r.escort && { label: "Escort", value: r.escort },
  ].filter(Boolean),
  cancellable: ["pending", "approved"].includes(String(r.status || "pending").toLowerCase()),
});

const normalizeHazard = (r) => {
  const st = r.status || r.report_status || "pending";
  const photos = Array.isArray(r.hazard_photos) ? r.hazard_photos : [];
  return {
    key: `haz-${r.id}`,
    kind: "hazard",
    id: r.id,
    title: r.hazard_category
      ? `${r.hazard_category.charAt(0).toUpperCase()}${r.hazard_category.slice(1)} Hazard`
      : "Hazard Report",
    subject: r.reporter_name || "Anonymous",
    status: st,
    dateText: r.date_observed,
    timeText: r.time_observed,
    detail: r.hazard_description || "",
    createdAt: r.created_at,
    updatedAt: r.reviewed_at,
    photo: null,
    photoCount: photos.length,
    risk: r.risk_level || "",
    onMap: r.show_on_heatmap === true,
    fields: [
      r.address && { label: "Address", value: r.address },
      r.landmark && { label: "Landmark", value: r.landmark },
      r.risk_level && { label: "Risk level", value: r.risk_level },
      r.recommended_action && { label: "Recommended", value: r.recommended_action },
      r.admin_remarks && { label: "Admin remarks", value: r.admin_remarks },
    ].filter(Boolean),
    cancellable: String(st).toLowerCase() === "pending",
  };
};

/* ══════════════════════════════════════════════════════════════════════
   PRESENTATION
   ══════════════════════════════════════════════════════════════════════ */
const KIND_META = {
  appointment: { label: "Appointment",     short: "Appointments", icon: CalendarDays, route: "/appointment",  action: "Book Appointment" },
  incident:    { label: "Incident",        short: "Incidents",    icon: Siren,         route: "/report",      action: "Report Incident" },
  borrow:      { label: "Vehicle",         short: "Vehicles",     icon: Ambulance,     route: "/borrow",      action: "Request Vehicle" },
  checkup:     { label: "Check-Up",        short: "Check-Ups",    icon: Stethoscope,   route: "/checkup",     action: "Request Check-Up" },
  hazard:      { label: "Hazard",          short: "Hazards",      icon: TriangleAlert, route: "/hazard-report", action: "Report Hazard" },
};

const OPEN_STATUSES = new Set(["pending", "approved", "active", "in progress", "dispatched", "ongoing", "confirmed"]);
const DONE_STATUSES = new Set(["resolved", "completed"]);

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
const MyRequests = () => {
  const navigate = useNavigate();

  const [identity, setIdentity] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [cancellingId, setCancellingId] = useState(null);

  /* ── Load every table, then keep only what belongs to this person ── */
  const load = useCallback(async (who) => {
    if (!who) return;
    setRefreshing(true);
    setError("");

    const opts = { email: who.email, name: who.name };
    const idSet = new Set(who.ids.map(String));

    const results = await Promise.allSettled([
      supabase.from("appointments").select("*").order("created_at", { ascending: false }),
      supabase.from("reportIncident").select("*").order("created_at", { ascending: false }),
      supabase.from("borrow-vehicle").select("*").order("created_at", { ascending: false }),
      supabase.from("outPatientCheckUp").select("*").order("created_at", { ascending: false }),
      supabase.from("hazard_reports").select("*").order("created_at", { ascending: false }),
    ]);

    const labels = ["appointments", "incidents", "vehicle requests", "check-ups", "hazards"];
    const failed = [];

    const mine = {
      appointments: [],
      incidents: [],
      borrow: [],
      checkup: [],
      hazard: [],
    };

    const [
      apptRes, incRes, borRes, chkRes, hazRes,
    ] = results;

    if (apptRes.status === "fulfilled" && !apptRes.value.error) {
      mine.appointments = (apptRes.value.data || [])
        .filter((r) => rowBelongsTo(r, idSet, opts))
        .map(normalizeAppointment);
    } else if (apptRes.status === "rejected" || apptRes.value?.error) {
      failed.push(labels[0]);
    }

    if (incRes.status === "fulfilled" && !incRes.value.error) {
      // A lone staff member may have submitted before the reporter column was
      // populated, so accept rows already assigned to their staffId too.
      const staffRows = who.isStaff
        ? (incRes.value.data || []).filter((r) => !r.userId)
        : [];
      const found = (incRes.value.data || []).filter(
        (r) => rowBelongsTo(r, idSet, opts) || staffRows.includes(r)
      );
      mine.incidents = found.map(normalizeIncident);
    } else if (incRes.status === "rejected" || incRes.value?.error) {
      failed.push(labels[1]);
    }

    if (borRes.status === "fulfilled" && !borRes.value.error) {
      const rows = borRes.value.data || [];
      mine.borrow = rows
        .filter((r) => rowBelongsTo(r, idSet, opts) || (who.isStaff && r.staffId == who.staffId))
        .map(normalizeBorrow);
    } else if (borRes.status === "rejected" || borRes.value?.error) {
      failed.push(labels[2]);
    }

    if (chkRes.status === "fulfilled" && !chkRes.value.error) {
      mine.checkup = (chkRes.value.data || [])
        .filter((r) => rowBelongsTo(r, idSet, opts))
        .map(normalizeCheckup);
    } else if (chkRes.status === "rejected" || chkRes.value?.error) {
      failed.push(labels[3]);
    }

    if (hazRes.status === "fulfilled" && !hazRes.value.error) {
      mine.hazard = (hazRes.value.data || [])
        .filter((r) => rowBelongsTo(r, idSet, opts))
        .map(normalizeHazard);
    } else if (hazRes.status === "rejected" || hazRes.value?.error) {
      failed.push(labels[4]);
    }

    const all = [...mine.appointments, ...mine.incidents, ...mine.borrow, ...mine.checkup, ...mine.hazard];
    setRecords(all);

    if (failed.length) {
      setError(
        `Could not load: ${failed.join(", ")}. This is usually a row-level-security rule on that table, not a missing record.`
      );
    }
  }, []);

  /* ── Boot: resolve identity, then load ── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const who = await resolveIdentity();

      if (cancelled) return;

      if (!who.exists) {
        setLoading(false);
        navigate("/login", { replace: true, state: { error: "Please log in to view your requests." } });
        return;
      }

      setIdentity(who);
      await load(who);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [navigate, load]);

  /* ── Realtime: refresh when any watched table changes ── */
  useEffect(() => {
    if (!identity) return;
    const channel = supabase
      .channel("my-requests-watch")
      .on("postgres_changes", { event: "*", schema: "public" }, () => load(identity))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [identity, load]);

  /* ── Derived data ── */
  const counts = useMemo(() => {
    const c = { all: records.length, appointment: 0, incident: 0, borrow: 0, checkup: 0, hazard: 0 };
    let open = 0, done = 0, attention = 0;
    records.forEach((r) => {
      c[r.kind] += 1;
      const s = String(r.status || "").toLowerCase();
      if (OPEN_STATUSES.has(s)) open += 1;
      if (DONE_STATUSES.has(s)) done += 1;
      if (["rejected", "declined", "cancelled"].includes(s)) attention += 1;
    });
    return { ...c, open, done, attention };
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => (tab === "all" ? true : r.kind === tab))
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "open") return OPEN_STATUSES.has(String(r.status || "").toLowerCase());
        if (statusFilter === "done") return DONE_STATUSES.has(String(r.status || "").toLowerCase());
        if (statusFilter === "attention") return ["rejected", "declined", "cancelled"].includes(String(r.status || "").toLowerCase());
        return String(r.status || "").toLowerCase() === statusFilter;
      })
      .filter((r) => {
        if (!q) return true;
        return [
          r.title, r.subject, r.detail, r.status, r.dateText,
          ...(r.fields || []).map((f) => `${f.label} ${f.value}`),
        ].filter(Boolean).join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ta = timestampOf(b.updatedAt || b.createdAt) || new Date(b.dateText || 0).getTime() || 0;
        const tb = timestampOf(a.updatedAt || a.createdAt) || new Date(a.dateText || 0).getTime() || 0;
        return tb - ta;
      });
  }, [records, tab, statusFilter, query]);

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  /* ── Cancel a pending request ── */
  const handleCancel = async (rec) => {
    if (!window.confirm(`Cancel this ${KIND_META[rec.kind].label.toLowerCase()}? This cannot be undone.`)) return;
    setCancellingId(rec.key);
    setNotice("");

    try {
      let error = null;
      if (rec.kind === "appointment") {
        ({ error } = await supabase
          .from("appointments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("appointmentId", rec.id));
      } else if (rec.kind === "borrow") {
        ({ error } = await supabase
          .from("borrow-vehicle")
          .update({ status: "Cancelled", updated_at: new Date().toISOString() })
          .eq("borrowerId", rec.id));
      } else if (rec.kind === "checkup") {
        ({ error } = await supabase
          .from("outPatientCheckUp")
          .update({ status: "Cancelled", updated_at: new Date().toISOString() })
          .eq("id", rec.id));
      } else {
        ({ error } = await supabase
          .from("hazard_reports")
          .update({ status: "rejected", report_status: "rejected" })
          .eq("id", rec.id));
      }

      if (error) throw error;

      setNotice("Request cancelled successfully.");
      await load(identity);
    } catch (err) {
      setError(`Could not cancel: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  /* ── RENDER: loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-slate-300 font-semibold">Loading your requests...</p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  const tabs = [
    { id: "all", label: "All", icon: Layers, count: counts.all },
    { id: "appointment", label: "Appointments", icon: CalendarDays, count: counts.appointment },
    { id: "incident", label: "Incidents", icon: Siren, count: counts.incident },
    { id: "borrow", label: "Vehicles", icon: Ambulance, count: counts.borrow },
    { id: "checkup", label: "Check-Ups", icon: Stethoscope, count: counts.checkup },
    { id: "hazard", label: "Hazards", icon: TriangleAlert, count: counts.hazard },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10 mt-20">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl px-4 sm:px-6 py-8 text-center">
          <CalendarDays className="w-10 h-10 text-white/90 mx-auto" />
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">My Requests</h1>
          
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-slate-900 border border-t-0 border-gray-200 dark:border-slate-800 rounded-b-3xl shadow-xl p-4 sm:p-6 space-y-5">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: counts.all, color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300" },
              { label: "In Progress", value: counts.open, color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300" },
              { label: "Completed", value: counts.done, color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300" },
              { label: "Needs Attention", value: counts.attention, color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300" },
            ].map((s) => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color}`}>
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Banners */}
          {error && (
            <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}
          {notice && (
            <div role="status" className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{notice}</p>
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="ml-auto p-1 -mr-1 -mt-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search + status + refresh */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search by purpose, status, hospital, address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="open">In Progress</option>
              <option value="done">Completed</option>
              <option value="attention">Needs Attention</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              onClick={() => load(identity)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                    active
                      ? "bg-purple-600 text-white shadow"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/25" : "bg-slate-200 dark:bg-slate-700"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <FileText className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">
                {query || statusFilter !== "all" ? "No matching requests" : "No requests yet"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {query || statusFilter !== "all"
                  ? "Try clearing the search or status filter."
                  : "Once you submit an appointment, incident, vehicle request, check-up, or hazard report, it will appear here with live status updates."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((rec) => {
                const kind = KIND_META[rec.kind];
                const KindIcon = kind.icon;
                const meta = statusMeta(rec.status);
                const StatusIcon = meta.icon;
                const isOpen = expanded[rec.key];

                return (
                  <div
                    key={rec.key}
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition"
                  >
                    {/* Summary row */}
                    <div className="flex items-start gap-3 p-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                        <KindIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {kind.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${TONE_CLASSES[meta.tone]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          {rec.risk && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {rec.risk} risk
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{rec.title}</p>
                        {rec.subject && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{rec.subject}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {rec.dateText && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {formatDateLong(rec.dateText)}
                            </span>
                          )}
                          {rec.timeText && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {to12h(rec.timeText)}
                            </span>
                          )}
                          {rec.createdAt && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5" />
                              Submitted {timeAgo(rec.createdAt)}
                            </span>
                          )}
                          {rec.photoCount > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              {rec.photoCount} photo{rec.photoCount === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggle(rec.key)}
                        aria-label={isOpen ? "Hide details" : "Show details"}
                        aria-expanded={isOpen}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex-shrink-0"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Admin note (always visible — this is the part users care about) */}
                    {rec.detail && (
                      <div className="mx-4 mb-4 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                          {["approved", "confirmed", "completed", "resolved"].includes(String(rec.status || "").toLowerCase())
                            ? "Staff note"
                            : "Admin response"}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{rec.detail}</p>
                      </div>
                    )}

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {rec.photo && (
                          <a href={rec.photo} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={rec.photo}
                              alt="Attached evidence"
                              className="w-full max-h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                            />
                          </a>
                        )}

                        {rec.fields.length > 0 && (
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rec.fields.map((f, i) => (
                              <div key={i} className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                  {f.label}
                                </dt>
                                <dd className="text-sm text-slate-800 dark:text-slate-200 font-medium break-words">{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {rec.cancellable && (
                            <button
                              type="button"
                              onClick={() => handleCancel(rec)}
                              disabled={cancellingId === rec.key}
                              className="px-3.5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
                            >
                              {cancellingId === rec.key ? "Cancelling..." : "Cancel Request"}
                            </button>
                          )}
                          {rec.onMap && (
                            <Link
                              to="/hazardmap"
                              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                            >
                              <MapPin className="w-3.5 h-3.5" /> View on Map
                            </Link>
                          )}
                          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            #{rec.id}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              New Request
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(KIND_META).map(([id, k]) => {
                const Icon = k.icon;
                return (
                  <Link
                    key={id}
                    to={k.route}
                    className="flex flex-col items-center gap-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-center hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                  >
                    <Icon className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                      {k.action}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
            Showing {filtered.length} of {records.length} request{records.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyRequests;
