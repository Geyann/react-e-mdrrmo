import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import {
  ClipboardCheck, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  MapPin, Phone, Calendar, Loader2, Bell, CheckCheck
} from 'lucide-react';

const StaffCheckUpQueue = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [responseFilter, setResponseFilter] = useState('all'); // all | awaiting | confirmed | completed
  const [checkups, setCheckups] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      // Staff only sees appointments that got past admin approval
      const relevant = (data || []).filter((c) =>
        ['Approved', 'Confirmed', 'Completed'].includes(c.status)
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
    const matchesSearch =
      !searchTerm ||
      c.patientName?.toLowerCase().includes(q) ||
      c.hospitalName?.toLowerCase().includes(q) ||
      c.contactDetails?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.preferredDate?.toLowerCase().includes(q);

    const matchesResponse =
      responseFilter === 'all' ||
      (responseFilter === 'awaiting' && c.status === 'Approved') ||
      (responseFilter === 'confirmed' && c.status === 'Confirmed') ||
      (responseFilter === 'completed' && c.status === 'Completed');

    return matchesSearch && matchesResponse;
  });

  // ===== STATS =====
  const stats = {
    awaiting: checkups.filter((c) => c.status === 'Approved').length,
    confirmed: checkups.filter((c) => c.status === 'Confirmed').length,
    completed: checkups.filter((c) => c.status === 'Completed').length,
    total: checkups.length,
  };

  // ===== STAFF RESPONSES =====
  const handleConfirm = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!window.confirm(`Confirm appointment #${row.id} for ${name}? The patient will be attended at the scheduled time.`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({
        status: 'Confirmed',
        respondedAt: new Date().toISOString(),
        staffNote: noteDrafts[row.id]?.trim() || row.staffNote || null,
      })
      .eq('id', row.id);

    if (error) {
      setError('Failed to confirm: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchQueue();
    setSavingId(null);
    setSuccess(`Appointment #${row.id} confirmed.`);
  };

  const handleComplete = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!window.confirm(`Mark appointment #${row.id} for ${name} as completed?`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({
        status: 'Completed',
        updated_at: new Date().toISOString(),
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
    setSuccess(`Appointment #${row.id} marked as completed.`);
  };

  const handleDecline = async (row) => {
    const name = row.patientName || 'Unknown';
    if (!window.confirm(`Decline appointment #${row.id} for ${name}? Add a note explaining why if possible.`)) return;

    setSavingId(row.id);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('outPatientCheckUp')
      .update({
        status: 'Declined',
        updated_at: new Date().toISOString(),
        staffNote: noteDrafts[row.id]?.trim() || row.staffNote || null,
      })
      .eq('id', row.id);

    if (error) {
      setError('Failed to decline: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchQueue();
    setSavingId(null);
    setSuccess(`Appointment #${row.id} declined.`);
  };

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      Approved: 'bg-amber-100 text-amber-700',
      Confirmed: 'bg-blue-100 text-blue-700',
      Completed: 'bg-green-100 text-green-700',
    };
    const label = {
      Approved: 'Awaiting Response',
      Confirmed: 'Confirmed',
      Completed: 'Completed',
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
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-purple-600" />
              Staff Check-up Queue
            </h1>
            <p className="text-slate-500 mt-1">
              Respond to approved check-up appointments
            </p>
          </div>
          <button
            onClick={fetchQueue}
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
        {stats.awaiting > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              {stats.awaiting} appointment(s) awaiting your response — confirm or decline below.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Awaiting Response', value: stats.awaiting, color: 'bg-amber-50 border-amber-200 text-amber-700', icon: Bell },
            { label: 'Confirmed', value: stats.confirmed, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: CheckCircle },
            { label: 'Completed', value: stats.completed, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCheck },
            { label: 'Total Assigned', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-700', icon: ClipboardCheck },
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
              <option value="all">All Items</option>
              <option value="awaiting">Awaiting Response</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
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
                    const isAwaiting = c.status === 'Approved';
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
                            <span>{c.contactDetails || '—'}</span>
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
                          {c.staffNote ? (
                            <p className="text-sm text-slate-600 max-w-[160px]">{c.staffNote}</p>
                          ) : (
                            <input
                              type="text"
                              placeholder="Add a note..."
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
                                  onClick={() => handleConfirm(c)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                                  title="Confirm appointment"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleDecline(c)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                                  title="Decline appointment"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                  Decline
                                </button>
                              </>
                            )}
                            {c.status === 'Confirmed' && (
                              <button
                                onClick={() => handleComplete(c)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                                title="Mark as completed"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                Mark Completed
                              </button>
                            )}
                            {c.status === 'Completed' && (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Done
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
          Showing {filteredQueue.length} of {checkups.length} assigned appointments
        </div>
      </div>
    </div>
  );
};

export default StaffCheckUpQueue;