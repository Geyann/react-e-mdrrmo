import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import {
  Siren, Search, AlertCircle, Clock, CheckCircle, XCircle,
  ShieldAlert, User, MapPin, Phone, Calendar, Camera,
  Activity, MessageSquare, Save, X, RefreshCw, Loader2
} from 'lucide-react';

const IncidentReported = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);       // report in modal
  const [newStatus, setNewStatus] = useState('Pending');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('reportIncident')
        .select('*, profiles(id, full_name, user_id, email, mobile_number)')
        .order('reportIncidentId', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== FILTER REPORTS =====
  const filteredReports = reports.filter((r) => {
    const q = searchTerm.toLowerCase();
    const p = r.profiles || {};
    const matchesSearch =
      !searchTerm ||
      r.patientName?.toLowerCase().includes(q) ||
      r.address?.toLowerCase().includes(q) ||
      r.landMark?.toLowerCase().includes(q) ||
      r.incidentType?.toLowerCase().includes(q) ||
      r.reporterContact?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.user_id?.toLowerCase().includes(q);

    const matchesPriority = priorityFilter === 'all' || r.priorityLevel === priorityFilter;
    const matchesStatus = statusFilter === 'all' || (r.status || 'Pending') === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // ===== STATS =====
  const stats = {
    total: reports.length,
    pending: reports.filter((r) => (r.status || 'Pending') === 'Pending').length,
    inProgress: reports.filter((r) => r.status === 'In Progress').length,
    resolved: reports.filter((r) => r.status === 'Resolved').length,
    high: reports.filter((r) => r.priorityLevel === 'High').length,
    rejected: reports.filter((r) => r.status === 'Rejected').length,
  };

  // ===== OPEN MODAL =====
  const openModal = (report) => {
    setSelected(report);
    setNewStatus(report.status || 'Pending');
    setAdminResponse(report.adminResponse || '');
    setError('');
    setSuccess('');
  };

  // ===== SAVE RESPONSE =====
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('reportIncident')
      .update({
        status: newStatus,
        adminResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('reportIncidentId', selected.reportIncidentId);

    if (updateError) {
      console.error('Update error:', updateError);
      setError('Failed to save response: ' + updateError.message);
      setSaving(false);
      return;
    }

    await fetchReports();
    setSaving(false);
    setSelected(null);
    setSuccess(`Response saved for report #${selected.reportIncidentId}.`);
  };

  // ===== BADGES =====
  const PriorityBadge = ({ level }) => {
    const map = {
      Low: 'bg-green-100 text-green-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      High: 'bg-red-100 text-red-700',
    };
    const cls = map[level] || 'bg-gray-100 text-gray-700';
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{level || '—'}</span>;
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Pending: 'bg-yellow-100 text-yellow-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      Resolved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
    };
    const cls = map[status || 'Pending'] || 'bg-gray-100 text-gray-700';
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{status || 'Pending'}</span>;
  };

  const avatarColor = (priority) => {
    if (priority === 'High') return 'bg-red-600';
    if (priority === 'Medium') return 'bg-yellow-500';
    if (priority === 'Low') return 'bg-green-600';
    return 'bg-purple-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading incident reports...</p>
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
              <Siren className="w-8 h-8 text-purple-600" />
              Reported Incidents
            </h1>
            <p className="text-slate-500 mt-1">
              View, analyze, and respond to all reported incidents
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Success banner */}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Reports', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Siren },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Activity },
            { label: 'Resolved', value: stats.resolved, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle },
            { label: 'High Priority', value: stats.high, color: 'bg-red-50 border-red-200 text-red-700', icon: ShieldAlert },
            { label: 'Rejected', value: stats.rejected, color: 'bg-slate-100 border-slate-200 text-slate-700', icon: XCircle },
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
                placeholder="Search by patient, address, incident type, reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Report ID</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Patient</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Address / Location</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Incident Type</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Priority</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Date</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Time</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Reporter</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">No incident reports found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, index) => (
                    <tr key={r.reportIncidentId} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-600">
                        #{r.reportIncidentId}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(r.priorityLevel)}`}>
                            {(r.patientName?.charAt(0) || '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{r.patientName}</p>
                            <p className="text-xs text-slate-400">{r.landMark || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 max-w-[200px] truncate">{r.address}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{r.incidentType}</td>
                      <td className="px-4 py-4"><PriorityBadge level={r.priorityLevel} /></td>
                      <td className="px-4 py-4 text-sm text-slate-600">{r.date}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{r.time}</td>
                      <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {r.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {r.profiles?.user_id || r.userId || ''}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => openModal(r)}
                          className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                          title="Analyze and respond"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Analyze / Respond
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
          Showing {filteredReports.length} of {reports.length} total reports
        </div>
      </div>

      {/* ===== ANALYZE / RESPOND MODAL ===== */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Siren className="w-5 h-5 text-purple-600" />
                Report #{selected.reportIncidentId}
              </h3>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Report details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> PATIENT</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.patientName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> REPORTER CONTACT</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.reporterContact || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> ADDRESS</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.address}</p>
                  {selected.landMark && <p className="text-xs text-slate-500 mt-0.5">Landmark: {selected.landMark}</p>}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> DATE / TIME</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.date} {selected.time}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3" /> INCIDENT TYPE</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.incidentType}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400">PRIORITY</p>
                    <div className="mt-1.5"><PriorityBadge level={selected.priorityLevel} /></div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">STATUS</p>
                    <div className="mt-1.5"><StatusBadge status={selected.status} /></div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400">SPECIAL NEEDS</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.specialNeeds || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400">REQUIRED TOOLS</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.requiredTools || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400">REPORTER</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.profiles?.full_name || '—'}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selected.profiles?.user_id || selected.userId}</p>
                </div>
              </div>

              {/* Incident picture */}
              {selected.pictureOfIncident && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-2"><Camera className="w-3 h-3" /> INCIDENT PICTURE</p>
                  <img
                    src={selected.pictureOfIncident}
                    alt="Incident"
                    className="rounded-xl border border-slate-200 max-h-64 w-full object-cover"
                  />
                </div>
              )}

              {/* Admin response form */}
              <form onSubmit={handleSave} className="border-t border-slate-200 pt-5">
                <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  Admin Response
                </p>

                <div className="mb-4">
                  <label className="text-sm font-bold text-slate-700">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-5">
                  <label className="text-sm font-bold text-slate-700">Response / Remarks</label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                    placeholder="e.g. Ambulance dispatched to location, ETA 10 minutes..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 resize-y"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Response</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReported;