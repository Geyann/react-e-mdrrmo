"use client";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import {
  Truck, Plus, Search, FileText, Printer, AlertTriangle, CheckCircle,
  XCircle, Eye, ArrowLeft, Calendar, Clock, User, UserPlus
} from 'lucide-react';

export default function AdminInventory() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('ambulances');
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin/dashboard')} className="hover:bg-white/10 p-2 rounded-lg transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-bold">MDRRMO Fleet & Reports Administration</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-indigo-200">
                {adminProfile?.full_name} ({adminProfile?.role})
              </span>
            </div>
          </div>

          <div className="flex gap-1 pb-0 overflow-x-auto">
            {[
              { id: 'ambulances', label: 'Ambulances', icon: Truck },
              { id: 'usage', label: 'Usage Log', icon: Clock },
              { id: 'staffReports', label: 'Staff Reports', icon: FileText, badge: stats.pendingReports },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition rounded-t-lg relative ${
                  activeTab === tab.id ? 'bg-white text-indigo-700' : 'text-indigo-200 hover:bg-white/10'
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'ambulances' && (
          <AmbulancesTab
            ambulances={ambulances}
            setAmbulances={setAmbulances}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            supabase={supabase}
            stats={stats}
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
          />
        )}

        {activeTab === 'staffReports' && (
          <StaffReportsTab
            reports={reports}
            setReports={setReports}
            supabase={supabase}
            adminProfile={adminProfile}
            onPreview={(r) => setPreviewReport(r)}
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
function AmbulancesTab({ ambulances, setAmbulances, searchTerm, setSearchTerm, supabase, stats }) {
  const [showForm, setShowForm] = useState(false);
  const [editAmbulance, setEditAmbulance] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null); // ambulance being assigned a driver
  const [form, setForm] = useState({
    unit_number: '', plate_number: '', model: '', year: new Date().getFullYear().toString(),
    status: 'available', mileage: '0', last_maintenance: '', next_maintenance: '', notes: '',
    assigned_driver: '', driver_contact: '',
  });

  const filtered = ambulances.filter(a =>
    a.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assigned_driver?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, mileage: parseInt(form.mileage) };
      if (editAmbulance) {
        const { error } = await supabase.from('ambulances').update(payload).eq('id', editAmbulance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ambulances').insert([payload]);
        if (error) throw error;
      }
      const { data } = await supabase.from('ambulances').select('*').order('unit_number');
      setAmbulances(data);
      setShowForm(false);
      setEditAmbulance(null);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ambulance? This will also permanently delete all of its usage log history.')) return;
    await supabase.from('ambulances').delete().eq('id', id);
    setAmbulances(ambulances.filter(a => a.id !== id));
  };

  const resetForm = () => {
    setForm({
      unit_number: '', plate_number: '', model: '', year: new Date().getFullYear().toString(),
      status: 'available', mileage: '0', last_maintenance: '', next_maintenance: '', notes: '',
      assigned_driver: '', driver_contact: '',
    });
  };

  const openEdit = (amb) => {
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
  const handleAssignDriver = async (ambulanceId, driverName, driverContact) => {
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
    } catch (err) {
      alert('Error assigning driver: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-2xl font-bold text-gray-800">{stats.availableAmbulances}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">In Service</p>
          <p className="text-2xl font-bold text-gray-800">{stats.inService}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Under Maintenance</p>
          <p className="text-2xl font-bold text-gray-800">{stats.underMaintenance}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Unassigned (no driver)</p>
          <p className="text-2xl font-bold text-gray-800">{stats.unassigned}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Ambulance Fleet</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ambulances or drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditAmbulance(null); resetForm(); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Ambulance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(amb => (
          <div key={amb.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
            <div className={`h-2 ${
              amb.status === 'available' ? 'bg-green-500' :
              amb.status === 'in_service' ? 'bg-blue-500' :
              amb.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">{amb.unit_number}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  amb.status === 'available' ? 'bg-green-100 text-green-700' :
                  amb.status === 'in_service' ? 'bg-blue-100 text-blue-700' :
                  amb.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {amb.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Plate:</span> {amb.plate_number}</p>
                {amb.model && <p><span className="font-medium">Model:</span> {amb.model} ({amb.year})</p>}
                <p><span className="font-medium">Mileage:</span> {amb.mileage?.toLocaleString()} km</p>
                {amb.next_maintenance && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-yellow-500" />
                    <span className="font-medium">Next Maint:</span> {new Date(amb.next_maintenance).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Driver assignment block */}
              <div className={`mt-3 pt-3 border-t rounded-lg ${amb.assigned_driver ? '' : 'bg-red-50 -mx-5 px-5 pb-2'}`}>
                {amb.assigned_driver ? (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{amb.assigned_driver}</p>
                      {amb.driver_contact && <p className="text-xs text-gray-500">{amb.driver_contact}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> No driver assigned
                  </p>
                )}
                <button
                  onClick={() => setAssignTarget(amb)}
                  className="mt-2 flex items-center gap-1.5 text-indigo-600 text-xs font-semibold hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {amb.assigned_driver ? 'Reassign Driver' : 'Assign Driver'}
                </button>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(amb)} className="text-indigo-600 text-sm font-medium hover:underline">Edit</button>
                <button onClick={() => handleDelete(amb.id)} className="text-red-600 text-sm font-medium hover:underline ml-auto">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No ambulances found</p>
          </div>
        )}
      </div>

      {/* Quick Assign Driver Modal */}
      {assignTarget && (
        <AssignDriverModal
          ambulance={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSave={handleAssignDriver}
        />
      )}

      {/* Add/Edit Ambulance Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editAmbulance ? 'Edit Ambulance' : 'Add New Ambulance'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit Number *</label>
                  <input type="text" required value={form.unit_number}
                    onChange={e => setForm({...form, unit_number: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Plate Number *</label>
                  <input type="text" required value={form.plate_number}
                    onChange={e => setForm({...form, plate_number: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <input type="text" value={form.model}
                    onChange={e => setForm({...form, model: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Year</label>
                  <input type="number" value={form.year}
                    onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="available">Available</option>
                    <option value="in_service">In Service</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mileage (km)</label>
                  <input type="number" value={form.mileage}
                    onChange={e => setForm({...form, mileage: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Maintenance</label>
                  <input type="date" value={form.last_maintenance}
                    onChange={e => setForm({...form, last_maintenance: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Next Maintenance</label>
                  <input type="date" value={form.next_maintenance}
                    onChange={e => setForm({...form, next_maintenance: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Driver assignment fields */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="col-span-2 pt-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Assigned Driver</label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Driver Name</label>
                  <input type="text" value={form.assigned_driver}
                    onChange={e => setForm({...form, assigned_driver: e.target.value})}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Driver Contact</label>
                  <input type="text" value={form.driver_contact}
                    onChange={e => setForm({...form, driver_contact: e.target.value})}
                    placeholder="09XXXXXXXXX"
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium">
                  {editAmbulance ? 'Update' : 'Add Ambulance'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditAmbulance(null); }}
                  className="px-4 py-2.5 border rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
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
function AssignDriverModal({ ambulance, onClose, onSave }) {
  const [driverName, setDriverName] = useState(ambulance.assigned_driver || '');
  const [driverContact, setDriverContact] = useState(ambulance.driver_contact || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!driverName.trim()) {
      alert('Please enter a driver name');
      return;
    }
    setSaving(true);
    await onSave(ambulance.id, driverName.trim(), driverContact.trim());
    setSaving(false);
  };

  const handleUnassign = async () => {
    setSaving(true);
    await onSave(ambulance.id, '', '');
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Assign Driver</h3>
        <p className="text-sm text-gray-500 mb-4">{ambulance.unit_number} · {ambulance.plate_number}</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Driver Name *</label>
            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contact Number</label>
            <input type="text" value={driverContact} onChange={e => setDriverContact(e.target.value)}
              placeholder="09XXXXXXXXX"
              className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 border rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
        {ambulance.assigned_driver && (
          <button onClick={handleUnassign} disabled={saving}
            className="w-full mt-2 text-red-600 text-sm font-medium hover:underline disabled:opacity-50">
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
function UsageLogTab({ usage, setUsage, ambulances, searchTerm, setSearchTerm, supabase, adminProfile }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ambulance_id: '', purpose: '', destination: '', departure_time: '', return_time: '',
    staff_name: adminProfile?.full_name || '', notes: '', status: 'completed',
  });

  const filtered = usage.filter(u =>
    u.ambulances?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('ambulance_usage').insert([{ ...form, staff_id: adminProfile?.user_id }]);
      if (error) throw error;

      await supabase.from('ambulances').update({ status: 'available' }).eq('id', form.ambulance_id);

      const { data } = await supabase.from('ambulance_usage').select('*, ambulances(*)').order('created_at', { ascending: false });
      setUsage(data);
      setShowForm(false);
      setForm({ ambulance_id: '', purpose: '', destination: '', departure_time: '', return_time: '', staff_name: adminProfile?.full_name || '', notes: '', status: 'completed' });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Ambulance Usage Log</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search usage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
            <Plus className="w-4 h-4" />
            Log Usage
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Ambulance</th>
                <th className="p-4 font-medium">Driver</th>
                <th className="p-4 font-medium">Purpose</th>
                <th className="p-4 font-medium">Destination</th>
                <th className="p-4 font-medium">Staff</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{entry.ambulances?.unit_number}</td>
                  <td className="p-4">{entry.ambulances?.assigned_driver || '—'}</td>
                  <td className="p-4">{entry.purpose}</td>
                  <td className="p-4">{entry.destination}</td>
                  <td className="p-4">{entry.staff_name}</td>
                  <td className="p-4">
                    {entry.departure_time && entry.return_time ? (
                      <span className="text-xs">
                        {new Date(entry.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                        {new Date(entry.return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                      entry.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No usage records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Log Ambulance Usage</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Ambulance *</label>
                <select required value={form.ambulance_id}
                  onChange={e => setForm({...form, ambulance_id: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select ambulance...</option>
                  {ambulances.filter(a => a.status === 'available').map(amb => (
                    <option key={amb.id} value={amb.id}>
                      {amb.unit_number} - {amb.plate_number}{amb.assigned_driver ? ` (Driver: ${amb.assigned_driver})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Purpose *</label>
                <input type="text" required value={form.purpose}
                  onChange={e => setForm({...form, purpose: e.target.value})}
                  placeholder="e.g. Emergency Response, Patient Transport, Training"
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Destination</label>
                <input type="text" value={form.destination}
                  onChange={e => setForm({...form, destination: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Departure Time</label>
                  <input type="datetime-local" value={form.departure_time}
                    onChange={e => setForm({...form, departure_time: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Return Time</label>
                  <input type="datetime-local" value={form.return_time}
                    onChange={e => setForm({...form, return_time: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Staff Name</label>
                <input type="text" value={form.staff_name}
                  onChange={e => setForm({...form, staff_name: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium">
                  Log Usage
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
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
function StaffReportsTab({ reports, setReports, supabase, adminProfile, onPreview }) {
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = reports.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.generated_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const updateReportStatus = async (id, status, notes = null) => {
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
    } catch (err) {
      alert('Error updating report: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Staff Reports</h2>
      <p className="text-sm text-gray-500 -mt-2">Review and approve inventory reports submitted by staff.</p>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['pending_approval', 'approved', 'rejected', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Submitted By</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(report => (
                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{report.title}</td>
                  <td className="p-4">{report.generated_by_name || 'N/A'}</td>
                  <td className="p-4">{new Date(report.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.status === 'approved' ? 'bg-green-100 text-green-700' :
                      report.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                      report.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => onPreview(report)} className="text-indigo-600 text-sm font-medium hover:underline">
                        <Eye className="w-4 h-4 inline mr-1" /> View
                      </button>
                      {report.status === 'pending_approval' && (
                        <>
                          <button
                            onClick={() => updateReportStatus(report.id, 'approved')}
                            className="text-green-600 text-sm font-medium hover:underline"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for rejecting this report (optional):');
                              if (reason === null) return; // admin cancelled the prompt
                              updateReportStatus(report.id, 'rejected', reason || null);
                            }}
                            className="text-red-600 text-sm font-medium hover:underline"
                          >
                            <XCircle className="w-4 h-4 inline mr-1" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No reports found</td></tr>
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
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between p-4 border-b print:hidden sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800">Report Preview</h3>
          <div className="flex gap-2">
            <button onClick={onPrint}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium text-sm">Close</button>
          </div>
        </div>

        <div className="p-8 print:p-8">
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-2xl font-bold text-gray-900">MDRRMO INVENTORY REPORT</h1>
            <p className="text-lg font-semibold text-indigo-700 mt-1">{report.title}</p>
            <p className="text-sm text-gray-500 mt-2">Generated: {now}</p>
            <p className="text-sm text-gray-500">Prepared by: {report.generated_by_name || 'N/A'}</p>
            {report.reviewed_by_name && (
              <p className="text-sm text-gray-500">Reviewed by: {report.reviewed_by_name}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Report ID: {report.id}</p>
          </div>

          {report.admin_notes && (
            <div className={`mb-6 rounded-lg p-4 border ${report.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Admin Notes</p>
              <p className="text-sm text-gray-700">{report.admin_notes}</p>
            </div>
          )}

          {content.summary && (
            <div className="mb-6">
              <h2 className="font-bold text-gray-800 mb-3">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(content.summary).map(([key, val]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 text-center border">
                    <p className="text-xs text-gray-500 uppercase">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-bold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.tools && content.tools.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-gray-800 mb-3">Tools & Equipment</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left font-medium border">Name</th>
                    <th className="p-2 text-left font-medium border">Category</th>
                    <th className="p-2 text-center font-medium border">Qty</th>
                    <th className="p-2 text-center font-medium border">Min</th>
                    <th className="p-2 text-left font-medium border">Unit</th>
                    <th className="p-2 text-left font-medium border">Location</th>
                    <th className="p-2 text-center font-medium border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {content.tools.map((t, i) => (
                    <tr key={i} className={t.status === 'Low Stock' ? 'bg-red-50' : ''}>
                      <td className="p-2 border font-medium">{t.name}</td>
                      <td className="p-2 border">{t.category}</td>
                      <td className="p-2 border text-center">{t.quantity}</td>
                      <td className="p-2 border text-center">{t.min_quantity || t.min}</td>
                      <td className="p-2 border">{t.unit}</td>
                      <td className="p-2 border">{t.location || '-'}</td>
                      <td className="p-2 border text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
              <h2 className="font-bold text-gray-800 mb-3">Medical Supplies</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left font-medium border">Name</th>
                    <th className="p-2 text-left font-medium border">Category</th>
                    <th className="p-2 text-center font-medium border">Qty</th>
                    <th className="p-2 text-center font-medium border">Min</th>
                    <th className="p-2 text-left font-medium border">Unit</th>
                    <th className="p-2 text-left font-medium border">Location</th>
                    <th className="p-2 text-center font-medium border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {content.supplies?.map((s, i) => (
                    <tr key={i} className={s.status === 'Low Stock' ? 'bg-red-50' : ''}>
                      <td className="p-2 border font-medium">{s.name}</td>
                      <td className="p-2 border">{s.category}</td>
                      <td className="p-2 border text-center">{s.quantity}</td>
                      <td className="p-2 border text-center">{s.min_quantity || s.min}</td>
                      <td className="p-2 border">{s.unit}</td>
                      <td className="p-2 border">{s.location || '-'}</td>
                      <td className="p-2 border text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          s.status === 'Low Stock' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
            <p>This report is system-generated. For verification, contact MDRRMO Admin.</p>
            <p className="mt-1">© 2026 MDRRMO Inventory Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
}