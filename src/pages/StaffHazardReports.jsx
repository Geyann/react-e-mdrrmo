"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {useDialog} from "../components/AppDialog";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  TriangleAlert,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../createClient";
import {
  CATEGORY_ICONS as TAXONOMY_ICONS,
} from "../utils/HazardTaxonomy";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const HAZARD_PHOTO_BUCKET = "hazard-photos";

const CATEGORY_ICONS = { ...TAXONOMY_ICONS };

const HAZARD_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#eab308",
  low: "#22c55e",
};

/* Tabs shown at the top of the page */
const TABS = [
  { id: "assigned", label: "Assigned to Me", icon: UserRound },
  { id: "pending", label: "Unassigned Pending", icon: Clock },
  { id: "in_review", label: "Under Review", icon: Loader2 },
  { id: "resolved", label: "Resolved / History", icon: CheckCircle },
];

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const cleanText = (v) => String(v ?? "").trim();

const normalizeStatus = (v) =>
  String(v || "pending").trim().toLowerCase();

const getPhotoUrls = (paths, bucket = HAZARD_PHOTO_BUCKET) => {
  if (!Array.isArray(paths) || paths.length === 0) return [];
  return paths.map((p) => {
    if (typeof p === "string" && /^https?:\/\//i.test(p)) return p;
    const { data } = supabase.storage.from(bucket).getPublicUrl(p);
    return data?.publicUrl || p;
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeAgo = (value) => {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const readLocalStaff = () => {
  try {
    const raw = localStorage.getItem("currentStaff");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════════
   SMALL UI
   ══════════════════════════════════════════════════════════════════ */

function StatusPill({ status }) {
  const s = normalizeStatus(status);
  const cls =
    s === "approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : s === "rejected"
        ? "bg-red-100 text-red-700 border-red-300"
        : "bg-amber-100 text-amber-700 border-amber-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${cls}`}>
      {s}
    </span>
  );
}

function ReviewPill({ reviewStatus }) {
  const s = String(reviewStatus || "pending").toLowerCase();
  const map = {
    pending: "bg-slate-100 text-slate-700 border-slate-300",
    under_review: "bg-indigo-100 text-indigo-700 border-indigo-300",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-300",
  };
  const label =
    s === "under_review" ? "Under Review" : s === "resolved" ? "Resolved" : "Unreviewed";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${map[s] || map.pending}`}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-75">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black leading-none">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/60">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function StaffHazardReports() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();

  // Session
  const [staff, setStaff] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Data
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // UI
  const [tab, setTab] = useState("assigned");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Actions
  const [savingId, setSavingId] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");
  const [declineSaving, setDeclineSaving] = useState(false);

  const loadSeqRef = useRef(0);

  /* ── Resolve staff session ───────────────────────────────────── */

  useEffect(() => {
    const s = readLocalStaff();
    if (!s) {
      navigate("/admin", { replace: true });
      return;
    }
    const role = String(s.role || "").toLowerCase();
    if (role !== "staff" && role !== "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    setStaff(s);
    setSessionReady(true);
  }, [navigate]);

  /* ── Load reports ────────────────────────────────────────────── */

  const load = useCallback(async (showSpinner = true) => {
    const seq = ++loadSeqRef.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      // Pull everything — small enough dataset. We filter client-side
      // so the tab counters stay accurate even without SQL filters.
      const { data, error: fetchError } = await supabase
        .from("hazard_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (seq !== loadSeqRef.current) return;
      if (fetchError) throw fetchError;

      setReports(data || []);
    } catch (err) {
      console.error("Failed to load hazard reports:", err);
      if (seq === loadSeqRef.current) {
        setError(err?.message || "Failed to load hazard reports.");
      }
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    load(true);
  }, [sessionReady, load]);

  /* ── Realtime + periodic refresh ─────────────────────────────── */

  useEffect(() => {
    if (!sessionReady) return undefined;

    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => load(false), 400);
    };

    const ch = supabase
      .channel("staff-hazard-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hazard_reports" },
        scheduleRefresh,
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") load(false);
    }, 30000);

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, [sessionReady, load]);

  /* ── Derived: staff id ───────────────────────────────────────── */

  const staffId = useMemo(() => {
    if (!staff) return null;
    return staff.id != null ? String(staff.id) : null;
  }, [staff]);

  /* ── Classify rows into the four buckets ─────────────────────── */

  const buckets = useMemo(() => {
    const isAssignedToMe = (r) =>
      staffId != null &&
      r.assigned_to_staff_id != null &&
      String(r.assigned_to_staff_id) === staffId;

    const assigned = reports.filter((r) => {
      const review = String(r.review_status || "pending").toLowerCase();
      return isAssignedToMe(r) && review !== "resolved";
    });

    const pendingUnassigned = reports.filter((r) => {
      const status = String(r.status || "pending").toLowerCase();
      const review = String(r.review_status || "pending").toLowerCase();
      return status === "pending" && !r.assigned_to_staff_id && review === "pending";
    });

    const inReview = reports.filter((r) => {
      const review = String(r.review_status || "pending").toLowerCase();
      return review === "under_review";
    });

    const resolved = reports.filter((r) => {
      const review = String(r.review_status || "pending").toLowerCase();
      return review === "resolved" || String(r.status).toLowerCase() === "approved" || String(r.status).toLowerCase() === "rejected";
    });

    return {
      assigned,
      pending: pendingUnassigned,
      in_review: inReview,
      resolved,
    };
  }, [reports, staffId]);

  /* ── Tab + search filter ─────────────────────────────────────── */

  const visible = useMemo(() => {
    const list = buckets[tab] || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const haystack = [
        r.hazard_category,
        r.hazard_description,
        r.address,
        r.landmark,
        r.reporter_name,
        r.review_status,
        r.status,
        r.assigned_to_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [buckets, tab, query]);

  const totalCount = reports.length;

  /* ── CONFIRM (approve) ───────────────────────────────────────── */

  const handleConfirm = async (report) => {
    if (savingId) return;
    const ok = await showConfirm(
      `Confirm this hazard report?\n\n${report.hazard_category || "Hazard"} at ${report.address || "the reported location"}\n\nIt will become visible on the public heatmap.`,
    );
    if (!ok) return;

    setSavingId(report.id);
    setError("");

    try {
      const name = staff?.full_name || staff?.username || "Staff Member";
      const { error: upErr } = await supabase
        .from("hazard_reports")
        .update({
          status: "approved",
          report_status: "approved",
          review_status: "resolved",
          reviewed_by_staff_id: staff?.id ?? null,
          reviewed_by_name: name,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (upErr) throw upErr;

      // Fire the notif-refresh so the resident's bell updates.
      window.dispatchEvent(new Event("mdrrmo:notif-refresh"));

      await load(false);
    } catch (err) {
      console.error("Confirm failed:", err);
      setError(err?.message || "Failed to confirm the report.");
    } finally {
      setSavingId(null);
    }
  };

  /* ── DECLINE (reject with reason) ────────────────────────────── */

  const openDecline = (report) => {
    setDeclineTarget(report);
    setDeclineReason("");
    setDeclineError("");
  };

  const closeDecline = () => {
    if (declineSaving) return;
    setDeclineTarget(null);
    setDeclineReason("");
    setDeclineError("");
  };

  const submitDecline = async () => {
    if (!declineTarget || declineSaving) return;
    const reason = declineReason.trim();
    if (reason.length < 5) {
      setDeclineError("Please provide a reason (at least 5 characters).");
      return;
    }

    setDeclineSaving(true);
    setDeclineError("");
    setError("");

    try {
      const name = staff?.full_name || staff?.username || "Staff Member";
      const { error: upErr } = await supabase
        .from("hazard_reports")
        .update({
          status: "rejected",
          report_status: "rejected",
          review_status: "resolved",
          admin_remarks: reason,
          show_on_heatmap: false,
          reviewed_by_staff_id: staff?.id ?? null,
          reviewed_by_name: name,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", declineTarget.id);

      if (upErr) throw upErr;

      window.dispatchEvent(new Event("mdrrmo:notif-refresh"));

      setDeclineTarget(null);
      setDeclineReason("");
      await load(false);
    } catch (err) {
      console.error("Decline failed:", err);
      setDeclineError(err?.message || "Failed to decline the report.");
    } finally {
      setDeclineSaving(false);
    }
  };

  /* ── Card render ─────────────────────────────────────────────── */

  const renderReportCard = (report) => {
    const expanded = expandedId === report.id;
    const riskColor =
      HAZARD_COLORS[String(report.risk_level || "").toLowerCase()] || "#3b82f6";
    const photos = getPhotoUrls(report.hazard_photos);
    const isSaving = savingId === report.id;

    const canAct =
      String(report.status || "pending").toLowerCase() === "pending";

    return (
      <article
        key={report.id}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800"
      >
        <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />

        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex flex-wrap items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
              style={{ backgroundColor: riskColor }}
            >
              <TriangleAlert className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {CATEGORY_ICONS[String(report.hazard_category || "").toLowerCase()] || "⚠️"}{" "}
                  {report.hazard_category || "Hazard"}
                </span>
                <StatusPill status={report.status} />
                <ReviewPill reviewStatus={report.review_status} />
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                  style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                >
                  {report.risk_level || "unknown"} risk
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-800 sm:text-base dark:text-white line-clamp-1">
                {report.hazard_description || "No description provided."}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {report.address || "No address"}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {report.date_observed || "—"} {report.time_observed || ""}
                </span>
                {photos.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {photos.length} photo{photos.length === 1 ? "" : "s"}
                  </span>
                )}
                {report.assigned_to_name && (
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <UserRound className="h-3.5 w-3.5" />
                    Assigned to {report.assigned_to_name}
                  </span>
                )}
              </div>

              {report.admin_remarks && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Staff Remarks
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs text-amber-900 dark:text-amber-200">
                    {report.admin_remarks}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setExpandedId(expanded ? null : report.id)
              }
              aria-expanded={expanded}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950"
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              {/* Photos */}
              {photos.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Submitted Photos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-24 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
                      >
                        <img
                          src={url}
                          alt={`Hazard photo ${i + 1}`}
                          className="h-full w-full object-cover transition hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                  <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Reporter
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {report.reporter_name || "Anonymous"}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                  <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Contact
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {report.reporter_contact || "Not provided"}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                  <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Landmark
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {report.landmark || "—"}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                  <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Coordinates
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {Number(report.latitude).toFixed(5)},{" "}
                    {Number(report.longitude).toFixed(5)}
                  </dd>
                </div>
              </dl>

              {report.recommended_action && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Recommended Action
                  </p>
                  <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
                    {report.recommended_action}
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                Submitted {timeAgo(report.created_at)} ·{" "}
                {formatDateTime(report.created_at)}
              </p>

              {/* Actions */}
              {canAct ? (
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleConfirm(report)}
                    disabled={isSaving}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Confirm Report
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecline(report)}
                    disabled={isSaving}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline Report
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                  This report has already been {report.status}.
                </p>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  /* ── Loading ─────────────────────────────────────────────────── */

  if (!sessionReady || (loading && reports.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className={`${GRADIENT_CLASS} mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl`}>
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Loading hazard reports...
          </p>
        </div>
      </div>
    );
  }

  /* ── Page ────────────────────────────────────────────────────── */

  const counts = {
    assigned: buckets.assigned.length,
    pending: buckets.pending.length,
    in_review: buckets.in_review.length,
    resolved: buckets.resolved.length,
  };

  return (
    <div className="relative isolate min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/staff/dashboard")}
              className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
                <TriangleAlert className="h-7 w-7 text-rose-600" />
                Hazard Reports
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review assigned hazards, confirm verified reports, or decline invalid ones.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => load(false)}
            disabled={refreshing}
            className={`${GRADIENT_CLASS} inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="font-semibold leading-6">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={UserRound}
            label="Assigned to Me"
            value={counts.assigned}
            tone="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
          />
          <StatCard
            icon={Clock}
            label="Unassigned Pending"
            value={counts.pending}
            tone="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          />
          <StatCard
            icon={Loader2}
            label="Under Review"
            value={counts.in_review}
            tone="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          />
          <StatCard
            icon={CheckCircle}
            label="Resolved / History"
            value={counts.resolved}
            tone="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          />
        </div>

        {/* Tabs + search */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center">
          <div
            role="tablist"
            aria-label="Hazard report categories"
            className="no-scrollbar flex gap-2 overflow-x-auto"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              const count = counts[t.id] || 0;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black transition ${
                    active
                      ? "border-transparent bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 lg:max-w-sm lg:ml-auto">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category, address, reporter..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <TriangleAlert className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-black text-slate-700 dark:text-slate-200">
              Nothing here right now
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              There are no hazard reports in this tab
              {query ? " matching your search" : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map(renderReportCard)}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Showing {visible.length} of {totalCount} total hazard reports
        </p>
      </div>

      {/* ── Decline reason modal ───────────────────────────────── */}
      {declineTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={closeDecline}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-hazard-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="decline-hazard-title"
                    className="text-base font-black text-slate-800 dark:text-white"
                  >
                    Decline Hazard Report
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {declineTarget.hazard_category || "Hazard"} ·{" "}
                    {declineTarget.address || "unknown location"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDecline}
                disabled={declineSaving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p className="text-sm font-black text-red-800 dark:text-red-200">
                  The reporter will see this reason
                </p>
                <p className="mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300">
                  It will be shown in their notification bell and on the public
                  map report page. Please be specific.
                </p>
              </div>

              {declineError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{declineError}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="decline-hazard-reason"
                  className="mb-1 block text-sm font-black text-slate-700 dark:text-slate-200"
                >
                  Reason for declining
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (at least 5 characters)
                  </span>
                </label>
                <textarea
                  id="decline-hazard-reason"
                  rows={4}
                  maxLength={500}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. The report is a duplicate of an existing submission. Please do not re-submit."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {declineReason.length}/500 characters.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeDecline}
                  disabled={declineSaving}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDecline}
                  disabled={declineSaving || declineReason.trim().length < 5}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {declineSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Decline Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}