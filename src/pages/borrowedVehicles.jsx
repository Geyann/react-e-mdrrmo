import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import {
  Ambulance, Search, Clock, CheckCircle, XCircle, RefreshCw,
  AlertCircle, MapPin, Phone, Calendar, User, FileText, Loader2
} from 'lucide-react';

const BorrowedVehicles = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('borrow-vehicle')
        .select('*, profiles(id, full_name, user_id, email, mobile_number)')
        .order('borrowerId', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== FORMATTERS =====
  const vehicleLabel = (v) => {
    const map = {
      ambulance: 'Ambulance',
      'rescue-truck': 'Rescue Truck',
      'utility-van': 'Utility Van',
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
      p.user_id?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || (r.status || 'Pending') === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || r.vehicle === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  // ===== STATS =====
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => (r.status || 'Pending') === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    declined: requests.filter((r) => r.status === 'Declined').length,
    ambulance: requests.filter((r) => r.vehicle === 'ambulance').length,
    rescueTruck: requests.filter((r) => r.vehicle === 'rescue-truck').length,
  };

  // ===== APPROVE / DECLINE =====
  const handleApprove = async (row) => {
    const name = row.profiles?.full_name || row.requestedBy || 'Unknown';
    if (!window.confirm(`Approve dispatch request #${row.borrowerId} for ${name}?`)) return;

    setSavingId(row.borrowerId);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('borrow-vehicle')
      .update({ status: 'Approved', updated_at: new Date().toISOString() })
      .eq('borrowerId', row.borrowerId);

    if (error) {
      setError('Failed to approve: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchRequests();
    setSavingId(null);
    setSuccess(`Dispatch request #${row.borrowerId} approved.`);
  };

  const handleDecline = async (row) => {
    const name = row.profiles?.full_name || row.requestedBy || 'Unknown';
    if (!window.confirm(`Decline dispatch request #${row.borrowerId} for ${name}?`)) return;

    setSavingId(row.borrowerId);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('borrow-vehicle')
      .update({ status: 'Declined', updated_at: new Date().toISOString() })
      .eq('borrowerId', row.borrowerId);

    if (error) {
      setError('Failed to decline: ' + error.message);
      setSavingId(null);
      return;
    }
    await fetchRequests();
    setSavingId(null);
    setSuccess(`Dispatch request #${row.borrowerId} declined.`);
  };

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Declined: 'bg-red-100 text-red-700',
    };
    const cls = map[status || 'Pending'] || 'bg-gray-100 text-gray-700';
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{status || 'Pending'}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading vehicle dispatch requests...</p>
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
              <Ambulance className="w-8 h-8 text-purple-600" />
              Borrowed Vehicles
            </h1>
            <p className="text-slate-500 mt-1">
              Review and respond to emergency vehicle dispatch requests
            </p>
          </div>
          <button
            onClick={fetchRequests}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Ambulance },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'Approved', value: stats.approved, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle },
            { label: 'Declined', value: stats.declined, color: 'bg-red-50 border-red-200 text-red-700', icon: XCircle },
            { label: 'Ambulances', value: stats.ambulance, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Ambulance },
            { label: 'Rescue Trucks', value: stats.rescueTruck, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Ambulance },
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
                placeholder="Search by requester, dispatch no., destination, purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Vehicles</option>
              <option value="ambulance">Ambulance</option>
              <option value="rescue-truck">Rescue Truck</option>
              <option value="utility-van">Utility Van</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Borrow ID</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Submitted</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Dispatch No.</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Vehicle</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Requested By</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Destination</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Date</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">No dispatch requests found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r, index) => {
                    const isPending = (r.status || 'Pending') === 'Pending';
                    const isSaving = savingId === r.borrowerId;
                    return (
                      <tr key={r.borrowerId} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                        <td className="px-4 py-4 text-sm font-mono text-slate-600">#{r.borrowerId}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{formatDateTime(r.created_at)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{r.dispatchNum || '—'}</td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-slate-700">{vehicleLabel(r.vehicle)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {(r.profiles?.full_name?.charAt(0) || r.requestedBy?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {r.profiles?.full_name || r.requestedBy || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                {r.profiles?.user_id || r.userId || ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 max-w-[180px] truncate">{r.destination || '—'}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{r.date}{r.time ? ` ${r.time}` : ''}</td>
                        <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(r)}
                              disabled={!isPending || isSaving}
                              className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                              title="Approve dispatch"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecline(r)}
                              disabled={!isPending || isSaving}
                              className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                              title="Decline dispatch"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
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

        <div className="mt-4 text-sm text-slate-500 text-center">
          Showing {filteredRequests.length} of {requests.length} total requests
        </div>
      </div>
    </div>
  );
};

export default BorrowedVehicles;