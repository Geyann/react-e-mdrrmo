import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../createClient';
import {
  Siren,Download, Search, AlertCircle, Clock, CheckCircle, XCircle,
  ShieldAlert, User, MapPin, Phone, Calendar, Camera,
  Activity, MessageSquare, Save, X, RefreshCw, Loader2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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
  const closeBtnRef = useRef(null);
const [showReport, setShowReport] = useState(false);

  const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

  useEffect(() => {
    fetchReports();
  }, []);

  // ── Modal: lock body scroll, close on Escape, focus on open ──
  useEffect(() => {
    if (!selected) return;

    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

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
        <div role="status" aria-live="polite" className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading incident reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header — stacks on phones */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
              <Siren className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
              Reported Incidents
            </h1>
            <p className="text-slate-500 mt-1">
              View, analyze, and respond to all reported incidents
            </p>
          </div>
         <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
  <button
    type="button"
    onClick={() => setShowReport(true)}
    className="w-full sm:w-auto justify-center px-4 py-2.5 border border-purple-300 text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition flex items-center gap-2"
  >
    <Download className="w-4 h-4" />
    Summary Report
  </button>
  <button
    type="button"
    onClick={fetchReports}
    aria-label="Refresh reports"
    className="w-full sm:w-auto justify-center px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
  >
    <RefreshCw className="w-4 h-4" />
    Refresh
  </button>
</div>
        </div>

        {/* Success banner */}
        {success && (
          <div role="status" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-700">{success}</p>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Cards — 2 cols on phones, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Reports', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Siren },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Activity },
            { label: 'Resolved', value: stats.resolved, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle },
            { label: 'High Priority', value: stats.high, color: 'bg-red-50 border-red-200 text-red-700', icon: ShieldAlert },
            { label: 'Rejected', value: stats.rejected, color: 'bg-slate-100 border-slate-200 text-slate-700', icon: XCircle },
          ].map((stat, i) => (
            <div key={i} className={`p-3 sm:p-4 rounded-xl border ${stat.color} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-70">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search reports by patient, address, incident type, or reporter"
                placeholder="Search by patient, address, incident type, reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-base"
              />
            </div>
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-base"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-base"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* ===== MOBILE CARDS (below md) ===== */}
        <div className="md:hidden space-y-3">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No incident reports found matching your criteria.</p>
            </div>
          ) : (
            filteredReports.map((r, index) => (
              <div key={r.reportIncidentId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor(r.priorityLevel)}`}>
                      {(r.patientName?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{r.patientName}</p>
                      <p className="text-xs text-slate-400 font-mono">#{r.reportIncidentId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={r.status} />
                    <PriorityBadge level={r.priorityLevel} />
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">{r.address}{r.landMark ? ` — ${r.landMark}` : ''}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    {r.incidentType}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    {r.date} {r.time}
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    {r.profiles?.full_name || 'Unknown'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openModal(r)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  Analyze / Respond
                </button>
              </div>
            ))
          )}
        </div>

        {/* ===== DESKTOP TABLE (md and up) ===== */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Reported incidents table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Report ID</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Patient</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Address / Location</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Incident Type</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Priority</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Date</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Time</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Reporter</th>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
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
                          type="button"
                          onClick={() => openModal(r)}
                          className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                          title="Analyze and respond"
                        >
                          <MessageSquare className="w-3 h-3" aria-hidden="true" />
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
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-slate-200">
              <h3 id="modal-title" className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                <Siren className="w-5 h-5 text-purple-600" aria-hidden="true" />
                Report #{selected.reportIncidentId}
              </h3>
              <button
                type="button"
                ref={closeBtnRef}
                onClick={() => setSelected(null)}
                aria-label="Close report details"
                className="p-2 hover:bg-slate-100 rounded-lg transition focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {error && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Report details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><User className="w-3 h-3" aria-hidden="true" /> PATIENT</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.patientName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden="true" /> REPORTER CONTACT</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.reporterContact || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> ADDRESS</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.address}</p>
                  {selected.landMark && <p className="text-xs text-slate-500 mt-0.5">Landmark: {selected.landMark}</p>}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" aria-hidden="true" /> DATE / TIME</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.date} {selected.time}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3" aria-hidden="true" /> INCIDENT TYPE</p>
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
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-2"><Camera className="w-3 h-3" aria-hidden="true" /> INCIDENT PICTURE</p>
                  <img
                    src={selected.pictureOfIncident}
                    alt={`Incident photo reported by ${selected.profiles?.full_name || 'reporter'}`}
                    className="rounded-xl border border-slate-200 max-h-64 w-full object-cover"
                  />
                </div>
              )}

              {/* Admin response form */}
              <form onSubmit={handleSave} className="border-t border-slate-200 pt-5">
                <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" aria-hidden="true" />
                  Admin Response
                </p>

                <div className="mb-4">
                  <label htmlFor="admin-status" className="text-sm font-bold text-slate-700">Status</label>
                  <select
                    id="admin-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 bg-white text-base"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-5">
                  <label htmlFor="admin-response" className="text-sm font-bold text-slate-700">Response / Remarks</label>
                  <textarea
                    id="admin-response"
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                    placeholder="e.g. Ambulance dispatched to location, ETA 10 minutes..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 resize-y text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" aria-hidden="true" /> Save Response</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showReport && (
  <IncidentSummaryReportModal onClose={() => setShowReport(false)} />
)}
    </div>
  );
};

export default IncidentReported;

// =============================================
// INCIDENT SUMMARY-ONLY REPORT
// Adjustable coverage dates — fetches its own data
// from reportIncident filtered on created_at.
// =============================================
const IncidentSummaryReportModal = ({ onClose }) => {
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

  // ---- Fetch summary rows server-side whenever coverage changes ----
  // Coverage filters on created_at (timestamptz) using a full-day ISO range.
  // Deliberately excludes patientName, reporterContact, pictureOfIncident,
  // adminResponse text, and userId — keeps the printout free of PHI.
  useEffect(() => {
    const fetchRows = async () => {
      setFetching(true);
      setFetchError('');
      try {
        let query = supabase
          .from('reportIncident')
          .select('incidentType, priorityLevel, status, date, time, "specialNeeds", "requiredTools", created_at');

        if (fromDate) query = query.gte('created_at', `${fromDate}T00:00:00`);
        if (toDate) query = query.lte('created_at', `${toDate}T23:59:59.999999`);

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

  // ---- All stats computed from fetched rows ----
  const stats = useMemo(() => {
    const countBy = (field, fallback) => {
      const counts = {};
      rows.forEach((r) => {
        const key = r[field] || fallback;
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    // Status and priority are dynamic — count whatever values exist
    const statusData = countBy('status', 'Pending');
    const priorityData = countBy('priorityLevel', 'Unspecified');
    const incidentTypeData = countBy('incidentType', 'Other');

    // Top special needs / required tools (comma-separated free text → split)
    const splitCount = (field) => {
      const counts = {};
      rows.forEach((r) => {
        const raw = r[field];
        if (!raw || String(raw).trim() === '') return;
        String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((item) => {
            counts[item] = (counts[item] || 0) + 1;
          });
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    const specialNeedsData = splitCount('specialNeeds');
    const requiredToolsData = splitCount('requiredTools');

    // High-priority share
    const highCount = rows.filter((r) => r.priorityLevel === 'High').length;

    // Peak incident hour of day (from report's own date+time text)
    let peakTime = null;
    {
      const hourCounts = {};
      rows.forEach((r) => {
        const m = String(r.time || '').match(/(\d{1,2}):(\d{2})/);
        if (!m) return;
        let h = Number(m[1]);
        const min = String(m[2]);
        const ampm = /pm/i.test(String(r.time)) && h !== 12 ? h + 12 : /am/i.test(String(r.time)) && h === 12 ? 0 : h;
        const slot = `${String(ampm).padStart(2, '0')}:${min}`;
        hourCounts[slot] = (hourCounts[slot] || 0) + 1;
      });
      const entries = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
      peakTime = entries[0] ? { slot: entries[0][0], count: entries[0][1] } : null;
    }

    return {
      statusData,
      priorityData,
      incidentTypeData,
      specialNeedsData,
      requiredToolsData,
      highCount,
      peakTime,
      topIncidentType: incidentTypeData[0] || null,
    };
  }, [rows]);

  const pct = (count) => (rows.length ? Math.round((count / rows.length) * 100) : 0);

  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  const BAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const rangeLabel =
    fromDate || toDate
      ? `${fromDate || 'Start'} → ${toDate || 'End'}`
      : 'All dates';

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
        <p className="text-sm text-slate-500">No data in the covered range.</p>
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
      {data.length > max && (
        <p className="text-xs text-slate-500 mt-2">…and {data.length - max} more entries.</p>
      )}
      {total !== undefined && (
        <p className="text-xs text-slate-400 mt-1">Total in coverage: {total}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Print CSS: full-length multi-page PDF, only the report body visible */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #ffffff !important; }
          body * { visibility: hidden; }
          .report-overlay {
            position: static !important;
            overflow: visible !important;
            padding: 0 !important;
            background: none !important;
          }
          .report-print, .report-print * { visibility: visible; }
          .report-print {
            position: absolute !important;
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
          .report-print .print-hidden { display: none !important; }
          .report-print .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
          .report-print .print-section { break-inside: avoid; page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div
        className="report-overlay fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="report-print bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== Toolbar (screen only) ===== */}
          <div className="print-hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Siren className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 leading-tight truncate">Incident Summary Report</h3>
                  <p className="text-xs text-slate-400 leading-tight">Adjust coverage, then print</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={fetching}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
                >
                  {fetching ? 'Loading…' : 'Print / Save PDF'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close report"
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Coverage controls */}
            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Coverage</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-slate-400 text-sm">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center gap-1 ml-1 bg-slate-100 rounded-xl p-1">
                {[
                  { label: 'All Time', from: '', to: '' },
                  { label: 'This Month', from: `${todayKey.slice(0, 8)}01`, to: todayKey },
                  { label: 'Today', from: todayKey, to: todayKey },
                ].map((p) => {
                  const active = fromDate === p.from && toDate === p.to;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.from, p.to)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        active
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-800'
                      }`}
                    >
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

          {/* ===== Report body ===== */}
          <div className="p-8 text-slate-800">
            {/* Report header */}
            <div className="text-center border-b-2 border-slate-800 pb-5 mb-6 print-section">
              <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">E-MDRRMO</p>
              <h1 className="text-2xl font-black text-slate-900 mt-1">INCIDENT REPORT SUMMARY</h1>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  Coverage: {rangeLabel}
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  {rows.length} incident{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Generated: {generatedAt}</p>
            </div>

            {fetchError ? (
              <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                Failed to load report data: {fetchError}
              </div>
            ) : fetching ? (
              <div className="py-16 text-center text-slate-500 font-semibold">
                Loading report data…
              </div>
            ) : (
              <>
                {/* Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 print-break-avoid">
                  <Card label="Total Incidents" value={rows.length} sub="In coverage" color="bg-blue-50 border-blue-200 text-blue-700" />
                  <Card
                    label="High Priority"
                    value={stats.highCount}
                    sub={`${pct(stats.highCount)}% of total`}
                    color="bg-red-50 border-red-200 text-red-700"
                  />
                  <Card
                    label="Top Incident Type"
                    value={stats.topIncidentType ? stats.topIncidentType.name : '—'}
                    sub={stats.topIncidentType ? `${stats.topIncidentType.count} reports` : 'No data'}
                    color="bg-emerald-50 border-emerald-200 text-emerald-700"
                  />
                  <Card
                    label="Peak Report Time"
                    value={stats.peakTime ? stats.peakTime.slot : '—'}
                    sub={stats.peakTime ? `${stats.peakTime.count} reports` : 'No data'}
                    color="bg-violet-50 border-violet-200 text-violet-700"
                  />
                </div>

                {/* Status overview */}
                <div className="mb-8 print-section">
                  <h2 className="font-bold text-slate-800 mb-3">Status Overview</h2>
                  {stats.statusData.length === 0 ? (
                    <p className="text-sm text-slate-500">No incidents in the covered range.</p>
                  ) : (
                    <div className={`grid gap-3 ${stats.statusData.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : stats.statusData.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {stats.statusData.map((s, i) => (
                        <Card
                          key={s.name}
                          label={s.name}
                          value={s.count}
                          sub={`${pct(s.count)}% of total`}
                          color={
                            i === 0
                              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                              : i === 1
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority distribution (pie) */}
                {stats.priorityData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Priority Distribution</h2>
                    <div className="w-full h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.priorityData.map((p) => ({ ...p, value: p.count }))}
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.priorityData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Incident type distribution (bar) */}
                {stats.incidentTypeData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Incident Types</h2>
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.incidentTypeData.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                            {stats.incidentTypeData.slice(0, 8).map((_, i) => (
                              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Count tables */}
                <div className="space-y-8 mb-8">
                  <div className="print-section"><CountTable title="Incidents by Status" data={stats.statusData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Incidents by Priority" data={stats.priorityData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Incidents by Type" data={stats.incidentTypeData} total={rows.length} /></div>
                </div>

                {/* Special needs & required tools summary */}
                <div className="space-y-8 mb-8">
                  <div className="print-section"><CountTable title="Special Needs Requested" data={stats.specialNeedsData} max={10} /></div>
                  <div className="print-section"><CountTable title="Required Tools / Equipment" data={stats.requiredToolsData} max={10} /></div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 print-break-avoid">
                  <p>This report is system-generated and reflects data at the time of generation.</p>
                  <p className="mt-1">© 2023 Your Organization Name</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};