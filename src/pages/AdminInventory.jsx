"use client";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import {
  Truck, Plus, Search, FileText, Printer, AlertTriangle, CheckCircle,
  XCircle, Eye, ArrowLeft, Calendar, Clock, User, UserPlus, Ambulance,
  RefreshCw, AlertCircle, Loader2
} from 'lucide-react';

export default function AdminInventory() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('ambulances');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  const [ambulances, setAmbulances] = useState([]);
  const [ambulanceUsage, setAmbulanceUsage] = useState([]);
  const [reports, setReports] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [previewReport, setPreviewReport] = useState(null);

  useEffect(() => {
    loadAdminProfile();
    loadData();
  }, []);

  // Only Admin gets into this page — Staff is routed to StaffInventory.jsx instead
  const loadAdminProfile = () => {
    const storedStaff = localStorage.getItem('currentStaff');
    if (!storedStaff) {
      navigate('/admin/login');
      return;
    }
    try {
      const parsed = JSON.parse(storedStaff);
      if ((parsed.role || '').toLowerCase() !== 'admin') {
        navigate('/staff/inventory', { replace: true, state: { error: "You don't have access to admin inventory." } });
        return;
      }
      setAdminProfile(parsed);
    } catch {
      navigate('/admin/login');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ambRes, usageRes, reportsRes] = await Promise.all([
        supabase.from('ambulances').select('*').order('unit_number'),
        supabase.from('ambulance_usage').select('*, ambulances(*)').order('created_at', { ascending: false }),
        supabase.from('inventory_reports').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (ambRes.data) setAmbulances(ambRes.data);
      if (usageRes.data) setAmbulanceUsage(usageRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalAmbulances: ambulances.length,
    availableAmbulances: ambulances.filter(a => a.status === 'available').length,
    inService: ambulances.filter(a => a.status === 'in_service').length,
    underMaintenance: ambulances.filter(a => a.status === 'maintenance').length,
    unassigned: ambulances.filter(a => !a.assigned_driver).length,
    pendingReports: reports.filter(r => r.status === 'pending_approval').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-semibold">Loading admin inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')} className="hover:bg-slate-200 p-2 rounded-xl transition text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Ambulance className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-black text-slate-800">MDRRMO Fleet & Reports</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 font-medium">
              {adminProfile?.full_name} ({adminProfile?.role})
            </span>
            <button
              onClick={loadData}
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'ambulances', label: 'Ambulances', icon: Truck },
              { id: 'usage', label: 'Usage Log', icon: Clock },
              { id: 'staffReports', label: 'Staff Reports', icon: FileText, badge: stats.pendingReports },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setError(''); setSuccess(''); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition rounded-xl relative ${
                  activeTab === tab.id ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {!!tab.badge && (
                  <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'ambulances' && (
          <AmbulancesTab
            ambulances={ambulances}
            setAmbulances={setAmbulances}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            supabase={supabase}
            stats={stats}
            setError={setError}
            setSuccess={setSuccess}
            clearMessages={() => { setError(''); setSuccess(''); }}
          />
        )}

        {activeTab === 'usage' && (
          <UsageLogTab
            usage={ambulanceUsage}
            setUsage={setAmbulanceUsage}
            ambulances={ambulances}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            supabase={supabase}
            adminProfile={adminProfile}
            setError={setError}
            setSuccess={setSuccess}
            clearMessages={() => { setError(''); setSuccess(''); }}
          />
        )}

        {activeTab === 'staffReports' && (
          <StaffReportsTab
            reports={reports}
            setReports={setReports}
            supabase={supabase}
            adminProfile={adminProfile}
            onPreview={(r) => setPreviewReport(r)}
            setError={setError}
            setSuccess={setSuccess}
            clearMessages={() => { setError(''); setSuccess(''); }}
          />
        )}
      </div>

      {previewReport && (
        <ReportPreviewModal
          report={previewReport}
          onClose={() => setPreviewReport(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}

// =============================================
// AMBULANCES TAB (moved from staff — now includes driver assignment)
// =============================================
function AmbulancesTab({ ambulances, setAmbulances, searchTerm, setSearchTerm, supabase, stats, setError, setSuccess, clearMessages }) {
  const [showForm, setShowForm] = useState(false);
  const [editAmbulance, setEditAmbulance] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null); // ambulance being assigned a driver
  const [form, setForm] = useState({
    unit_number: '', plate_number: '', model: '', year: new Date().getFullYear().toString(),
    status: 'available', mileage: '0', last_maintenance: '', next_maintenance: '', notes: '',
    assigned_driver: '', driver_contact: '',
  });
  const [saving, setSaving] = useState(false);

  const filtered = ambulances.filter(a =>
    a.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assigned_driver?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setSaving(true);
    try {
      const payload = { ...form, mileage: parseInt(form.mileage) };
      if (editAmbulance) {
        const { error } = await supabase.from('ambulances').update(payload).eq('id', editAmbulance.id);
        if (error) throw error;
        setSuccess(`Ambulance ${form.unit_number} updated successfully.`);
      } else {
        const { error } = await supabase.from('ambulances').insert([payload]);
        if (error) throw error;
        setSuccess(`Ambulance ${form.unit_number} added successfully.`);
      }
      const { data } = await supabase.from('ambulances').select('*').order('unit_number');
      setAmbulances(data);
      setShowForm(false);
      setEditAmbulance(null);
      resetForm();
    } catch (err) {
      setError('Error saving ambulance: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, unit_number) => {
    clearMessages();
    if (!confirm(`Delete ambulance ${unit_number}? This will also permanently delete all of its usage log history.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ambulances').delete().eq('id', id);
      if (error) throw error;
      setAmbulances(ambulances.filter(a => a.id !== id));
      setSuccess(`Ambulance ${unit_number} deleted successfully.`);
    } catch (err) {
      setError('Error deleting ambulance: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      unit_number: '', plate_number: '', model: '', year: new Date().getFullYear().toString(),
      status: 'available', mileage: '0', last_maintenance: '', next_maintenance: '', notes: '',
      assigned_driver: '', driver_contact: '',
    });
  };

  const openEdit = (amb) => {
    clearMessages();
    setEditAmbulance(amb);
    setForm({
      unit_number: amb.unit_number, plate_number: amb.plate_number, model: amb.model || '',
      year: amb.year?.toString() || '', status: amb.status, mileage: amb.mileage?.toString() || '0',
      last_maintenance: amb.last_maintenance || '', next_maintenance: amb.next_maintenance || '',
      notes: amb.notes || '', assigned_driver: amb.assigned_driver || '', driver_contact: amb.driver_contact || '',
    });
    setShowForm(true);
  };

  // Quick driver assignment — updates just assigned_driver/driver_contact
  // without opening the full edit form.
  const handleAssignDriver = async (ambulanceId, driverName, driverContact, unit_number) => {
    clearMessages();
    try {
      const { error } = await supabase
        .from('ambulances')
        .update({ assigned_driver: driverName || null, driver_contact: driverContact || null })
        .eq('id', ambulanceId);
      if (error) throw error;

      setAmbulances(ambulances.map(a =>
        a.id === ambulanceId ? { ...a, assigned_driver: driverName || null, driver_contact: driverContact || null } : a
      ));
      setAssignTarget(null);
      setSuccess(`Driver assignment for ${unit_number} updated successfully.`);
    } catch (err) {
      setError('Error assigning driver: ' + err.message);
    }
  };

  // ===== STATS BADGE COMPONENT FOR AMBULANCES TAB =====
  const StatCard = ({ label, value, colorClass, Icon }) => (
    <div className={`p-4 rounded-xl border ${colorClass} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-7 h-7 opacity-70" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Ambulances" value={stats.totalAmbulances} colorClass="bg-blue-50 border-blue-200 text-blue-700" Icon={Ambulance} />
        <StatCard label="Available" value={stats.availableAmbulances} colorClass="bg-green-50 border-green-200 text-green-700" Icon={CheckCircle} />
        <StatCard label="In Service" value={stats.inService} colorClass="bg-indigo-50 border-indigo-200 text-indigo-700" Icon={Clock} />
        <StatCard label="Under Maintenance" value={stats.underMaintenance} colorClass="bg-yellow-50 border-yellow-200 text-yellow-700" Icon={AlertTriangle} />
      </div>

      {/* Search & Add Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Ambulance Fleet</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ambulances or drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditAmbulance(null); resetForm(); clearMessages(); }}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition font-bold text-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Ambulance
          </button>
        </div>
      </div>

      {/* Ambulance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(amb => (
          <div key={amb.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className={`h-2 ${
              amb.status === 'available' ? 'bg-green-500' :
              amb.status === 'in_service' ? 'bg-indigo-500' :
              amb.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-800">{amb.unit_number}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  amb.status === 'available' ? 'bg-green-100 text-green-700' :
                  amb.status === 'in_service' ? 'bg-indigo-100 text-indigo-700' :
                  amb.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {amb.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-semibold">Plate:</span> {amb.plate_number}</p>
                {amb.model && <p><span className="font-semibold">Model:</span> {amb.model} ({amb.year})</p>}
                <p><span className="font-semibold">Mileage:</span> {amb.mileage?.toLocaleString()} km</p>
                {amb.next_maintenance && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-yellow-600" />
                    <span className="font-semibold">Next Maint:</span> {new Date(amb.next_maintenance).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Driver assignment block */}
              <div className={`mt-3 pt-3 border-t border-slate-200`}>
                {amb.assigned_driver ? (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">{amb.assigned_driver}</p>
                      {amb.driver_contact && <p className="text-xs text-slate-500">{amb.driver_contact}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> No driver assigned
                  </p>
                )}
                <button
                  onClick={() => { setAssignTarget(amb); clearMessages(); }}
                  className="mt-2 flex items-center gap-1.5 text-purple-600 text-xs font-semibold hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {amb.assigned_driver ? 'Reassign Driver' : 'Assign Driver'}
                </button>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <button onClick={() => openEdit(amb)} className="text-purple-600 text-sm font-semibold hover:underline">Edit</button>
                <button onClick={() => handleDelete(amb.id, amb.unit_number)} className="text-red-600 text-sm font-semibold hover:underline ml-auto" disabled={saving}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No ambulances found</p>
          </div>
        )}
      </div>

      {/* Quick Assign Driver Modal */}
      {assignTarget && (
        <AssignDriverModal
          ambulance={assignTarget}
          onClose={() => { setAssignTarget(null); clearMessages(); }}
          onSave={handleAssignDriver}
          setError={setError}
          setSuccess={setSuccess}
          clearMessages={clearMessages}
        />
      )}

      {/* Add/Edit Ambulance Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editAmbulance ? 'Edit Ambulance' : 'Add New Ambulance'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Unit Number *</label>
                  <input type="text" required value={form.unit_number}
                    onChange={e => setForm({...form, unit_number: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Plate Number *</label>
                  <input type="text" required value={form.plate_number}
                    onChange={e => setForm({...form, plate_number: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Model</label>
                  <input type="text" value={form.model}
                    onChange={e => setForm({...form, model: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Year</label>
                  <input type="number" value={form.year}
                    onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="available">Available</option>
                    <option value="in_service">In Service</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Mileage (km)</label>
                  <input type="number" value={form.mileage}
                    onChange={e => setForm({...form, mileage: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Maintenance</label>
                  <input type="date" value={form.last_maintenance}
                    onChange={e => setForm({...form, last_maintenance: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Next Maintenance</label>
                  <input type="date" value={form.next_maintenance}
                    onChange={e => setForm({...form, next_maintenance: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>

              {/* Driver assignment fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="col-span-full pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assigned Driver</label>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Driver Name</label>
                  <input type="text" value={form.assigned_driver}
                    onChange={e => setForm({...form, assigned_driver: e.target.value})}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Driver Contact</label>
                  <input type="text" value={form.driver_contact}
                    onChange={e => setForm({...form, driver_contact: e.target.value})}
                    placeholder="09XXXXXXXXX"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editAmbulance ? 'Update Ambulance' : 'Add Ambulance'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditAmbulance(null); clearMessages(); }}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-100 font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// QUICK ASSIGN DRIVER MODAL
// =============================================
function AssignDriverModal({ ambulance, onClose, onSave, setError, setSuccess, clearMessages }) {
  const [driverName, setDriverName] = useState(ambulance.assigned_driver || '');
  const [driverContact, setDriverContact] = useState(ambulance.driver_contact || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    clearMessages();
    if (!driverName.trim()) {
      setError('Please enter a driver name');
      return;
    }
    setSaving(true);
    await onSave(ambulance.id, driverName.trim(), driverContact.trim(), ambulance.unit_number);
    setSaving(false);
  };

  const handleUnassign = async () => {
    clearMessages();
    if (!window.confirm(`Are you sure you want to unassign the driver from ambulance ${ambulance.unit_number}?`)) return;
    setSaving(true);
    await onSave(ambulance.id, '', '', ambulance.unit_number);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Assign Driver</h3>
        <p className="text-sm text-slate-500 mb-4">{ambulance.unit_number} · {ambulance.plate_number}</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Driver Name *</label>
            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Contact Number</label>
            <input type="text" value={driverContact} onChange={e => setDriverContact(e.target.value)}
              placeholder="09XXXXXXXXX"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-100 font-bold text-slate-700">Cancel</button>
        </div>
        {ambulance.assigned_driver && (
          <button onClick={handleUnassign} disabled={saving}
            className="w-full mt-2 text-red-600 text-sm font-semibold hover:underline disabled:opacity-50">
            Remove current assignment
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================
// USAGE LOG TAB (moved from staff)
// =============================================
function UsageLogTab({ usage, setUsage, ambulances, searchTerm, setSearchTerm, supabase, adminProfile, setError, setSuccess, clearMessages }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ambulance_id: '', purpose: '', destination: '', departure_time: '', return_time: '',
    staff_name: adminProfile?.full_name || '', notes: '', status: 'completed',
  });
  const [saving, setSaving] = useState(false);


  const filtered = usage.filter(u =>
    u.ambulances?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.ambulances?.assigned_driver?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setSaving(true);
    try {
      const { error } = await supabase.from('ambulance_usage').insert([{ ...form, staff_id: adminProfile?.user_id }]);
      if (error) throw error;

      await supabase.from('ambulances').update({ status: 'available' }).eq('id', form.ambulance_id);

      const { data } = await supabase.from('ambulance_usage').select('*, ambulances(*)').order('created_at', { ascending: false });
      setUsage(data);
      setShowForm(false);
      setForm({ ambulance_id: '', purpose: '', destination: '', departure_time: '', return_time: '', staff_name: adminProfile?.full_name || '', notes: '', status: 'completed' });
      setSuccess('Ambulance usage logged successfully.');
    } catch (err) {
      setError('Error logging usage: ' + err.message);
    } finally {
      setSaving(false);
    }
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

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
    };
    const cls = map[status || 'completed'] || 'bg-slate-100 text-slate-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${cls}`}>{status?.replace('_', ' ') || 'Completed'}</span>;
  };


  return (
    <div className="space-y-6">
      {/* Search & Log Usage Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Ambulance Usage Log</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search usage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button onClick={() => { setShowForm(true); clearMessages(); }}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition font-bold text-sm flex-shrink-0">
            <Plus className="w-4 h-4" />
            Log Usage
          </button>
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-slate-700">
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Ambulance</th>
                <th className="p-4 font-bold">Driver</th>
                <th className="p-4 font-bold">Purpose</th>
                <th className="p-4 font-bold">Destination</th>
                <th className="p-4 font-bold">Staff</th>
                <th className="p-4 font-bold">Duration</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="p-4 text-slate-500">{formatDateTime(entry.created_at)}</td>
                  <td className="p-4 font-semibold text-slate-700">{entry.ambulances?.unit_number}</td>
                  <td className="p-4 text-slate-600">{entry.ambulances?.assigned_driver || '—'}</td>
                  <td className="p-4 text-slate-600">{entry.purpose}</td>
                  <td className="p-4 text-slate-600 max-w-[180px] truncate">{entry.destination}</td>
                  <td className="p-4 text-slate-600">{entry.staff_name}</td>
                  <td className="p-4 text-slate-600">
                    {entry.departure_time && entry.return_time ? (
                      <span className="text-xs">
                        {new Date(entry.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                        {new Date(entry.return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={entry.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No usage records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Log Ambulance Usage</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Ambulance *</label>
                <select required value={form.ambulance_id}
                  onChange={e => setForm({...form, ambulance_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Select ambulance...</option>
                  {ambulances.filter(a => a.status === 'available').map(amb => (
                    <option key={amb.id} value={amb.id}>
                      {amb.unit_number} - {amb.plate_number}{amb.assigned_driver ? ` (Driver: ${amb.assigned_driver})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Purpose *</label>
                <input type="text" required value={form.purpose}
                  onChange={e => setForm({...form, purpose: e.target.value})}
                  placeholder="e.g. Emergency Response, Patient Transport, Training"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Destination</label>
                <input type="text" value={form.destination}
                  onChange={e => setForm({...form, destination: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Departure Time</label>
                  <input type="datetime-local" value={form.departure_time}
                    onChange={e => setForm({...form, departure_time: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Return Time</label>
                  <input type="datetime-local" value={form.return_time}
                    onChange={e => setForm({...form, return_time: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Staff Name</label>
                <input type="text" value={form.staff_name}
                  onChange={e => setForm({...form, staff_name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Log Usage
                </button>
                <button type="button" onClick={() => { setShowForm(false); clearMessages(); }}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-100 font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// STAFF REPORTS TAB (new — admin reviews & approves/rejects
// reports staff generate in StaffInventory.jsx)
// =============================================
function StaffReportsTab({ reports, setReports, supabase, adminProfile, onPreview, setError, setSuccess, clearMessages }) {
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState(null);

  const filtered = reports.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.generated_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const updateReportStatus = async (id, status, notes = null, reportTitle) => {
    clearMessages();
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('inventory_reports')
        .update({
          status,
          admin_notes: notes,
          reviewed_by: adminProfile?.user_id,
          reviewed_by_name: adminProfile?.full_name,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      const { data } = await supabase
        .from('inventory_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setReports(data);
      setSuccess(`Report "${reportTitle}" ${status.replace('_', ' ')} successfully.`);
    } catch (err) {
      setError('Error updating report: ' + err.message);
    } finally {
      setSavingId(null);
    }
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

  // ===== BADGES =====
  const StatusBadge = ({ status }) => {
    const map = {
      approved: 'bg-green-100 text-green-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const cls = map[status || 'pending_approval'] || 'bg-slate-100 text-slate-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${cls}`}>{status?.replace('_', ' ') || 'Pending Approval'}</span>;
  };


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-slate-800">Staff Reports</h2>
      <p className="text-slate-500 -mt-2">Review and approve inventory reports submitted by staff.</p>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['pending_approval', 'approved', 'rejected', 'all'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); clearMessages(); }}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                statusFilter === status ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-slate-700">
                <th className="p-4 font-bold">Title</th>
                <th className="p-4 font-bold">Submitted By</th>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(report => {
                const isSaving = savingId === report.id;
                return (
                  <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="p-4 font-semibold text-slate-700">{report.title}</td>
                    <td className="p-4 text-slate-600">{report.generated_by_name || 'N/A'}</td>
                    <td className="p-4 text-slate-500">{formatDateTime(report.created_at)}</td>
                    <td className="p-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => { onPreview(report); clearMessages(); }} className="text-purple-600 text-sm font-semibold hover:underline">
                          <Eye className="w-4 h-4 inline mr-1" /> View
                        </button>
                        {report.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => updateReportStatus(report.id, 'approved', null, report.title)}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejecting this report (optional):');
                                if (reason === null) return; // admin cancelled the prompt
                                updateReportStatus(report.id, 'rejected', reason || null, report.title);
                              }}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No reports found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================
// REPORT PREVIEW MODAL (Printable)
// =============================================
function ReportPreviewModal({ report, onClose, onPrint }) {
  const content = report.content || {};
  const now = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0 print:inset-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 print:hidden sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">Report Preview</h3>
          <div className="flex gap-2">
            <button onClick={onPrint}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 font-bold text-sm">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 font-bold text-slate-700 text-sm">Close</button>
          </div>
        </div>

        <div className="p-8 print:p-8 text-slate-800">
          <div className="text-center mb-8 border-b pb-6 border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">MDRRMO INVENTORY REPORT</h1>
            <p className="text-lg font-semibold text-purple-700 mt-1">{report.title}</p>
            <p className="text-sm text-slate-500 mt-2">Generated: {now}</p>
            <p className="text-sm text-slate-500">Prepared by: {report.generated_by_name || 'N/A'}</p>
            {report.reviewed_by_name && (
              <p className="text-sm text-slate-500">Reviewed by: {report.reviewed_by_name}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Report ID: {report.id}</p>
          </div>

          {report.admin_notes && (
            <div className={`mb-6 rounded-xl p-4 border ${report.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className="text-xs font-bold uppercase text-slate-500 mb-1">Admin Notes</p>
              <p className="text-sm text-slate-700">{report.admin_notes}</p>
            </div>
          )}

          {content.summary && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-800 mb-3">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(content.summary).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-bold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables for Tools & Supplies */}
          {content.tools && content.tools.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-800 mb-3">Tools & Equipment</h2>
              <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Name</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Category</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Qty</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Min</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Unit</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Location</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {content.tools.map((t, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${t.status === 'Low Stock' ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-2 border border-slate-200 font-semibold text-slate-700">{t.name}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{t.category}</td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600">{t.quantity}</td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600">{t.min_quantity || t.min}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{t.unit}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{t.location || '-'}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          t.status === 'Low Stock' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {content.supplies && content.supplies.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-800 mb-3">Medical Supplies</h2>
              <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Name</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Category</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Qty</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Min</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Unit</th>
                    <th className="p-2 text-left font-bold border border-slate-200 text-slate-700">Location</th>
                    <th className="p-2 text-center font-bold border border-slate-200 text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {content.supplies?.map((s, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${s.status === 'Low Stock' ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-2 border border-slate-200 font-semibold text-slate-700">{s.name}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{s.category}</td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600">{s.quantity}</td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600">{s.min_quantity || s.min}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{s.unit}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{s.location || '-'}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          s.status === 'Low Stock' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            <p>This report is system-generated. For verification, contact MDRRMO Admin.</p>
            <p className="mt-1">© 2026 MDRRMO Inventory Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
}