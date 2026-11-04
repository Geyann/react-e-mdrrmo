import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../createClient";
import {
  Ambulance,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  User,
  FileText,
  Loader2,
  Download,
  Printer,
  Hash,
  Eye,
} from "lucide-react";
import { useDialog } from "../components/AppDialog";

function DetailRow({ icon: Icon, label, value, full = false }) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return (
    <div className={`flex items-start gap-3 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
        <Icon className="h-4 w-4 text-purple-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">
          {displayValue}
        </p>
      </div>
    </div>
  );
}

const BorrowedVehicles = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { showConfirm } = useDialog();

  // Review / details modal (same pattern as checkup table)
  const [selectedId, setSelectedId] = useState(null);

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDataForModal, setReportDataForModal] = useState([]);

  // Decline reason modal
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("borrow-vehicle")
        .select("*, profiles(id, full_name, user_id, email, mobile_number)")
        .order("borrowerId", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to load requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRequest = useMemo(() => {
    if (selectedId == null) return null;
    return (
      requests.find((r) => String(r.borrowerId) === String(selectedId)) || null
    );
  }, [requests, selectedId]);

  // ===== FORMATTERS =====
  const vehicleLabel = (v) => {
    const map = {
      ambulance: "Ambulance",
      "rescue-truck": "Rescue Truck",
      "utility-van": "Utility Van",
    };
    return map[v] || v || "—";
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const formatFullDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // ===== FILTERS =====
  const filteredRequests = requests.filter((r) => {
    const q = searchTerm.toLowerCase();
    const p = r.profiles || {};
    const matchesSearch =
      !searchTerm ||
      r.dispatchNum?.toLowerCase().includes(q) ||
      r.destination?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q) ||
      r.requestedBy?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.user_id?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.mobile_number?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || (r.status || "Pending") === statusFilter;
    const matchesVehicle =
      vehicleFilter === "all" || r.vehicle === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const handleGenerateReport = () => {
    setReportDataForModal(filteredRequests);
    setShowReportModal(true);
  };

  // ===== STATS =====
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => (r.status || "Pending") === "Pending")
      .length,
    approved: requests.filter((r) => r.status === "Approved").length,
    declined: requests.filter((r) => r.status === "Declined").length,
    ambulance: requests.filter((r) => r.vehicle === "ambulance").length,
    rescueTruck: requests.filter((r) => r.vehicle === "rescue-truck").length,
    utilityVan: requests.filter((r) => r.vehicle === "utility-van").length,
  };

  // ===== APPROVE (from details modal or after review) =====
  const handleApprove = async (row) => {
    if (!row) return;
    const name = row.profiles?.full_name || row.requestedBy || "Unknown";

    const confirmed = await showConfirm(
      `Approve dispatch request #${row.borrowerId} for ${name}?\n\nVehicle: ${vehicleLabel(row.vehicle)}\nDestination: ${row.destination || "—"}\nDate: ${row.date || "—"}${row.time ? ` ${row.time}` : ""}`,
    );
    if (!confirmed) return;

    setSavingId(row.borrowerId);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("borrow-vehicle")
      .update({
        status: "Approved",
        review_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("borrowerId", row.borrowerId);

    if (error) {
      setError("Failed to approve: " + error.message);
      setSavingId(null);
      return;
    }

    setSelectedId(null);
    await fetchRequests();
    setSavingId(null);
    setSuccess(`Dispatch request #${row.borrowerId} approved.`);
  };

  // ===== DECLINE (modal-driven, after reviewing details) =====
  const requestDecline = (row) => {
    setDeclineTarget(row);
    setDeclineReason(row.review_notes || "");
    setError("");
    setSuccess("");
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;

    const row = declineTarget;
    const trimmedReason = declineReason.trim();

    setSavingId(row.borrowerId);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("borrow-vehicle")
      .update({
        status: "Declined",
        review_notes: trimmedReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("borrowerId", row.borrowerId);

    if (error) {
      setError("Failed to decline: " + error.message);
      setSavingId(null);
      return;
    }

    setDeclineTarget(null);
    setDeclineReason("");
    setSelectedId(null);
    await fetchRequests();
    setSavingId(null);
    setSuccess(`Dispatch request #${row.borrowerId} declined.`);
  };

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      Pending: "bg-yellow-100 text-yellow-700",
      Approved: "bg-green-100 text-green-700",
      Declined: "bg-red-100 text-red-700",
    };
    const cls = map[status || "Pending"] || "bg-gray-100 text-gray-700";
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
        {status || "Pending"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600"></div>
          <p className="mt-4 font-semibold text-gray-600">
            Loading vehicle dispatch requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black text-slate-800">
              <Ambulance className="h-8 w-8 text-purple-600" />
              Borrowed Vehicles
            </h1>
            <p className="mt-1 text-slate-500">
              Review request details before approving or declining dispatch
              requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={filteredRequests.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Generate Report
            </button>

            <button
              type="button"
              onClick={fetchRequests}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white transition hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Banners */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-700">{success}</p>
          </div>
        )}
        {error && !declineTarget && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            {
              label: "Total Requests",
              value: stats.total,
              color: "bg-blue-50 border-blue-200 text-blue-700",
              icon: Ambulance,
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "bg-yellow-50 border-yellow-200 text-yellow-700",
              icon: Clock,
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "bg-green-50 border-green-200 text-green-700",
              icon: CheckCircle,
            },
            {
              label: "Declined",
              value: stats.declined,
              color: "bg-red-50 border-red-200 text-red-700",
              icon: XCircle,
            },
            {
              label: "Ambulances",
              value: stats.ambulance,
              color: "bg-indigo-50 border-indigo-200 text-indigo-700",
              icon: Ambulance,
            },
            {
              label: "Rescue Trucks",
              value: stats.rescueTruck,
              color: "bg-purple-50 border-purple-200 text-purple-700",
              icon: Ambulance,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 shadow-sm ${stat.color}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-70">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="h-7 w-7 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by requester, dispatch no., destination, purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Vehicles</option>
              <option value="ambulance">Ambulance</option>
              <option value="rescue-truck">Rescue Truck</option>
              <option value="utility-van">Utility Van</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    #
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Borrow ID
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Submitted
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Dispatch No.
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Vehicle
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Requested By
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Destination
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Date
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <AlertCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                      <p className="font-semibold text-slate-600">
                        No dispatch requests found matching your criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r, index) => {
                    const isPending = (r.status || "Pending") === "Pending";
                    const isSaving = savingId === r.borrowerId;
                    const isDeclined = r.status === "Declined";
                    return (
                      <tr
                        key={r.borrowerId}
                        className="border-b border-slate-200 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-mono text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 font-mono text-sm text-slate-600">
                          #{r.borrowerId}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {r.dispatchNum || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-slate-700">
                            {vehicleLabel(r.vehicle)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                              {(
                                r.profiles?.full_name?.charAt(0) ||
                                r.requestedBy?.charAt(0) ||
                                "?"
                              ).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                {r.profiles?.full_name ||
                                  r.requestedBy ||
                                  "Unknown"}
                              </p>
                              <p className="font-mono text-xs text-slate-400">
                                {r.profiles?.user_id || r.userId || ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-4 text-sm text-slate-600">
                          {r.destination || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {r.date}
                          {r.time ? ` ${r.time}` : ""}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={r.status} />
                            {isDeclined && r.review_notes && (
                              <p
                                className="max-w-[180px] truncate text-[10px] text-amber-700"
                                title={r.review_notes}
                              >
                                Reason: {r.review_notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedId(r.borrowerId)}
                              disabled={isSaving}
                              className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-700 disabled:bg-slate-300"
                              title="Review full request details"
                            >
                              <Eye className="h-3 w-3" />
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedId(r.borrowerId)}
                              disabled={!isPending || isSaving}
                              className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-600 disabled:bg-slate-300"
                              title="Review then approve"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedId(r.borrowerId)}
                              disabled={!isPending || isSaving}
                              className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:bg-slate-300"
                              title="Review then decline"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500">
          Showing {filteredRequests.length} of {requests.length} total requests
        </div>
      </div>

      {/* ── Request details modal (checkup-table style) ───────────── */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-5000 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => {
            if (!savingId) setSelectedId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="borrow-review-title"
            className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Ambulance className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="borrow-review-title"
                    className="text-lg font-black text-slate-800"
                  >
                    Review Dispatch Request
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    #{selectedRequest.borrowerId} ·{" "}
                    {selectedRequest.profiles?.full_name ||
                      selectedRequest.requestedBy ||
                      "Unknown requester"}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                disabled={savingId !== null}
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-5">
              {/* Requester summary */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {(
                    selectedRequest.profiles?.full_name?.charAt(0) ||
                    selectedRequest.requestedBy?.charAt(0) ||
                    "?"
                  ).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">
                    {selectedRequest.profiles?.full_name ||
                      selectedRequest.requestedBy ||
                      "Unknown"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    User ID:{" "}
                    {selectedRequest.profiles?.user_id ||
                      selectedRequest.userId ||
                      "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      {selectedRequest.profiles?.email || "No email"}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      {selectedRequest.profiles?.mobile_number || "No mobile"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full request details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow
                  icon={Hash}
                  label="Borrow ID"
                  value={`#${selectedRequest.borrowerId}`}
                />
                <DetailRow
                  icon={FileText}
                  label="Dispatch No."
                  value={selectedRequest.dispatchNum}
                />
                <DetailRow
                  icon={Ambulance}
                  label="Vehicle"
                  value={vehicleLabel(selectedRequest.vehicle)}
                />
                <DetailRow
                  icon={User}
                  label="Requested By"
                  value={
                    selectedRequest.profiles?.full_name ||
                    selectedRequest.requestedBy
                  }
                />
                <DetailRow
                  icon={Phone}
                  label="Contact"
                  value={
                    selectedRequest.profiles?.mobile_number ||
                    selectedRequest.contactNum ||
                    selectedRequest.contact
                  }
                />
                <DetailRow
                  icon={MapPin}
                  label="Destination"
                  value={selectedRequest.destination}
                />
                <DetailRow
                  icon={Calendar}
                  label="Date"
                  value={selectedRequest.date}
                />
                <DetailRow
                  icon={Clock}
                  label="Time"
                  value={selectedRequest.time}
                />
                <DetailRow
                  icon={FileText}
                  label="Purpose"
                  value={selectedRequest.purpose}
                  full
                />
                <DetailRow
                  icon={Calendar}
                  label="Submitted"
                  value={formatDateTime(selectedRequest.created_at)}
                />
                <DetailRow
                  icon={Clock}
                  label="Last Updated"
                  value={formatDateTime(selectedRequest.updated_at)}
                />
                {selectedRequest.review_notes && (
                  <DetailRow
                    icon={FileText}
                    label="Review Notes"
                    value={selectedRequest.review_notes}
                    full
                  />
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
             

              {(selectedRequest.status || "Pending") === "Pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => requestDecline(selectedRequest)}
                    disabled={savingId !== null}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={savingId !== null}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingId === selectedRequest.borrowerId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Borrowed Vehicles Report Modal */}
      {showReportModal && (
        <BorrowedVehiclesReportModal
          reportData={reportDataForModal}
          onClose={() => setShowReportModal(false)}
          vehicleLabel={vehicleLabel}
          formatDateTime={formatDateTime}
          formatFullDate={formatFullDate}
          filterSummary={{
            vehicle:
              vehicleFilter === "all"
                ? "All Vehicles"
                : vehicleLabel(vehicleFilter),
            status: statusFilter === "all" ? "All Status" : statusFilter,
          }}
        />
      )}

      {/* Decline Reason Modal */}
      {declineTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!savingId) {
              setDeclineTarget(null);
              setDeclineReason("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-dispatch-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="decline-dispatch-title"
                    className="font-bold text-slate-800"
                  >
                    Decline Dispatch Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    #{declineTarget.borrowerId} ·{" "}
                    {declineTarget.profiles?.full_name ||
                      declineTarget.requestedBy ||
                      "Unknown"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!savingId) {
                    setDeclineTarget(null);
                    setDeclineReason("");
                  }
                }}
                disabled={savingId !== null}
                aria-label="Close decline dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Mini details summary before declining */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>
                  <span className="font-bold text-slate-700">Vehicle:</span>{" "}
                  {vehicleLabel(declineTarget.vehicle)}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-700">Destination:</span>{" "}
                  {declineTarget.destination || "—"}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-700">Schedule:</span>{" "}
                  {declineTarget.date || "—"}
                  {declineTarget.time ? ` · ${declineTarget.time}` : ""}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-700">Purpose:</span>{" "}
                  {declineTarget.purpose || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-800">
                  The requester will see this reason
                </p>
                <p className="mt-1 text-xs leading-relaxed text-red-700">
                  The reason below is shown to the requester the next time they
                  open this dispatch request.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="dispatch-decline-reason"
                  className="mb-1 block text-sm font-bold text-slate-700"
                >
                  Reason for declining
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (optional, but recommended)
                  </span>
                </label>
                <textarea
                  id="dispatch-decline-reason"
                  rows={3}
                  maxLength={500}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. All ambulances are already dispatched for another emergency. Please contact the command center directly."
                  className="w-full resize-y rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {declineReason.length}/500 characters.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDeclineTarget(null);
                    setDeclineReason("");
                  }}
                  disabled={savingId !== null}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDecline}
                  disabled={savingId !== null}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {savingId !== null ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {savingId !== null ? "Declining..." : "Decline Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowedVehicles;

// =============================================
// BORROWED VEHICLES SUMMARIZED REPORT MODAL
// Print via hidden iframe — white PDF, summary only
// =============================================
function BorrowedVehiclesReportModal({
  reportData,
  onClose,
  vehicleLabel,
  formatDateTime,
  formatFullDate,
  filterSummary,
}) {
  const now = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const data = reportData || [];

  const statusCounts = { Pending: 0, Approved: 0, Declined: 0 };
  const vehicleCounts = {};
  const vehicleStatusMatrix = {};

  data.forEach((r) => {
    const status = r.status || "Pending";
    const vehicle = r.vehicle || "unknown";

    statusCounts[status] = (statusCounts[status] || 0) + 1;
    vehicleCounts[vehicle] = (vehicleCounts[vehicle] || 0) + 1;

    if (!vehicleStatusMatrix[vehicle]) vehicleStatusMatrix[vehicle] = {};
    vehicleStatusMatrix[vehicle][status] =
      (vehicleStatusMatrix[vehicle][status] || 0) + 1;
  });

  const vehicleRows = Object.keys(vehicleCounts);
  const statusCols = ["Pending", "Approved", "Declined"];
  const pct = (count) =>
    data.length ? Math.round((count / data.length) * 100) : 0;

  const summaryCards = [
    {
      label: "Total Requests",
      value: data.length,
      pct: 100,
      color: "bg-blue-50 border-blue-200 text-blue-700",
      icon: FileText,
    },
    {
      label: "Pending",
      value: statusCounts.Pending || 0,
      pct: pct(statusCounts.Pending || 0),
      color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      icon: Clock,
    },
    {
      label: "Approved",
      value: statusCounts.Approved || 0,
      pct: pct(statusCounts.Approved || 0),
      color: "bg-green-50 border-green-200 text-green-700",
      icon: CheckCircle,
    },
    {
      label: "Declined",
      value: statusCounts.Declined || 0,
      pct: pct(statusCounts.Declined || 0),
      color: "bg-red-50 border-red-200 text-red-700",
      icon: XCircle,
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handlePrint = () => {
    const card = (label, value, sub) => `
      <div class="card">
        <div class="card-label">${escapeHtml(label)}</div>
        <div class="card-value">${escapeHtml(value)}</div>
        ${sub ? `<div class="card-sub">${escapeHtml(sub)}</div>` : ""}
      </div>`;

    const topCards = summaryCards
      .map((c) => card(c.label, c.value, `${c.pct}% of total`))
      .join("");

    const matrixRows =
      vehicleRows.length === 0
        ? `<tr><td colspan="5">No data available for this report.</td></tr>`
        : vehicleRows
            .map((v) => {
              const m = vehicleStatusMatrix[v] || {};
              return `
          <tr>
            <td>${escapeHtml(vehicleLabel(v))}</td>
            ${statusCols
              .map((s) => `<td class="center">${m[s] || 0}</td>`)
              .join("")}
            <td class="center"><strong>${vehicleCounts[v]}</strong></td>
          </tr>`;
            })
            .join("") +
          `
          <tr class="total-row">
            <td><strong>All Vehicles</strong></td>
            ${statusCols
              .map(
                (s) =>
                  `<td class="center"><strong>${statusCounts[s] || 0}</strong></td>`,
              )
              .join("")}
            <td class="center"><strong>${data.length}</strong></td>
          </tr>`;

    const filterText = filterSummary
      ? `${filterSummary.vehicle} | ${filterSummary.status}`
      : "All data";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Borrowed Vehicles Dispatch Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { margin: 0; font-size: 20px; text-align: center; color: #000; }
    h2, .section-title {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 800;
      color: #000;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .muted { color: #334155; font-size: 11px; }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .card {
      border-radius: 10px;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #000000;
    }
    .card-label { font-size: 10px; font-weight: 700; }
    .card-value { font-size: 20px; font-weight: 800; margin-top: 2px; word-break: break-word; }
    .card-sub { font-size: 10px; margin-top: 2px; color: #334155; }
    .section { margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
      background: #ffffff;
      color: #000000;
    }
    th { font-size: 10px; border-bottom: 2px solid #94a3b8; }
    td.center, th.center { text-align: center; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      color: #334155;
      font-size: 10px;
      margin-top: 16px;
    }
    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      * {
        background: #ffffff !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        color: #000000 !important;
      }
      table, th, td, .card {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="header avoid-break">
    <h1>BORROWED VEHICLES DISPATCH REPORT</h1>
    <p class="muted" style="margin-top:8px">Generated: ${escapeHtml(now)}</p>
    <p class="muted">Filters: ${escapeHtml(filterText)}</p>
    <p class="muted">${data.length} request${data.length === 1 ? "" : "s"} in coverage</p>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Report Summary</h2>
    <div class="grid-4">${topCards}</div>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Breakdown by Vehicle &amp; Status</h2>
    <table>
      <thead>
        <tr>
          <th>Vehicle</th>
          ${statusCols.map((s) => `<th class="center">${escapeHtml(s)}</th>`).join("")}
          <th class="center">Total</th>
        </tr>
      </thead>
      <tbody>${matrixRows}</tbody>
    </table>
  </div>

  <div class="footer avoid-break">
    <p>This report is system-generated and reflects current filtered data.</p>
    <p>© ${new Date().getFullYear()} E-MDRRMO</p>
  </div>
</body>
</html>`;

    const existing = document.getElementById("borrow-vehicles-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "borrow-vehicles-print-frame";
    iframe.setAttribute("title", "Borrowed Vehicles Report Print");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Print failed:", err);
      }
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          /* ignore */
        }
      }, 60_000);
    };

    if (iframe.contentWindow.document.readyState === "complete") {
      setTimeout(triggerPrint, 300);
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-800">
            Borrowed Vehicles Report Preview
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-8 text-slate-800">
          <div className="mb-8 border-b border-slate-200 pb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              BORROWED VEHICLES DISPATCH REPORT
            </h1>
            <p className="mt-2 text-sm text-slate-500">Generated: {now}</p>
            <p className="mt-1 text-xs text-slate-400">
              Filters:{" "}
              {filterSummary
                ? `${filterSummary.vehicle} | ${filterSummary.status}`
                : "All data"}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="mb-3 font-bold text-slate-800">Report Summary</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {summaryCards.map((card, i) => (
                <div key={i} className={`rounded-xl border p-4 ${card.color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold opacity-70">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{card.value}</p>
                      <p className="text-xs opacity-70">{card.pct}% of total</p>
                    </div>
                    <card.icon className="h-6 w-6 opacity-70" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-3 font-bold text-slate-800">
              Breakdown by Vehicle &amp; Status
            </h2>
            {data.length === 0 ? (
              <p className="text-sm text-slate-500">
                No data available for this report.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">
                      Vehicle
                    </th>
                    {statusCols.map((s) => (
                      <th
                        key={s}
                        className="border border-slate-200 p-2 text-center font-bold text-slate-700"
                      >
                        {s}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleRows.map((v) => {
                    const m = vehicleStatusMatrix[v] || {};
                    return (
                      <tr key={v} className="border-b border-slate-100">
                        <td className="border border-slate-200 p-2 font-semibold text-slate-700">
                          {vehicleLabel(v)}
                        </td>
                        {statusCols.map((s) => (
                          <td
                            key={s}
                            className="border border-slate-200 p-2 text-center text-slate-600"
                          >
                            {m[s] || 0}
                          </td>
                        ))}
                        <td className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                          {vehicleCounts[v]}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-200 p-2 text-slate-700">
                      All Vehicles
                    </td>
                    {statusCols.map((s) => (
                      <td
                        key={s}
                        className="border border-slate-200 p-2 text-center text-slate-700"
                      >
                        {statusCounts[s] || 0}
                      </td>
                    ))}
                    <td className="border border-slate-200 p-2 text-center text-slate-800">
                      {data.length}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            <p>
              This report is system-generated and reflects current filtered
              data.
            </p>
            <p className="mt-1">© {new Date().getFullYear()} E-MDRRMO</p>
          </div>
        </div>
      </div>
    </div>
  );
}