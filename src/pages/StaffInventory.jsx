"use client";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import {
  Wrench, Package, Plus, Search, FileText, Printer,
  AlertTriangle, Eye, ArrowLeft, Clock
} from 'lucide-react';

export default function StaffInventory() {
  const navigate = useNavigate();
  const [staffProfile, setStaffProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tools');
  const [loading, setLoading] = useState(true);

  const [tools, setTools] = useState([]);
  const [medicalSupplies, setMedicalSupplies] = useState([]);
  const [reports, setReports] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewReport, setPreviewReport] = useState(null);

  useEffect(() => {
    loadStaffProfile();
    loadData();
  }, []);

  const loadStaffProfile = () => {
    const storedStaff = localStorage.getItem('currentStaff');
    if (!storedStaff) {
      navigate('/admin/login');
      return;
    }
    try {
      setStaffProfile(JSON.parse(storedStaff));
    } catch {
      navigate('/admin/login');
    }
  };

  // NOTE: ambulances / ambulance_usage are no longer fetched here —
  // that responsibility now lives entirely in AdminInventory.jsx
  const loadData = async () => {
    try {
      const [toolsRes, suppliesRes, reportsRes] = await Promise.all([
        supabase.from('tools_inventory').select('*').order('name'),
        supabase.from('medical_supplies').select('*').order('name'),
        supabase.from('inventory_reports').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      if (toolsRes.data) setTools(toolsRes.data);
      if (suppliesRes.data) setMedicalSupplies(suppliesRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
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
      {/* Top Navigation */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/staff/dashboard')} className="hover:bg-white/10 p-2 rounded-lg transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Package className="w-6 h-6" />
              <h1 className="text-xl font-bold">MDRRMO Supply Inventory</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-indigo-200">
                {staffProfile?.full_name} ({staffProfile?.role})
              </span>
            </div>
          </div>

          <div className="flex gap-1 pb-0 overflow-x-auto">
            {[
              { id: 'tools', label: 'Tools & Equipment', icon: Wrench },
              { id: 'supplies', label: 'Medical Supplies', icon: Package },
              { id: 'reports', label: 'Reports', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-700'
                    : 'text-indigo-200 hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'tools' && (
          <InventoryTab
            title="Tools & Equipment"
            icon={Wrench}
            items={tools}
            setItems={setTools}
            tableName="tools_inventory"
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={['Stretcher', 'Wheelchair', 'Splint', 'Backboard', 'Cervical Collar', 'Oxygen Equipment', 'Rescue Tool', 'Communication', 'Other']}
            supabase={supabase}
          />
        )}

        {activeTab === 'supplies' && (
          <InventoryTab
            title="Medical Supplies"
            icon={Package}
            items={medicalSupplies}
            setItems={setMedicalSupplies}
            tableName="medical_supplies"
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={['Bandage', 'Medication', 'IV Fluid', 'Glove', 'Mask', 'Disinfectant', 'Syringe', 'Other']}
            supabase={supabase}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            reports={reports}
            setReports={setReports}
            supabase={supabase}
            staffProfile={staffProfile}
            tools={tools}
            supplies={medicalSupplies}
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
// INVENTORY TAB (Tools & Supplies)
// =============================================
function InventoryTab({ title, icon: Icon, items, setItems, tableName, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter, categories, supabase }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '', category: categories[0], quantity: '1', min_quantity: '1',
    unit: 'piece', location: '', expiry_date: '', notes: '',
  });

  const filtered = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, quantity: parseInt(form.quantity), min_quantity: parseInt(form.min_quantity) };
      if (editItem) {
        await supabase.from(tableName).update(payload).eq('id', editItem.id);
      } else {
        await supabase.from(tableName).insert([payload]);
      }
      const { data } = await supabase.from(tableName).select('*').order('name');
      setItems(data);
      setShowForm(false);
      setEditItem(null);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from(tableName).delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  const resetForm = () => {
    setForm({ name: '', category: categories[0], quantity: '1', min_quantity: '1', unit: 'piece', location: '', expiry_date: '', notes: '' });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, category: item.category, quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(), unit: item.unit || 'piece',
      location: item.location || '', expiry_date: item.expiry_date || '', notes: item.notes || '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(item => {
          const isLowStock = item.quantity <= item.min_quantity;
          return (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition border-l-4 ${
              isLowStock ? 'border-red-500' : 'border-green-500'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                <Icon className={`w-5 h-5 ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>{item.quantity}</span>
                  <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                </div>
                <span className="text-xs text-gray-400">Min: {item.min_quantity}</span>
              </div>
              {item.location && <p className="text-xs text-gray-400 mt-2">📍 {item.location}</p>}
              {item.expiry_date && (
                <p className={`text-xs mt-1 ${new Date(item.expiry_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  ⏰ Expires: {new Date(item.expiry_date).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(item)} className="text-indigo-600 text-sm font-medium hover:underline">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 text-sm font-medium hover:underline ml-auto">Delete</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items found</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  <select required value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <select value={form.unit}
                    onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="piece">Piece</option>
                    <option value="box">Box</option>
                    <option value="set">Set</option>
                    <option value="pack">Pack</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Quantity *</label>
                  <input type="number" required min="0" value={form.quantity}
                    onChange={e => setForm({...form, quantity: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Min Quantity *</label>
                  <input type="number" required min="0" value={form.min_quantity}
                    onChange={e => setForm({...form, min_quantity: e.target.value})}
                    className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Storage Location</label>
                <input type="text" value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})}
                  placeholder="e.g. Cabinet A1, Shelf 3"
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expiry Date</label>
                <input type="date" value={form.expiry_date}
                  onChange={e => setForm({...form, expiry_date: e.target.value})}
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
                  {editItem ? 'Update' : 'Add Item'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }}
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
// REPORTS TAB (staff: generate + view own; ambulance-related
// report types removed since staff no longer owns that data)
// =============================================
function ReportsTab({ reports, setReports, supabase, staffProfile, tools, supplies }) {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('inventory_summary');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      let reportContent = {};
      let title = '';

      if (reportType === 'inventory_summary') {
        title = 'Inventory Summary Report';
        reportContent = {
          tools: tools.map(t => ({
            name: t.name, category: t.category, quantity: t.quantity, min_quantity: t.min_quantity,
            unit: t.unit, location: t.location, status: t.quantity <= t.min_quantity ? 'Low Stock' : 'Sufficient'
          })),
          supplies: supplies.map(s => ({
            name: s.name, category: s.category, quantity: s.quantity, min_quantity: s.min_quantity,
            unit: s.unit, location: s.location, status: s.quantity <= s.min_quantity ? 'Low Stock' : 'Sufficient'
          })),
          summary: {
            total_tools: tools.length,
            total_supplies: supplies.length,
            low_stock_items: [...tools.filter(t => t.quantity <= t.min_quantity), ...supplies.filter(s => s.quantity <= s.min_quantity)].length,
          }
        };
      } else if (reportType === 'low_stock') {
        title = 'Low Stock Alert Report';
        const lowTools = tools.filter(t => t.quantity <= t.min_quantity);
        const lowSupplies = supplies.filter(s => s.quantity <= s.min_quantity);
        reportContent = {
          tools: lowTools.map(t => ({ name: t.name, category: t.category, quantity: t.quantity, min: t.min_quantity, unit: t.unit, location: t.location })),
          supplies: lowSupplies.map(s => ({ name: s.name, category: s.category, quantity: s.quantity, min: s.min_quantity, unit: s.unit, location: s.location })),
          summary: { total_low_stock: lowTools.length + lowSupplies.length, tools_count: lowTools.length, supplies_count: lowSupplies.length }
        };
      }

      const { data: savedReport, error } = await supabase
        .from('inventory_reports')
        .insert([{
          title,
          report_type: reportType,
          content: reportContent,
          generated_by: staffProfile?.user_id,
          generated_by_name: staffProfile?.full_name,
          status: 'pending_approval',
        }])
        .select()
        .single();

      if (error) throw error;

      setPreviewData({ ...savedReport, content: reportContent });
      setShowPreview(true);

      const { data } = await supabase
        .from('inventory_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setReports(data);
    } catch (err) {
      alert('Error generating report: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Inventory Reports</h2>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none mt-1">
              <option value="inventory_summary">Inventory Summary</option>
              <option value="low_stock">Low Stock Alert</option>
            </select>
          </div>
        </div>
        <button onClick={generateReport} disabled={generating}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
          {generating ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Generating...</>
          ) : (
            <><FileText className="w-4 h-4" /> Generate Report</>
          )}
        </button>
        <p className="text-xs text-gray-400 mt-2">Reports are submitted for admin approval once generated.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-800">Your Generated Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{report.title}</td>
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
                    <button
                      onClick={() => { setPreviewData(report); setShowPreview(true); }}
                      className="text-indigo-600 text-sm font-medium hover:underline mr-3">
                      <Eye className="w-4 h-4 inline mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => { setPreviewData(report); setTimeout(() => window.print(), 100); }}
                      className="text-gray-600 text-sm font-medium hover:underline">
                      <Printer className="w-4 h-4 inline mr-1" />
                      Print
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No reports generated yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPreview && previewData && (
        <ReportPreviewModal
          report={previewData}
          onClose={() => setShowPreview(false)}
          onPrint={() => window.print()}
        />
      )}
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