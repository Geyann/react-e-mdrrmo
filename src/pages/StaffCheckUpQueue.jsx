import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../createClient';
import {
  ClipboardCheck, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  MapPin, Phone, Calendar, Loader2, Bell, CheckCheck, FileText, Download, X
} from 'lucide-react';
import { useDialog } from '../components/AppDialog';

/** Philippine mobile: 09XXXXXXXXX (11) or +639XXXXXXXXX (13) */
function normalizePHMobile(raw) {
  if (raw == null) return null;
  let v = String(raw).trim().replace(/[\s\-()]/g, "");

  if (v.startsWith("+639") && /^\+639\d{9}$/.test(v)) return v;
  if (v.startsWith("639") && /^639\d{9}$/.test(v)) return `+${v}`;
  if (v.startsWith("09") && /^09\d{9}$/.test(v)) return v;
  // bare 9XXXXXXXXX (10 digits) → 09XXXXXXXXX
  if (/^9\d{9}$/.test(v)) return `0${v}`;

  return null;
}

function isValidPHMobile(raw) {
  return normalizePHMobile(raw) !== null;
}

/** Display helper: show normalized PH mobile when possible, otherwise original text. */
function formatContactDisplay(raw) {
  if (raw == null || String(raw).trim() === "") return "—";
  const normalized = normalizePHMobile(raw);
  return normalized || String(raw).trim();
}

const StaffCheckUpQueue = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [responseFilter, setResponseFilter] = useState('awaiting'); // all | awaiting | completed | declined
  const [checkups, setCheckups] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReport, setShowReport] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  useEffect(() => {
    fetchQueue();

    // Realtime: queue updates instantly when admin approves a new row.
    // Requires Supabase Realtime enabled (Database -> Replication).
    const channel = supabase
      .channel('outPatientCheckUp-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outPatientCheckUp' },
        () => fetchQueue()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('outPatientCheckUp')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      // Staff only sees requests the admin approved, plus the ones staff
      // already finished or declined (a staff decline always has a staffNote;
      // an admin decline uses review_notes and never reaches staff).
      const relevant = (data || []).filter(
        (c) =>
          ['Approved', 'Confirmed', 'Completed'].includes(c.status) ||
          (c.status === 'Declined' && c.staffNote)
      );
      setCheckups(relevant);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError('Failed to load queue: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setNote = (id, value) =>
    setNoteDrafts((prev) => ({ ...prev, [id]: value }));

  // ===== FORMATTERS =====
  const mobilityLabel = (v) => {
    const map = {
      stretcher: 'Stretcher',
      'wheel-chair': 'Wheel Chair',
      walker: 'Walker',
    };
    return map[v] || v || '—';
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ===== FILTERS =====
  const filteredQueue = checkups.filter((c) => {
    const q = searchTerm.toLowerCase();
    const contactDisplay = formatContactDisplay(c.contactDetails);
    const matchesSearch =
      !searchTerm ||
      c.patientName?.toLowerCase().includes(q) ||
      c.hospitalName?.toLowerCase().includes(q) ||
      c.contactDetails?.toLowerCase().includes(q) ||
      contactDisplay.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.preferredDate?.toLowerCase().includes(q);

    const matchesResponse =
      responseFilter === 'all' ||
      (responseFilter === 'awaiting' && ['Approved', 'Confirmed'].includes(c.status)) ||
      (responseFilter === 'completed' && c.status === 'Completed') ||
      (responseFilter === 'declined' && c.status === 'Declined');

    return matchesSearch && matchesResponse;
  });

  // ===== STATS =====
  const stats = {
    awaiting: checkups.filter((c) => ['Approved', 'Confirmed'].includes(c.status)).length,
    declined: checkups.filter((c) => c.status === 'Declined').length,
    completed: checkups.filter((c) => c.status === 'Completed').length,
    total: checkups.length,
  };

  // ===== STAFF RESPONSES =====
  const handleComplete = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!await showConfirm(`Mark check-up #${row.id} for ${name} as done?`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({
        status: 'Completed',
        updated_at: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        staffNote: noteDrafts[row.id]?.trim() || row.staffNote || null,
      })
      .eq('id', row.id);

    if (error) {
      setError('Failed to complete: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchQueue();
    setSavingId(null);
    setSuccess(`Check-up #${row.id} marked as done.`);
  };

  const handleDecline = async (row) => {
    const name = row.patientName || 'Unknown';
    const note = (noteDrafts[row.id] || row.staffNote || '').trim();
    if (!note) {
      setSuccess('');
      setError('Please add a note explaining why before declining. The requester will see it.');
      return;
    }
    if (!await showConfirm(`Decline check-up #${row.id} for ${name}? The requester will see your note.`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({
        status: 'Declined',
        updated_at: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        staffNote: note,
        review_notes: note,
      })
      .eq('id', row.id);

    if (error) {
      setError('Failed to decline: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchQueue();
    setSavingId(null);
    setSuccess(`Check-up #${row.id} declined.`);
  };

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      Approved: 'bg-amber-100 text-amber-700',
      Confirmed: 'bg-amber-100 text-amber-700',
      Completed: 'bg-green-100 text-green-700',
      Declined: 'bg-red-100 text-red-700',
    };
    const label = {
      Approved: 'To Do',
      Confirmed: 'To Do',
      Completed: 'Done',
      Declined: 'Declined',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cls}`}>
        {label[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading staff queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate- min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-purple-600" />
              Staff Check-up Queue
            </h1>
            <p className="text-slate-500 mt-1">
              Check-up requests approved by the administrator. Mark each one done once it has been handled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowReport(true)}
              disabled={checkups.length === 0}
              className="px-4 py-2 bg-white text-purple-700 border border-purple-300 rounded-xl font-bold hover:bg-purple-50 transition flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
            <button
              onClick={fetchQueue}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Banners */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-700">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}
        {stats.awaiting > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              {stats.awaiting} approved check-up(s) waiting for you — mark them done or decline with a note.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'To Do', value: stats.awaiting, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: Bell },
            { label: 'Done', value: stats.completed, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCheck },
            { label: 'Declined', value: stats.declined, color: 'bg-red-50 border-red-200 text-red-700', icon: XCircle },
            { label: 'Total', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-700', icon: ClipboardCheck },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl border ${stat.color} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-70">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className="w-7 h-7 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient, hospital, contact, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <select
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="awaiting">To Do</option>
              <option value="completed">Done</option>
              <option value="declined">Declined</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">ID</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Patient</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Contact</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Hospital</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Location</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Preferred Schedule</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Mobility</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Staff Note</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">Nothing to respond to right now.</p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((c, index) => {
                    const isSaving = savingId === c.id;
                    const isAwaiting = ['Approved', 'Confirmed'].includes(c.status);
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-slate-200 transition ${
                          isAwaiting ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                        <td className="px-4 py-4 text-sm font-mono text-slate-600">#{c.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {(c.patientName?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">{c.patientName || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>{formatContactDisplay(c.contactDetails)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 max-w-[160px] truncate">{c.hospitalName || '—'}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600 max-w-[160px]">
                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{c.location || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>
                              {c.preferredDate || '—'}
                              {c.preferredTime ? <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Clock className="w-3 h-3" />{c.preferredTime}</span> : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {mobilityLabel(c.mobility)}
                          </span>
                        </td>
                        <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-4">
                          {c.staffNote || !isAwaiting ? (
                            <p className="text-sm text-slate-600 max-w-[160px]">{c.staffNote || '—'}</p>
                          ) : (
                            <input
                              type="text"
                              placeholder="Note (required to decline)"
                              value={noteDrafts[c.id] || ''}
                              onChange={(e) => setNote(c.id, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {isAwaiting && (
                              <>
                                <button
                                  onClick={() => handleComplete(c)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                                  title="Mark as done"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                  Mark Done
                                </button>
                                <button
                                  onClick={() => handleDecline(c)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                                  title="Decline (add a note first)"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                  Decline
                                </button>
                              </>
                            )}
                            {c.status === 'Completed' && (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Done
                              </span>
                            )}
                            {c.status === 'Declined' && (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Declined
                              </span>
                            )}
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

        <div className="mt-4 text-sm text-slate-500 text-center">
          Showing {filteredQueue.length} of {checkups.length} check-ups
        </div>
      </div>

      {showReport && (
        <StaffCheckUpReportModal
          rows={checkups}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

/* =============================================================
 * STAFF CHECK-UP REPORT (by specific date, month, or range)
 * ============================================================= */

const REPORT_STATUS_LABEL = {
  Approved: 'To Do',
  Confirmed: 'To Do',
  Completed: 'Done',
  Declined: 'Declined',
};

const reportMobility = (v) =>
  ({ stretcher: 'Stretcher', 'wheel-chair': 'Wheel Chair', wheelchair: 'Wheel Chair', walker: 'Walker' }[v] || v || 'Not specified');

const reportPatientFor = (v) =>
  ({ admission: 'Admission', discharge: 'Discharge', 'check-up': 'Check Up', checkup: 'Check Up' }[v] || v || 'Other');

const localDateKey = (d = new Date()) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

/** The date a check-up belongs to: its preferred date, else the day it was filed. */
const checkupDateKey = (c) => {
  const preferred = String(c.preferredDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(preferred)) return preferred;
  return c.created_at ? localDateKey(new Date(c.created_at)) : '';
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function StaffCheckUpReportModal({ rows, onClose }) {
  const today = localDateKey();
  const [mode, setMode] = useState('month'); // day | month | range | all
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeNames, setIncludeNames] = useState(false);

  const inCoverage = useMemo(() => {
    return rows
      .filter((c) => {
        const key = checkupDateKey(c);
        if (mode === 'all') return true;
        if (!key) return false;
        if (mode === 'day') return key === day;
        if (mode === 'month') return key.startsWith(month);
        return (!fromDate || key >= fromDate) && (!toDate || key <= toDate);
      })
      .sort((a, b) =>
        `${checkupDateKey(a)} ${a.preferredTime || ''}`.localeCompare(
          `${checkupDateKey(b)} ${b.preferredTime || ''}`
        )
      );
  }, [rows, mode, day, month, fromDate, toDate]);

  const rangeLabel = useMemo(() => {
    const fmt = (key) => {
      const d = new Date(`${key}T00:00:00`);
      return Number.isNaN(d.getTime())
        ? key
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    if (mode === 'day') return fmt(day);
    if (mode === 'month') {
      const d = new Date(`${month}-01T00:00:00`);
      return Number.isNaN(d.getTime())
        ? month
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    if (mode === 'range') {
      return fromDate || toDate
        ? `${fromDate ? fmt(fromDate) : 'Start'} to ${toDate ? fmt(toDate) : 'End'}`
        : 'All dates';
    }
    return 'All dates';
  }, [mode, day, month, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = inCoverage.length;
    const todo = inCoverage.filter((c) => ['Approved', 'Confirmed'].includes(c.status)).length;
    const done = inCoverage.filter((c) => c.status === 'Completed').length;
    const declined = inCoverage.filter((c) => c.status === 'Declined').length;
    const handled = done + declined;

    const countBy = (fn) => {
      const counts = {};
      inCoverage.forEach((c) => {
        const k = fn(c);
        counts[k] = (counts[k] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      total,
      todo,
      done,
      declined,
      completionRate: total ? Math.round((done / total) * 100) : 0,
      handledRate: total ? Math.round((handled / total) * 100) : 0,
      byMobility: countBy((c) => reportMobility(c.mobility)),
      byPatientFor: countBy((c) => reportPatientFor(c.patientFor)),
      byHospital: countBy((c) => c.hospitalName || 'Not specified'),
    };
  }, [inCoverage]);

  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const pct = (n) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  const handlePrint = () => {
    const card = (label, value, sub) => `
      <div class="card">
        <div class="card-label">${escapeHtml(label)}</div>
        <div class="card-value">${escapeHtml(value)}</div>
        ${sub ? `<div class="card-sub">${escapeHtml(sub)}</div>` : ''}
      </div>`;

    const countTable = (title, data, max = 10) => `
      <div class="section avoid-break">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        <table>
          <thead><tr><th>Name</th><th class="center">Count</th><th class="center">Share</th></tr></thead>
          <tbody>${
            data.length === 0
              ? '<tr><td colspan="3">No check-ups in the covered range.</td></tr>'
              : data.slice(0, max).map((e) => `<tr><td>${escapeHtml(e.name)}</td><td class="center">${e.count}</td><td class="center">${pct(e.count)}%</td></tr>`).join('')
          }</tbody>
        </table>
      </div>`;

    const detailRows = inCoverage.length === 0
      ? `<tr><td colspan="${includeNames ? 7 : 6}">No check-ups in the covered range.</td></tr>`
      : inCoverage.map((c, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>#${escapeHtml(c.id)}</td>
          ${includeNames ? `<td>${escapeHtml(c.patientName || '—')}</td>` : ''}
          <td>${escapeHtml(c.hospitalName || '—')}</td>
          <td>${escapeHtml(checkupDateKey(c))}${c.preferredTime ? ' ' + escapeHtml(c.preferredTime) : ''}</td>
          <td>${escapeHtml(reportMobility(c.mobility))}</td>
          <td>${escapeHtml(REPORT_STATUS_LABEL[c.status] || c.status)}${c.staffNote ? '<br/><span class="muted">' + escapeHtml(c.staffNote) + '</span>' : ''}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>Staff Check-up Report</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#fff; color:#000; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size:12px; line-height:1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { margin:0; font-size:20px; text-align:center; }
  .section-title { margin:0 0 10px; font-size:14px; font-weight:800; border-bottom:1px solid #cbd5e1; padding-bottom:6px; }
  .header { text-align:center; border-bottom:2px solid #000; padding-bottom:14px; margin-bottom:18px; }
  .muted { color:#334155; font-size:11px; }
  .badge { display:inline-block; border:1px solid #cbd5e1; border-radius:999px; padding:2px 10px; font-size:11px; font-weight:600; margin:2px; }
  .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:18px; }
  .card { border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; }
  .card-label { font-size:10px; font-weight:700; }
  .card-value { font-size:20px; font-weight:800; margin-top:2px; }
  .card-sub { font-size:10px; margin-top:2px; color:#334155; }
  .section { margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  th, td { border:1px solid #cbd5e1; padding:6px 7px; text-align:left; vertical-align:top; word-wrap:break-word; }
  th { font-size:10px; border-bottom:2px solid #94a3b8; }
  td.center, th.center { text-align:center; }
  thead { display: table-header-group; }
  tr, .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  .footer { border-top:1px solid #cbd5e1; padding-top:10px; text-align:center; color:#334155; font-size:10px; margin-top:16px; }
  .sign { display:flex; justify-content:space-between; margin-top:36px; gap:40px; }
  .sign div { flex:1; text-align:center; border-top:1px solid #000; padding-top:4px; font-size:11px; }
</style></head>
<body>
  <div class="header avoid-break">
    <p class="muted" style="font-weight:700;letter-spacing:0.15em;text-transform:uppercase">E-MDRRMO</p>
    <h1>STAFF CHECK-UP REPORT</h1>
    <p style="margin-top:10px">
      <span class="badge">Coverage: ${escapeHtml(rangeLabel)}</span>
      <span class="badge">${stats.total} check-up${stats.total === 1 ? '' : 's'}</span>
    </p>
    <p class="muted" style="margin-top:8px">Generated: ${escapeHtml(generatedAt)}</p>
  </div>

  <div class="grid-4 avoid-break">
    ${card('Total Check-ups', stats.total, 'In coverage')}
    ${card('To Do', stats.todo, pct(stats.todo) + '% of total')}
    ${card('Done', stats.done, pct(stats.done) + '% of total')}
    ${card('Declined', stats.declined, pct(stats.declined) + '% of total')}
  </div>

  ${countTable('Check-ups by Patient For', stats.byPatientFor)}
  ${countTable('Check-ups by Mobility', stats.byMobility)}
  ${countTable('Top Hospitals', stats.byHospital)}

  <div class="section">
    <h2 class="section-title">Check-up Log</h2>
    <table>
      <thead><tr>
        <th class="center" style="width:6%">#</th>
        <th style="width:8%">ID</th>
        ${includeNames ? '<th style="width:20%">Patient</th>' : ''}
        <th>Hospital</th>
        <th style="width:17%">Schedule</th>
        <th style="width:12%">Mobility</th>
        <th style="width:20%">Status / Note</th>
      </tr></thead>
      <tbody>${detailRows}</tbody>
    </table>
  </div>

  <div class="sign avoid-break">
    <div>Prepared by (Staff)</div>
    <div>Noted by (Administrator)</div>
  </div>

  <div class="footer avoid-break">
    <p>This report is system-generated and reflects data at the time of generation.${includeNames ? '' : ' Patient names are omitted from this printout.'}</p>
    <p>© ${new Date().getFullYear()} E-MDRRMO</p>
  </div>
</body></html>`;

    const existing = document.getElementById('staff-checkup-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'staff-checkup-print-frame';
    iframe.setAttribute('title', 'Staff Check-up Report Print');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const cleanup = () => {
      try { iframe.remove(); } catch { /* ignore */ }
    };
    const triggerPrint = () => {
      try {
        const win = iframe.contentWindow;
        void win.document.body.offsetHeight;
        win.focus();
        win.print();
      } catch (err) {
        console.error('Print failed:', err);
      }
      try { iframe.contentWindow.onafterprint = cleanup; } catch { /* ignore */ }
      setTimeout(cleanup, 120000);
    };
    const schedulePrint = () =>
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(triggerPrint, 400)));

    if (iframe.contentWindow.document.readyState === 'complete') schedulePrint();
    else iframe.onload = schedulePrint;
  };

  const modes = [
    { id: 'day', label: 'Specific Date' },
    { id: 'month', label: 'Month' },
    { id: 'range', label: 'Date Range' },
    { id: 'all', label: 'All Time' },
  ];

  const Card = ({ label, value, sub, color }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );

  const CountTable = ({ title, data }) => (
    <div>
      <h2 className="mb-3 font-bold text-slate-800">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No check-ups in the covered range.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Name</th>
              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">Count</th>
              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((e) => (
              <tr key={e.name}>
                <td className="border border-slate-200 p-2 font-semibold text-slate-700">{e.name}</td>
                <td className="border border-slate-200 p-2 text-center text-slate-600">{e.count}</td>
                <td className="border border-slate-200 p-2 text-center text-slate-600">{pct(e.count)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-5000 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold leading-tight text-slate-800">Staff Check-up Report</h3>
                <p className="text-xs leading-tight text-slate-400">Pick a date or month, then print</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
              >
                <Download className="h-4 w-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close report"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Coverage</span>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    mode === m.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'day' && (
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
            {mode === 'month' && (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
            {mode === 'range' && (
              <>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-400">→</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </>
            )}

            <label className="ml-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeNames}
                onChange={(e) => setIncludeNames(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              Include patient names
            </label>

            <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
              {stats.total} record{stats.total === 1 ? '' : 's'} in coverage
            </span>
          </div>
        </div>

        <div className="p-8 text-slate-800 max-h-[70vh] overflow-y-auto">
          <div className="mb-6 border-b-2 border-slate-800 pb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">E-MDRRMO</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">STAFF CHECK-UP REPORT</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Coverage: {rangeLabel}
              </span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                {stats.total} check-up{stats.total === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Generated: {generatedAt}</p>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label="Total Check-ups" value={stats.total} sub="In coverage" color="border-blue-200 bg-blue-50 text-blue-700" />
            <Card label="To Do" value={stats.todo} sub={`${pct(stats.todo)}% of total`} color="border-amber-200 bg-amber-50 text-amber-700" />
            <Card label="Done" value={stats.done} sub={`${pct(stats.done)}% of total`} color="border-emerald-200 bg-emerald-50 text-emerald-700" />
            <Card label="Declined" value={stats.declined} sub={`${pct(stats.declined)}% of total`} color="border-rose-200 bg-rose-50 text-rose-700" />
          </div>

          <div className="mb-8 space-y-8">
            <CountTable title="Check-ups by Patient For" data={stats.byPatientFor} />
            <CountTable title="Check-ups by Mobility" data={stats.byMobility} />
            <CountTable title="Top Hospitals" data={stats.byHospital} />
          </div>

          <div>
            <h2 className="mb-3 font-bold text-slate-800">Check-up Log</h2>
            {inCoverage.length === 0 ? (
              <p className="text-sm text-slate-500">No check-ups in the covered range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">#</th>
                      <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">ID</th>
                      {includeNames && (
                        <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Patient</th>
                      )}
                      <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Hospital</th>
                      <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Schedule</th>
                      <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Mobility</th>
                      <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Status / Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inCoverage.map((c, i) => (
                      <tr key={c.id}>
                        <td className="border border-slate-200 p-2 text-center text-slate-500">{i + 1}</td>
                        <td className="border border-slate-200 p-2 font-mono text-slate-600">#{c.id}</td>
                        {includeNames && (
                          <td className="border border-slate-200 p-2 font-semibold text-slate-700">{c.patientName || '—'}</td>
                        )}
                        <td className="border border-slate-200 p-2 text-slate-600">{c.hospitalName || '—'}</td>
                        <td className="border border-slate-200 p-2 text-slate-600">
                          {checkupDateKey(c)}{c.preferredTime ? ` ${c.preferredTime}` : ''}
                        </td>
                        <td className="border border-slate-200 p-2 text-slate-600">{reportMobility(c.mobility)}</td>
                        <td className="border border-slate-200 p-2 text-slate-600">
                          <span className="font-semibold">{REPORT_STATUS_LABEL[c.status] || c.status}</span>
                          {c.staffNote && <span className="block text-xs text-slate-400">{c.staffNote}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            <p>
              This report is system-generated and reflects data at the time of generation.
              {includeNames ? '' : ' Patient names are omitted from the printout.'}
            </p>
            <p className="mt-1">© {new Date().getFullYear()} E-MDRRMO</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffCheckUpQueue;