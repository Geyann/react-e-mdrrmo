import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import {
  Stethoscope, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  MapPin, Phone, Calendar, User, Loader2, Eye, X, HeartPulse,
  FileText, Tag, CalendarClock, UserCircle, Hash
} from 'lucide-react';

const CheckUpTable = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkups, setCheckups] = useState([]);
  const [selected, setSelected] = useState(null); // row currently open in modal
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          <button
            onClick={fetchCheckups}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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
    </div>
  );
};

export default CheckUpTable;