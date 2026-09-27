import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../createClient";
import {
  Stethoscope,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Calendar,
  User,
  Loader2,
  Eye,
  X,
  HeartPulse,
  FileText,
  Tag,
  CalendarClock,
  UserCircle,
  Hash,
  Download,
  Shield,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const CHECKUP_TABLE = "outPatientCheckUp";

const STATUS_META = {
  Pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  Approved: {
    label: "Approved",
    className:
      "bg-amber-100 text-amber-700 border border-amber-200",
  },
  Confirmed: {
    label: "Confirmed",
    className:
      "bg-blue-100 text-blue-700 border border-blue-200",
  },
  Completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  Declined: {
    label: "Declined",
    className:
      "bg-red-100 text-red-700 border border-red-200",
  },
  Cancelled: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-700 border border-slate-200",
  },
};

const STATUS_ALIASES = {
  pending: "Pending",
  approved: "Approved",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

const normalizeStatus = (value) => {
  const key = String(value || "Pending")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");

  return STATUS_ALIASES[key] || "Pending";
};

const safeText = (value) =>
  String(value ?? "")
    .trim();

const hasValue = (value) => {
  if (value === null || value === undefined) return false;

  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "null";
};

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => safeText(part))
    .filter(Boolean)
    .join(" ")
    .trim();

const mobilityLabel = (value) => {
  const labels = {
    stretcher: "Stretcher",
    "wheel-chair": "Wheel Chair",
    wheelchair: "Wheel Chair",
    walker: "Walker",
  };

  return labels[value] || value || "—";
};

const patientForLabel = (value) => {
  const labels = {
    admission: "Admission",
    discharge: "Discharge",
    "check-up": "Check Up",
    checkup: "Check Up",
  };

  return labels[value] || value || "—";
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const readLocalStaff = () => {
  try {
    const value = localStorage.getItem("currentStaff");
    if (!value) return null;

    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const requestSource = (checkup) => {
  if (hasValue(checkup.staffId)) {
    return {
      type: "Staff",
      className:
        "bg-purple-100 text-purple-700 border border-purple-200",
    };
  }

  return {
    type: "Resident",
    className:
      "bg-blue-100 text-blue-700 border border-blue-200",
  };
};

const accountIdLabel = (checkup) => {
  if (hasValue(checkup.staffId)) {
    return `Staff ID #${checkup.staffId}`;
  }

  if (hasValue(checkup.userId)) {
    return String(checkup.userId);
  }

  return "No account ID";
};

/* ══════════════════════════════════════════════════════════════════
   SHARED UI
   ══════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const meta = STATUS_META[normalized];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
        meta.className
      }`}
    >
      {meta.label}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value, full = false }) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return (
    <div
      className={`flex items-start gap-3 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
        <Icon className="h-4 w-4 text-purple-600" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="break-words text-sm font-medium text-slate-800">
          {displayValue}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHECK-UP TABLE
   ══════════════════════════════════════════════════════════════════ */

export default function CheckUpTable() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [checkups, setCheckups] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showReport, setShowReport] = useState(false);

  const selectedCheckup = useMemo(() => {
    if (!hasValue(selectedId)) return null;

    return (
      checkups.find(
        (checkup) => String(checkup.id) === String(selectedId),
      ) || null
    );
  }, [checkups, selectedId]);

  /* ── Fetch check-ups and account directories ──────────────────── */

  const fetchCheckups = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const { data, error: checkupError } = await supabase
        .from(CHECKUP_TABLE)
        .select("*")
        .order("id", { ascending: false });

      if (checkupError) {
        throw checkupError;
      }

      /*
       * Account-directory lookups are optional. The check-up rows can
       * still be displayed using reporter_name and their stored IDs if
       * RLS blocks either directory.
       */
      const [profileResult, staffResult] = await Promise.allSettled([
        supabase
          .from("profiles")
          .select(
            "id, user_id, full_name, first_name, middle_name, last_name, email, mobile_number",
          ),

        supabase
          .from("staff_users")
          .select(
            "id, user_id, full_name, email, role, department, mobile_number",
          ),
      ]);

      const profiles =
        profileResult.status === "fulfilled"
          ? profileResult.value.data || []
          : [];

      const staffRows =
        staffResult.status === "fulfilled"
          ? staffResult.value.data || []
          : [];

      const profileMap = new Map();

      profiles.forEach((profile) => {
        /*
         * Current schema: outPatientCheckUp.userId references
         * profiles.user_id.
         *
         * Also map profiles.id for compatibility with older rows.
         */
        if (hasValue(profile.user_id)) {
          profileMap.set(String(profile.user_id), profile);
        }

        if (hasValue(profile.id)) {
          profileMap.set(String(profile.id), profile);
        }
      });

      const staffMap = new Map();

      staffRows.forEach((staff) => {
        if (hasValue(staff.id)) {
          staffMap.set(String(staff.id), staff);
        }
      });

      /*
       * If direct staff lookup is blocked, use the currently logged-in
       * staff account only as a local fallback.
       */
      const localStaff = readLocalStaff();

      if (
        localStaff &&
        hasValue(localStaff.id) &&
        !staffMap.has(String(localStaff.id))
      ) {
        staffMap.set(String(localStaff.id), localStaff);
      }

      const enrichedCheckups = (data || []).map((checkup) => {
        const staffSubmission = hasValue(checkup.staffId);

        const profile = hasValue(checkup.userId)
          ? profileMap.get(String(checkup.userId)) || null
          : null;

        const staff = staffSubmission
          ? staffMap.get(String(checkup.staffId)) || null
          : null;

        const profileName = profile
          ? profile.full_name ||
            cleanName(
              profile.first_name,
              profile.middle_name,
              profile.last_name,
            )
          : "";

        /*
         * New rows always have reporter_name.
         *
         * Fallback values allow older rows without reporter_name to
         * remain readable.
         */
        const reporterName =
          safeText(checkup.reporter_name) ||
          safeText(staffSubmission ? staff?.full_name : profileName) ||
          (staffSubmission ? "Staff reporter" : "Unknown reporter");

        return {
          ...checkup,
          profile,
          staff,
          reporterName,
          source: requestSource(checkup),
          accountIdLabel: accountIdLabel(checkup),
        };
      });

      setCheckups(enrichedCheckups);
    } catch (err) {
      console.error("Error fetching checkups:", err);

      setError(
        "Failed to load check-up appointments: " +
          (err?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial load and realtime refresh ────────────────────────── */

  useEffect(() => {
    let active = true;

    fetchCheckups(true);

    const channel = supabase
      .channel("admin-checkup-table-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: CHECKUP_TABLE,
        },
        () => {
          if (active) {
            fetchCheckups(false);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchCheckups]);

  /* ── Filters ──────────────────────────────────────────────────── */

  const filteredCheckups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return checkups.filter((checkup) => {
      const status = normalizeStatus(checkup.status);
      const source = checkup.source.type;

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      const matchesSource =
        sourceFilter === "all" || source === sourceFilter;

      const searchableValues = [
        checkup.patientName,
        checkup.reporter_name,
        checkup.reporterName,
        checkup.userId,
        checkup.staffId,
        checkup.hospitalName,
        checkup.location,
        checkup.contactDetails,
        checkup.profile?.full_name,
        checkup.staff?.full_name,
        checkup.staff?.email,
        status,
        source,
      ];

      const matchesSearch =
        !query ||
        searchableValues
          .filter((value) => hasValue(value))
          .map((value) => String(value).toLowerCase())
          .join(" ")
          .includes(query);

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [checkups, searchTerm, sourceFilter, statusFilter]);

  /* ── Statistics ───────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const counts = {
      total: checkups.length,
      pending: 0,
      approved: 0,
      declined: 0,
      confirmed: 0,
      completed: 0,
      resident: 0,
      staff: 0,
    };

    checkups.forEach((checkup) => {
      const status = normalizeStatus(checkup.status);

      if (status === "Pending") counts.pending += 1;
      if (status === "Approved") counts.approved += 1;
      if (status === "Confirmed") counts.confirmed += 1;
      if (status === "Completed") counts.completed += 1;
      if (status === "Declined") counts.declined += 1;

      if (checkup.source.type === "Staff") {
        counts.staff += 1;
      } else {
        counts.resident += 1;
      }
    });

    return counts;
  }, [checkups]);

  /* ── Update status ────────────────────────────────────────────── */

  const handleStatusUpdate = useCallback(
    async (row, newStatus) => {
      if (savingId !== null) return;

      const normalizedStatus = normalizeStatus(newStatus);
      const currentStatus = normalizeStatus(row.status);

      if (currentStatus === normalizedStatus) return;

      const patientName = row.patientName || "Unknown patient";

      const action =
        normalizedStatus === "Approved" ? "approve" : "decline";

      const confirmed = window.confirm(
        action === "approve"
          ? `Approve check-up request #${row.id} for ${patientName}?`
          : `Decline check-up request #${row.id} for ${patientName}?`,
      );

      if (!confirmed) return;

      setSavingId(row.id);
      setError("");
      setSuccess("");

      try {
        const { error: updateError } = await supabase
          .from(CHECKUP_TABLE)
          .update({
            status: normalizedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          throw updateError;
        }

        await fetchCheckups(false);

        setSelectedId(null);

        setSuccess(
          normalizedStatus === "Approved"
            ? `Request #${row.id} approved. It is now available in the staff check-up queue.`
            : `Request #${row.id} declined.`,
        );

        window.dispatchEvent(
          new Event("mdrrmo:notif-refresh"),
        );
      } catch (err) {
        console.error("Error updating check-up status:", err);

        setError(
          `Failed to ${
            normalizedStatus === "Approved" ? "approve" : "decline"
          } request #${row.id}: ${
            err?.message || "Unknown error"
          }`,
        );
      } finally {
        setSavingId(null);
      }
    },
    [fetchCheckups, savingId],
  );

  /* ── Loading ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />

          <p className="mt-4 font-semibold text-gray-600 dark:text-slate-300">
            Loading check-up appointments...
          </p>
        </div>
      </div>
    );
  }

  /* ── Main table ───────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100 sm:text-3xl">
              <Stethoscope className="h-7 w-7 text-purple-600 sm:h-8 sm:w-8" />
              Check-up Appointments
            </h1>

            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Review resident and staff outpatient check-up requests
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReport(true)}
              disabled={checkups.length === 0}
              className="flex items-center gap-2 rounded-xl border border-purple-300 bg-white px-4 py-2 font-bold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-700 dark:bg-slate-800 dark:text-purple-300"
            >
              <Download className="h-4 w-4" />
              Summary Report
            </button>

            <button
              type="button"
              onClick={() => fetchCheckups(true)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Banners */}

        {success && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm font-medium text-green-700">
              {success}
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Statistics */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            {
              label: "Total Requests",
              value: stats.total,
              className:
                "border-blue-200 bg-blue-50 text-blue-700",
              icon: FileText,
            },
            {
              label: "Pending",
              value: stats.pending,
              className:
                "border-yellow-200 bg-yellow-50 text-yellow-700",
              icon: Clock,
            },
            {
              label: "Approved",
              value: stats.approved,
              className:
                "border-amber-200 bg-amber-50 text-amber-700",
              icon: CheckCircle,
            },
            {
              label: "Confirmed",
              value: stats.confirmed,
              className:
                "border-blue-200 bg-blue-50 text-blue-700",
              icon: CalendarClock,
            },
            {
              label: "Completed",
              value: stats.completed,
              className:
                "border-green-200 bg-green-50 text-green-700",
              icon: CheckCircle,
            },
            {
              label: "Declined",
              value: stats.declined,
              className:
                "border-red-200 bg-red-50 text-red-700",
              icon: XCircle,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 shadow-sm ${stat.className}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold opacity-70">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {stat.value}
                  </p>
                </div>

                <stat.icon className="h-7 w-7 shrink-0 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                aria-label="Search check-up requests"
                placeholder="Search patient, reporter, account ID, hospital, or location..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-slate-800 outline-none transition focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              aria-label="Filter by request source"
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Requesters</option>
              <option value="Resident">Resident Requests</option>
              <option value="Staff">Staff Requests</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Declined">Declined</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Resident requests:{" "}
              <strong>{stats.resident}</strong>
            </span>

            <span>
              Staff requests:{" "}
              <strong>{stats.staff}</strong>
            </span>
          </div>
        </div>

        {/* Check-up table */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    #
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    Reporter / Requester
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    Patient Name
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    Status
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    Submitted
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCheckups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center"
                    >
                      <AlertCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />

                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No check-up appointments found matching
                        your criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCheckups.map((checkup, index) => {
                    const isSaving =
                      savingId !== null &&
                      String(savingId) === String(checkup.id);

                    return (
                      <tr
                        key={checkup.id}
                        className="border-b border-slate-200 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-4 font-mono text-sm text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                              {(
                                checkup.reporterName?.charAt(0) ||
                                "?"
                              ).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {checkup.reporterName}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    checkup.source.className
                                  }`}
                                >
                                  {checkup.source.type}
                                </span>

                                <span className="font-mono text-[10px] text-slate-400">
                                  {checkup.accountIdLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                              {(
                                checkup.patientName?.charAt(0) ||
                                "?"
                              ).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {checkup.patientName || "—"}
                              </p>

                              <p className="max-w-[220px] truncate text-xs text-slate-400">
                                {checkup.hospitalName || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={checkup.status} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(checkup.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId(checkup.id)
                            }
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg bg-purple-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-600 disabled:opacity-50"
                            title="View full details"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}

                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredCheckups.length} of {checkups.length} total
          appointments
        </div>
      </div>

      {/* ── Details modal ────────────────────────────────────────── */}

      {selectedCheckup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkup-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header */}

            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <h2
                  id="checkup-details-title"
                  className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100"
                >
                  <FileText className="h-5 w-5 text-purple-600" />
                  Appointment Details — #{selectedCheckup.id}
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {selectedCheckup.source.type} request
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Status and actions */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={selectedCheckup.status} />

                {normalizeStatus(selectedCheckup.status) ===
                  "Pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(
                          selectedCheckup,
                          "Approved",
                        )
                      }
                      disabled={
                        savingId !== null &&
                        String(savingId) ===
                          String(selectedCheckup.id)
                      }
                      className="flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-600 disabled:bg-slate-300"
                    >
                      {savingId !== null &&
                      String(savingId) ===
                        String(selectedCheckup.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}

                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(
                          selectedCheckup,
                          "Declined",
                        )
                      }
                      disabled={
                        savingId !== null &&
                        String(savingId) ===
                          String(selectedCheckup.id)
                      }
                      className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:bg-slate-300"
                    >
                      {savingId !== null &&
                      String(savingId) ===
                        String(selectedCheckup.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}

                      Decline
                    </button>
                  </div>
                )}
              </div>

              {/* Reporter and account card */}

              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {(
                    selectedCheckup.reporterName?.charAt(0) ||
                    "?"
                  ).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Reporter: {selectedCheckup.reporterName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedCheckup.source.type === "Staff"
                      ? `Staff account ID: ${selectedCheckup.staffId}`
                      : `Resident user ID: ${
                          selectedCheckup.userId || "Not available"
                        }`}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selectedCheckup.source.className
                      }`}
                    >
                      {selectedCheckup.source.type} Request
                    </span>

                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      {selectedCheckup.accountIdLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Staff submitter information */}

              {selectedCheckup.source.type === "Staff" && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />

                    <div>
                      <p className="text-sm font-bold text-purple-800 dark:text-purple-200">
                        Submitted by staff
                      </p>

                      <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                        {selectedCheckup.staff?.full_name ||
                          "Verified staff account"}
                        {selectedCheckup.staff?.department
                          ? ` · ${selectedCheckup.staff.department}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full request details */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow
                  icon={User}
                  label="Patient Name"
                  value={selectedCheckup.patientName}
                />

                <DetailRow
                  icon={UserCircle}
                  label="Reporter Name"
                  value={selectedCheckup.reporterName}
                />

                <DetailRow
                  icon={Tag}
                  label="Patient For"
                  value={patientForLabel(
                    selectedCheckup.patientFor,
                  )}
                />

                <DetailRow
                  icon={MapPin}
                  label="Location / Address"
                  value={selectedCheckup.location}
                />

                <DetailRow
                  icon={Stethoscope}
                  label="Hospital Name"
                  value={selectedCheckup.hospitalName}
                />

                <DetailRow
                  icon={Phone}
                  label="Patient Contact"
                  value={selectedCheckup.contactDetails}
                />

                <DetailRow
                  icon={Calendar}
                  label="Preferred Date"
                  value={selectedCheckup.preferredDate}
                />

                <DetailRow
                  icon={Clock}
                  label="Preferred Time"
                  value={selectedCheckup.preferredTime}
                />

                <DetailRow
                  icon={HeartPulse}
                  label="Mobility"
                  value={mobilityLabel(
                    selectedCheckup.mobility,
                  )}
                />

                <DetailRow
                  icon={UserCircle}
                  label="Escort / Vehicle"
                  value={selectedCheckup.escort}
                />

                <DetailRow
                  icon={Hash}
                  label={
                    selectedCheckup.source.type === "Staff"
                      ? "Staff ID"
                      : "Resident User ID"
                  }
                  value={
                    selectedCheckup.source.type === "Staff"
                      ? `#${selectedCheckup.staffId}`
                      : selectedCheckup.userId
                  }
                />

                <DetailRow
                  icon={CalendarClock}
                  label="Submitted"
                  value={formatDateTime(
                    selectedCheckup.created_at,
                  )}
                />

                <DetailRow
                  icon={Hash}
                  label="Request ID"
                  value={`#${selectedCheckup.id}`}
                />

                <DetailRow
                  icon={Clock}
                  label="Last Updated"
                  value={formatDateTime(
                    selectedCheckup.updated_at,
                  )}
                />

                {selectedCheckup.staffNote && (
                  <DetailRow
                    icon={FileText}
                    label="Staff Note"
                    value={selectedCheckup.staffNote}
                    full
                  />
                )}
              </div>
            </div>

            {/* Modal footer */}

            <div className="flex items-center justify-end rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary report */}

      {showReport && (
        <CheckUpSummaryReportModal
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHECK-UP SUMMARY REPORT
   ══════════════════════════════════════════════════════════════════ */

function CheckUpSummaryReportModal({ onClose }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const todayKey = (() => {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  })();

  const applyPreset = (from, to) => {
    setFromDate(from);
    setToDate(to);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      setFetching(true);
      setFetchError("");

      try {
        let query = supabase
          .from(CHECKUP_TABLE)
          .select(
            "patientFor, mobility, preferredDate, status, hospitalName, location, escort, staffId",
          );

        if (fromDate) {
          query = query.gte("preferredDate", fromDate);
        }

        if (toDate) {
          query = query.lte("preferredDate", toDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!cancelled) {
          setRows(data || []);
        }
      } catch (err) {
        console.error("Error fetching report data:", err);

        if (!cancelled) {
          setFetchError(
            err?.message || "Unable to load report data.",
          );
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    fetchRows();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const stats = useMemo(() => {
    const countBy = (
      field,
      fallback,
      labeler = (value) => value,
    ) => {
      const counts = {};

      rows.forEach((row) => {
        const key = labeler(row[field] || fallback);
        counts[key] = (counts[key] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    const statusData = rows.reduce((result, row) => {
      const status = normalizeStatus(row.status);
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});

    const normalizedStatusData = Object.entries(statusData)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const patientForData = countBy(
      "patientFor",
      "Other",
      patientForLabel,
    );

    const mobilityData = countBy(
      "mobility",
      "Not Specified",
      mobilityLabel,
    );

    const hospitalData = countBy(
      "hospitalName",
      "Not Specified",
    );

    const locationData = countBy(
      "location",
      "Not Specified",
    );

    const escortCount = rows.filter(
      (row) => safeText(row.escort).length > 0,
    ).length;

    const staffCount = rows.filter(
      (row) => hasValue(row.staffId),
    ).length;

    const residentCount = rows.length - staffCount;

    return {
      statusData: normalizedStatusData,
      patientForData,
      mobilityData,
      hospitalData,
      locationData,
      escortCount,
      staffCount,
      residentCount,
      topPatientFor: patientForData[0] || null,
      topMobility: mobilityData[0] || null,
    };
  }, [rows]);

  const pct = (count) =>
    rows.length
      ? Math.round((count / rows.length) * 100)
      : 0;

  const pieColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  const barColors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f59e0b",
  ];

  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rangeLabel =
    fromDate || toDate
      ? `${fromDate || "Start"} → ${toDate || "End"}`
      : "All dates";

  const Card = ({ label, value, sub, color }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-bold opacity-70">{label}</p>

      <p className="mt-1 text-2xl font-bold">{value}</p>

      {sub && (
        <p className="mt-1 text-xs opacity-70">{sub}</p>
      )}
    </div>
  );

  const CountTable = ({
    title,
    data,
    total,
    max = 10,
  }) => (
    <div className="print-break-avoid">
      <h2 className="mb-3 font-bold text-slate-800">
        {title}
      </h2>

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">
          No check-ups in the covered range.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">
                Name
              </th>

              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                Count
              </th>

              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                Share
              </th>
            </tr>
          </thead>

          <tbody>
            {data.slice(0, max).map((entry) => (
              <tr
                key={entry.name}
                className="border-b border-slate-100"
              >
                <td className="border border-slate-200 p-2 font-semibold text-slate-700">
                  {entry.name}
                </td>

                <td className="border border-slate-200 p-2 text-center text-slate-600">
                  {entry.count}
                </td>

                <td className="border border-slate-200 p-2 text-center text-slate-600">
                  {pct(entry.count)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.length > max && (
        <p className="mt-2 text-xs text-slate-500">
          …and {data.length - max} more entries.
        </p>
      )}

      {total !== undefined && (
        <p className="mt-1 text-xs text-slate-400">
          Total in coverage: {total}
        </p>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body,
          #root,
          .app-shell,
          .content {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .report-overlay {
            position: static !important;
            overflow: visible !important;
            padding: 0 !important;
            background: none !important;
          }

          .report-print,
          .report-print * {
            visibility: visible;
          }

          .report-print {
            position: static !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }

          .report-print .print-hidden {
            display: none !important;
          }

          .report-print .print-break-avoid,
          .report-print .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="report-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="report-print my-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Screen-only toolbar */}

          <div className="print-hidden sticky top-0 z-10 rounded-t-2xl border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-bold leading-tight text-slate-800">
                    Check-up Summary Report
                  </h3>

                  <p className="text-xs leading-tight text-slate-400">
                    Adjust coverage, then print
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={fetching}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />

                  {fetching
                    ? "Loading…"
                    : "Print / Save PDF"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close report"
                  title="Close"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Coverage
              </span>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />

              <span className="text-sm text-slate-400">→</span>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />

              <div className="ml-1 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {[
                  {
                    label: "All Time",
                    from: "",
                    to: "",
                  },
                  {
                    label: "This Month",
                    from: `${todayKey.slice(0, 8)}01`,
                    to: todayKey,
                  },
                  {
                    label: "Today",
                    from: todayKey,
                    to: todayKey,
                  },
                ].map((preset) => {
                  const active =
                    fromDate === preset.from &&
                    toDate === preset.to;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        applyPreset(preset.from, preset.to)
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-800"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {rows.length} record
                {rows.length === 1 ? "" : "s"} loaded
              </span>
            </div>
          </div>

          {/* Report body */}

          <div className="p-8 text-slate-800">
            <div className="print-section mb-6 border-b-2 border-slate-800 pb-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                E-MDRRMO
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-900">
                OUTPATIENT CHECK-UP SUMMARY REPORT
              </h1>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Coverage: {rangeLabel}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  {rows.length} appointment
                  {rows.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Generated: {generatedAt}
              </p>
            </div>

            {fetchError ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Failed to load report data: {fetchError}
              </div>
            ) : fetching ? (
              <div className="py-16 text-center font-semibold text-slate-500">
                Loading report data…
              </div>
            ) : (
              <>
                {/* Summary cards */}

                <div className="print-break-avoid mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Card
                    label="Total Appointments"
                    value={rows.length}
                    sub="In coverage"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  />

                  <Card
                    label="Top Patient For"
                    value={
                      stats.topPatientFor
                        ? stats.topPatientFor.name
                        : "—"
                    }
                    sub={
                      stats.topPatientFor
                        ? `${stats.topPatientFor.count} requests`
                        : "No data"
                    }
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  />

                  <Card
                    label="Top Mobility"
                    value={
                      stats.topMobility
                        ? stats.topMobility.name
                        : "—"
                    }
                    sub={
                      stats.topMobility
                        ? `${stats.topMobility.count} requests`
                        : "No data"
                    }
                    className="border-violet-200 bg-violet-50 text-violet-700"
                  />

                  <Card
                    label="Escort Requests"
                    value={stats.escortCount}
                    sub={`${pct(stats.escortCount)}% of total`}
                    className="border-rose-200 bg-rose-50 text-rose-700"
                  />
                </div>

                {/* Status overview */}

                <div className="print-section mb-8">
                  <h2 className="mb-3 font-bold text-slate-800">
                    Status Overview
                  </h2>

                  {stats.statusData.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No check-ups in the covered range.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {stats.statusData.map((entry) => (
                        <Card
                          key={entry.name}
                          label={entry.name}
                          value={entry.count}
                          sub={`${pct(entry.count)}% of total`}
                          className="border-slate-200 bg-slate-50 text-slate-700"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Status chart */}

                {stats.statusData.length > 0 && (
                  <div className="print-section mb-8">
                    <h2 className="mb-3 font-bold text-slate-800">
                      Status Distribution
                    </h2>

                    <div className="h-[260px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <PieChart>
                          <Pie
                            data={stats.statusData.map(
                              (entry) => ({
                                ...entry,
                                value: entry.count,
                              }),
                            )}
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.statusData.map(
                              (_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    pieColors[
                                      index % pieColors.length
                                    ]
                                  }
                                />
                              ),
                            )}
                          </Pie>

                          <Tooltip />

                          <Legend
                            wrapperStyle={{
                              paddingTop: "10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Patient-for chart */}

                {stats.patientForData.length > 0 && (
                  <div className="print-section mb-8">
                    <h2 className="mb-3 font-bold text-slate-800">
                      Patient For Distribution
                    </h2>

                    <div className="h-[240px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={stats.patientForData}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e0e0e0"
                          />

                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <Tooltip
                            cursor={{
                              fill: "rgba(0,0,0,0.05)",
                            }}
                          />

                          <Bar
                            dataKey="count"
                            radius={[10, 10, 0, 0]}
                            barSize={40}
                          >
                            {stats.patientForData.map(
                              (_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    barColors[
                                      index % barColors.length
                                    ]
                                  }
                                />
                              ),
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Mobility chart */}

                {stats.mobilityData.length > 0 && (
                  <div className="print-section mb-8">
                    <h2 className="mb-3 font-bold text-slate-800">
                      Mobility Requirements
                    </h2>

                    <div className="h-[240px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart data={stats.mobilityData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e0e0e0"
                          />

                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <Tooltip
                            cursor={{
                              fill: "rgba(0,0,0,0.05)",
                            }}
                          />

                          <Bar
                            dataKey="count"
                            radius={[10, 10, 0, 0]}
                            barSize={40}
                          >
                            {stats.mobilityData.map(
                              (_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    barColors[
                                      index % barColors.length
                                    ]
                                  }
                                />
                              ),
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Requester source */}

                <div className="print-section mb-8">
                  <CountTable
                    title="Requests by Account Type"
                    data={[
                      {
                        name: "Resident",
                        count: stats.residentCount,
                      },
                      {
                        name: "Staff",
                        count: stats.staffCount,
                      },
                    ]}
                    total={rows.length}
                  />
                </div>

                {/* Aggregate tables */}

                <div className="mb-8 space-y-8">
                  <div className="print-section">
                    <CountTable
                      title="Check-ups by Status"
                      data={stats.statusData}
                      total={rows.length}
                    />
                  </div>

                  <div className="print-section">
                    <CountTable
                      title="Check-ups by Patient For"
                      data={stats.patientForData}
                      total={rows.length}
                    />
                  </div>

                  <div className="print-section">
                    <CountTable
                      title="Check-ups by Mobility"
                      data={stats.mobilityData}
                      total={rows.length}
                    />
                  </div>
                </div>

                <div className="mb-8 space-y-8">
                  <div className="print-section">
                    <CountTable
                      title="Top Hospitals"
                      data={stats.hospitalData}
                      max={10}
                    />
                  </div>

                  <div className="print-section">
                    <CountTable
                      title="Top Locations"
                      data={stats.locationData}
                      max={10}
                    />
                  </div>
                </div>

                <div className="print-break-avoid border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                  <p>
                    This report is system-generated and reflects data
                    at the time of generation. Reporter names and
                    account IDs are omitted from the printed summary.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
