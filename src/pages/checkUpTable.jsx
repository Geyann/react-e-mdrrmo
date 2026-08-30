import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../createClient';
import {
  Stethoscope, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  MapPin, Phone, Calendar, User, Loader2, Eye, X, HeartPulse,
  FileText, Tag, CalendarClock, UserCircle, Hash, Download
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CheckUpTable = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkups, setCheckups] = useState([]);
  const [selected, setSelected] = useState(null); // row currently open in modal
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchCheckups();
  }, []);

  const fetchCheckups = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('outPatientCheckUp')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;

      // Pull profiles once and map by user_id (text column in profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, mobile_number');

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );

      setCheckups(
        (data || []).map((c) => ({ ...c, profile: profileMap[c.userId] || null }))
      );
    } catch (err) {
      console.error('Error fetching checkups:', err);
      setError('Failed to load checkups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== FORMATTERS =====
  const mobilityLabel = (v) => {
    const map = {
      stretcher: 'Stretcher',
      'wheel-chair': 'Wheel Chair',
      walker: 'Walker',
    };
    return map[v] || v || '—';
  };

  const patientForLabel = (v) => {
    const map = {
      admission: 'Admission',
      discharge: 'Discharge',
      'check-up': 'Check Up',
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
  const filteredCheckups = checkups.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      c.patientName?.toLowerCase().includes(q) ||
      c.userId?.toLowerCase().includes(q) ||
      c.profile?.full_name?.toLowerCase().includes(q)
    );
  });

  // ===== STATS =====
  const stats = {
    total: checkups.length,
    pending: checkups.filter((c) => (c.status || 'Pending') === 'Pending').length,
    approved: checkups.filter((c) => c.status === 'Approved').length,
    declined: checkups.filter((c) => c.status === 'Declined').length,
  };

  // ===== APPROVE / DECLINE =====
  const handleApprove = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!window.confirm(`Approve check-up appointment #${row.id} for ${name}?`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({ status: 'Approved', updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      setError('Failed to approve: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchCheckups();
    setSavingId(null);
    setSelected(null); // close modal
    setSuccess(`Appointment #${row.id} approved. Staff has been notified in the queue.`);
  };

  const handleDecline = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!window.confirm(`Decline check-up appointment #${row.id} for ${name}?`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({ status: 'Declined', updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      setError('Failed to decline: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchCheckups();
    setSavingId(null);
    setSelected(null); // close modal
    setSuccess(`Appointment #${row.id} declined.`);
  };

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Declined: 'bg-red-100 text-red-700',
      Confirmed: 'bg-blue-100 text-blue-700',
      Completed: 'bg-green-100 text-green-700',
    };
    const cls = map[status || 'Pending'] || 'bg-gray-100 text-gray-700';
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{status || 'Pending'}</span>;
  };

  // ===== DETAIL ROW (inside modal) =====
  const DetailRow = ({ icon: Icon, label, value, full }) => (
    <div className={`flex items-start gap-3 ${full ? 'sm:col-span-2' : ''}`}>
      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-purple-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading check-up appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Stethoscope className="w-8 h-8 text-purple-600" />
              Check-up Appointments
            </h1>
            <p className="text-slate-500 mt-1">
              Review outpatient check-up appointment requests
            </p>
          </div>
          <div className="flex items-center gap-2">
  <button
    onClick={() => setShowReport(true)}
    className="px-4 py-2 border border-purple-300 text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition flex items-center gap-2"
  >
    <Download className="w-4 h-4" />
    Summary Report
  </button>
  <button
    onClick={fetchCheckups}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: FileText },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'Approved', value: stats.approved, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle },
            { label: 'Declined', value: stats.declined, color: 'bg-red-50 border-red-200 text-red-700', icon: XCircle },
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

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">User ID</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Patient Name</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Submitted</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">No check-up appointments found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCheckups.map((c, index) => (
                    <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-mono text-slate-600 max-w-[160px] truncate">
                              {c.userId || 'No ID'}
                            </p>
                            {c.profile?.full_name && (
                              <p className="text-xs text-slate-400">{c.profile.full_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(c.patientName?.charAt(0) || '?').toUpperCase()}
                          </div>
                          <p className="font-semibold text-slate-800 text-sm">{c.patientName || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">{formatDateTime(c.created_at)}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelected(c)}
                          className="flex items-center gap-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition"
                          title="View full details"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500 text-center">
          Showing {filteredCheckups.length} of {checkups.length} total appointments
        </div>
      </div>

      {/* ===== DETAILS MODAL ===== */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Appointment Details — #{selected.id}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + Approve/Decline */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={selected.status} />
                {(selected.status || 'Pending') === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(selected)}
                      disabled={savingId === selected.id}
                      className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                    >
                      {savingId === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(selected)}
                      disabled={savingId === selected.id}
                      className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                    >
                      {savingId === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Decline
                    </button>
                  </div>
                )}
              </div>

              {/* Submitted-by card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(selected.profile?.full_name || selected.patientName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    Submitted by: {selected.profile?.full_name || selected.patientName || 'Unknown'}
                  </p>
                  <p className="text-xs font-mono text-slate-500 truncate">{selected.userId || 'No user ID'}</p>
                </div>
              </div>

              {/* Full details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow icon={User} label="Patient Name" value={selected.patientName} />
                <DetailRow icon={Tag} label="Patient For" value={patientForLabel(selected.patientFor)} />
                <DetailRow icon={MapPin} label="Location / Address" value={selected.location} />
                <DetailRow icon={Stethoscope} label="Hospital Name" value={selected.hospitalName} />
                <DetailRow icon={Phone} label="Contact Details" value={selected.contactDetails} />
                <DetailRow icon={Calendar} label="Preferred Date" value={selected.preferredDate} />
                <DetailRow icon={Clock} label="Preferred Time" value={selected.preferredTime} />
                <DetailRow icon={HeartPulse} label="Mobility" value={mobilityLabel(selected.mobility)} />
                <DetailRow icon={UserCircle} label="Escort / Vehicle" value={selected.escort} />
                <DetailRow icon={CalendarClock} label="Submitted" value={formatDateTime(selected.created_at)} />
                <DetailRow icon={Hash} label="Appointment ID" value={`#${selected.id}`} />
                {selected.staffNote && (
                  <DetailRow icon={FileText} label="Staff Note" value={selected.staffNote} full />
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showReport && (
        <CheckUpSummaryReportModal onClose={() => setShowReport(false)} />
      )}
    </div>
  );
};

export default CheckUpTable;
    
// =============================================
// CHECK-UP SUMMARY REPORT MODAL
// =============================================

// Module-scope labelers (shared shape with the table's copies)
const mobilityLabelR = (v) => {
  const map = { stretcher: 'Stretcher', 'wheel-chair': 'Wheel Chair', walker: 'Walker' };
  return map[v] || v || '—';
};
const patientForLabelR = (v) => {
  const map = { admission: 'Admission', discharge: 'Discharge', 'check-up': 'Check Up' };
  return map[v] || v || '—';
};

const CheckUpSummaryReportModal = ({ onClose }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const applyPreset = (from, to) => { setFromDate(from); setToDate(to); };

  // Server-side fetch on preferredDate
  useEffect(() => {
    const fetchRows = async () => {
      setFetching(true);
      setFetchError('');
      try {
        let query = supabase
          .from('outPatientCheckUp')
          .select('patientFor, mobility, preferredDate, status, hospitalName, location, escort');

        if (fromDate) query = query.gte('preferredDate', fromDate);
        if (toDate) query = query.lte('preferredDate', toDate);

        const { data, error } = await query;
        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setFetchError(err.message);
      } finally {
        setFetching(false);
      }
    };
    fetchRows();
  }, [fromDate, toDate]);

  const stats = useMemo(() => {
    const countBy = (field, fallback, labeler = (v) => v) => {
      const counts = {};
      rows.forEach((r) => {
        const key = labeler(r[field] || fallback);
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    const statusData = countBy('status', 'Pending');
    const patientForData = countBy('patientFor', 'Other', patientForLabelR);
    const mobilityData = countBy('mobility', 'Not Specified', mobilityLabelR);
    const hospitalData = countBy('hospitalName', 'Not Specified');
    const locationData = countBy('location', 'Not Specified');
    const escortCount = rows.filter((r) => r.escort && String(r.escort).trim() !== '').length;

    return {
      statusData, patientForData, mobilityData, hospitalData, locationData,
      escortCount,
      topPatientFor: patientForData[0] || null,
      topMobility: mobilityData[0] || null,
    };
  }, [rows]);

  const pct = (count) => (rows.length ? Math.round((count / rows.length) * 100) : 0);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const BAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const rangeLabel = fromDate || toDate ? `${fromDate || 'Start'} → ${toDate || 'End'}` : 'All dates';

  const Card = ({ label, value, sub, color }) => (
    <div className={`p-4 rounded-xl border ${color}`}>
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );

  const CountTable = ({ title, data, total, max = 10 }) => (
    <div className="print-break-avoid">
      <h2 className="font-bold text-slate-800 mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No check-ups in the covered range.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Name</th>
              <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Count</th>
              <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, max).map((d) => (
              <tr key={d.name} className="border-b border-slate-100">
                <td className="p-2 border border-slate-200 font-semibold text-slate-700">{d.name}</td>
                <td className="p-2 border border-slate-200 text-center text-slate-600">{d.count}</td>
                <td className="p-2 border border-slate-200 text-center text-slate-600">{pct(d.count)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.length > max && <p className="text-xs text-slate-500 mt-2">…and {data.length - max} more entries.</p>}
      {total !== undefined && <p className="text-xs text-slate-400 mt-1">Total in coverage: {total}</p>}
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #ffffff !important; }
          body * { visibility: hidden; }
          .report-overlay { position: static !important; overflow: visible !important; padding: 0 !important; background: none !important; }
          .report-print, .report-print * { visibility: visible; }
          .report-print {
            position: absolute !important; top: 0 !important; left: 0 !important;
            width: 100% !important; max-width: none !important; max-height: none !important;
            margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important;
          }
          .report-print .print-hidden { display: none !important; }
          .report-print .print-break-avoid, .report-print .print-section { break-inside: avoid; page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="report-overlay fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div className="report-print bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8" onClick={(e) => e.stopPropagation()}>
          {/* Toolbar (screen only) */}
          <div className="print-hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 leading-tight truncate">Check-up Summary Report</h3>
                  <p className="text-xs text-slate-400 leading-tight">Adjust coverage, then print</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => window.print()}
                  disabled={fetching}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  {fetching ? 'Loading…' : 'Print / Save PDF'}
                </button>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Coverage</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <span className="text-slate-400 text-sm">→</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="flex items-center gap-1 ml-1 bg-slate-100 rounded-xl p-1">
                {[
                  { label: 'All Time', from: '', to: '' },
                  { label: 'This Month', from: `${todayKey.slice(0, 8)}01`, to: todayKey },
                  { label: 'Today', from: todayKey, to: todayKey },
                ].map((p) => {
                  const active = fromDate === p.from && toDate === p.to;
                  return (
                    <button key={p.label} onClick={() => applyPreset(p.from, p.to)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${active ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-800'}`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                {rows.length} record{rows.length === 1 ? '' : 's'} loaded
              </span>
            </div>
          </div>

          {/* Report body */}
          <div className="p-8 text-slate-800">
            <div className="text-center border-b-2 border-slate-800 pb-5 mb-6 print-section">
              <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">E-MDRRMO</p>
              <h1 className="text-2xl font-black text-slate-900 mt-1">OUTPATIENT CHECK-UP SUMMARY REPORT</h1>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">Coverage: {rangeLabel}</span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  {rows.length} appointment{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Generated: {generatedAt}</p>
            </div>

            {fetchError ? (
              <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                Failed to load report data: {fetchError}
              </div>
            ) : fetching ? (
              <div className="py-16 text-center text-slate-500 font-semibold">Loading report data…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 print-break-avoid">
                  <Card label="Total Appointments" value={rows.length} sub="In coverage" color="bg-blue-50 border-blue-200 text-blue-700" />
                  <Card label="Top Patient For" value={stats.topPatientFor ? stats.topPatientFor.name : '—'}
                    sub={stats.topPatientFor ? `${stats.topPatientFor.count} requests` : 'No data'} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
                  <Card label="Top Mobility" value={stats.topMobility ? stats.topMobility.name : '—'}
                    sub={stats.topMobility ? `${stats.topMobility.count} requests` : 'No data'} color="bg-violet-50 border-violet-200 text-violet-700" />
                  <Card label="Escort Requests" value={stats.escortCount} sub={`${pct(stats.escortCount)}% of total`} color="bg-rose-50 border-rose-200 text-rose-700" />
                </div>

                <div className="mb-8 print-section">
                  <h2 className="font-bold text-slate-800 mb-3">Status Overview</h2>
                  {stats.statusData.length === 0 ? (
                    <p className="text-sm text-slate-500">No check-ups in the covered range.</p>
                  ) : (
                    <div className={`grid gap-3 ${stats.statusData.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : stats.statusData.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {stats.statusData.map((s, i) => (
                        <Card key={s.name} label={s.name} value={s.count} sub={`${pct(s.count)}% of total`}
                          color={i === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : i === 1 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'} />
                      ))}
                    </div>
                  )}
                </div>

                {stats.statusData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Status Distribution</h2>
                    <div className="w-full h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.statusData.map((s) => ({ ...s, value: s.count }))}
                            innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value">
                            {stats.statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {stats.patientForData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Patient For Distribution</h2>
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.patientForData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                            {stats.patientForData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {stats.mobilityData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Mobility Requirements</h2>
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.mobilityData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                            {stats.mobilityData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="space-y-8 mb-8">
                  <div className="print-section"><CountTable title="Check-ups by Status" data={stats.statusData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Check-ups by Patient For" data={stats.patientForData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Check-ups by Mobility" data={stats.mobilityData} total={rows.length} /></div>
                </div>

                <div className="space-y-8 mb-8">
                  <div className="print-section"><CountTable title="Top Hospitals" data={stats.hospitalData} max={10} /></div>
                  <div className="print-section"><CountTable title="Top Locations" data={stats.locationData} max={10} /></div>
                </div>

                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 print-break-avoid">
                  <p>This report is system-generated and reflects data at the time of generation.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};