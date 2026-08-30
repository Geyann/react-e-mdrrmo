import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../createClient';
import {
  Users, Search, User, Shield, Mail, Lock, Trash2, Edit3,
  AlertCircle, X, Eye, EyeOff, Clock,
  UserCheck, Save, Info, Calendar, MapPin, Phone, Building2, Hash,
  Camera, CreditCard, Download
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ===== REAL storage buckets in your project =====
const PHOTO_BUCKETS = ['pending_ids', 'profile-pics', 'id-previews', 'avatars', 'uploads'];

// Turns a stored value into a displayable URL.
const resolveImageUrl = (value) => {
  if (!value) return null;
  const v = String(value);
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(v)) return v;

  const firstSegment = v.split('/')[0];
  if (PHOTO_BUCKETS.includes(firstSegment)) {
    try {
      const { data } = supabase.storage.from(firstSegment).getPublicUrl(v);
      return data?.publicUrl || v;
    } catch { return v; }
  }
  for (const bucket of PHOTO_BUCKETS) {
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(v);
      return data?.publicUrl || v;
    } catch { /* try next */ }
  }
  return v;
};

// Photo column detection (id_image_url is what CreateUser saves).
const normalizePhotos = (rec) => {
  const avatar =
    rec.avatar_url || rec.profile_picture || rec.profile_pic ||
    rec.profile_photo || rec.photo_url || rec.picture || rec.avatar || null;

  const idPhoto =
    rec.id_image_url || rec.id_preview || rec.id_picture || rec.id_photo ||
    rec.id_photo_url || rec.id_card || rec.id_pic || rec.id_url ||
    rec.identification || null;

  return { avatar_url: avatar, id_photo_url: idPhoto };
};

const AdminUserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsUser, setDetailsUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '', username: '', password: '', confirmPassword: '',
    full_name: '', role: 'user', is_active: true,
  });
 const [showPassword, setShowPassword] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');
const [showReport, setShowReport] = useState(false); 

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackerai-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return String(value); }
  };

  useEffect(() => { fetchAllUsers(); }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const results = [];
      // Per-table dedup so no pending user (or photo) is ever dropped.
      const seen = {};
      const addIfNew = (record, table) => {
        const key = `${table}:${record.user_id || record.id || record.username || 'x'}`;
        if (seen[key]) return;
        seen[key] = true;
        results.push(record);
      };

      // 1. admin_users
      const { data: admins } = await supabase
        .from('admin_users').select('*').order('created_at', { ascending: false });
      (admins || []).forEach(a => addIfNew({
        ...a, ...normalizePhotos(a),
        source: 'admin_users', sourceTable: 'admin_users', sourceId: a.id,
        user_id: a.user_id || a.id, displayRole: a.role || 'admin',
        status: 'approved', password: null,
      }, 'admin_users'));

      // 2. staff_users
      const { data: staff } = await supabase
        .from('staff_users').select('*').order('created_at', { ascending: false });
      (staff || []).forEach(s => addIfNew({
        ...s, ...normalizePhotos(s),
        source: 'staff_users', sourceTable: 'staff_users', sourceId: s.id,
        user_id: s.user_id || s.id, displayRole: s.role || 'staff',
        status: s.is_active ? 'approved' : 'inactive', password: null,
        email: s.email || '', username: s.user_id || '', full_name: s.full_name || '',
        first_name: s.full_name?.split(' ')[0] || '',
        last_name: s.full_name?.split(' ').slice(1).join(' ') || '',
      }, 'staff_users'));

      // 3. profiles
      const { data: profiles } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false });
      (profiles || []).forEach(p => addIfNew({
        ...p, ...normalizePhotos(p),
        source: 'profiles', sourceTable: 'profiles', sourceId: p.id,
        user_id: p.user_id || p.id, displayRole: p.role || 'user',
        status: 'approved', password: null,
      }, 'profiles'));

      // 4. pending_registrations  ← holds the ID photo
      const { data: pending } = await supabase
        .from('pending_registrations').select('*').order('created_at', { ascending: false });
      (pending || []).forEach(p => addIfNew({
        ...p, ...normalizePhotos(p),
        source: 'pending_registrations', sourceTable: 'pending_registrations', sourceId: p.id,
        user_id: p.user_id || p.id, displayRole: p.role || 'user',
        status: p.status || 'pending', password: null,
        full_name: `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.trim(),
      }, 'pending_registrations'));

      setUsers(results);
      console.log('id_image_url samples:', results.map(u => u.id_image_url).filter(Boolean).slice(0, 3));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users: ' + err.message);
    } finally { setLoading(false); }
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      user.full_name?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.user_id?.toString().toLowerCase().includes(search);
    const matchesRole = roleFilter === 'all' || user.displayRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getDetailFields = (user) => {
    const fields = [];
    if (user.full_name) fields.push({ label: 'Full Name', value: user.full_name, icon: User });
    if (user.first_name) fields.push({ label: 'First Name', value: user.first_name, icon: User });
    if (user.middle_name) fields.push({ label: 'Middle Name', value: user.middle_name, icon: User });
    if (user.last_name) fields.push({ label: 'Last Name', value: user.last_name, icon: User });
    if (user.username) fields.push({ label: 'Username', value: user.username, icon: User });
    if (user.email) fields.push({ label: 'Email', value: user.email, icon: Mail });
    if (user.user_id) fields.push({ label: 'User ID', value: String(user.user_id), icon: Hash });
    if (user.custom_id) fields.push({ label: 'Custom ID', value: user.custom_id, icon: Hash });
    if (user.id_number) fields.push({ label: 'ID Number', value: user.id_number, icon: CreditCard });
    if (user.department) fields.push({ label: 'Department', value: user.department, icon: Building2 });
    if (user.age != null) fields.push({ label: 'Age', value: String(user.age), icon: User });
    if (user.birthdate) fields.push({ label: 'Birthdate', value: formatDate(user.birthdate), icon: Calendar });
    if (user.address) fields.push({ label: 'Address', value: user.address, icon: MapPin });
    if (user.mobile_number) fields.push({ label: 'Mobile Number', value: user.mobile_number, icon: Phone });
    if (user.status) fields.push({ label: 'Status', value: user.status, icon: UserCheck });
    if (typeof user.is_active === 'boolean') fields.push({ label: 'Active', value: user.is_active ? 'Yes' : 'No', icon: UserCheck });
    if (user.created_at) fields.push({ label: 'Created', value: formatDate(user.created_at), icon: Clock });
    if (user.updated_at) fields.push({ label: 'Last Updated', value: formatDate(user.updated_at), icon: Clock });
    return fields;
  };

  const openDetails = (user) => setDetailsUser(user);

  const SmartImage = ({ src, alt, className, fallback }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return fallback || null;
    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
  };

  const Avatar = ({ user, size = 'md' }) => {
    const src = resolveImageUrl(user.avatar_url);
    const sizeClasses = { sm: 'w-9 h-9 text-sm', md: 'w-14 h-14 text-xl', lg: 'w-24 h-24 text-3xl' };
    const colorClasses =
      user.displayRole === 'admin' ? 'bg-purple-600' :
      user.displayRole === 'staff' ? 'bg-blue-600' : 'bg-green-600';
    const initials = (user.first_name?.charAt(0) || user.full_name?.charAt(0) || '?').toUpperCase();
    return (
      <div className={`relative ${sizeClasses[size]} rounded-full ${colorClasses} text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0`}>
        <span>{initials}</span>
        {src && (
          <img src={src} alt="Profile" className="absolute inset-0 w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        )}
      </div>
    );
  };

  const handleDeleteUser = async (user) => {
    const userName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    if (!window.confirm(`⚠️ DELETE USER\n\nAre you sure you want to permanently delete ${userName}?\n\nThis will remove their record from ${user.sourceTable} table.\nThis action CANNOT be undone!`)) return;
    if (!window.confirm(`FINAL CONFIRMATION\n\nType "DELETE" in the next prompt to confirm permanent deletion of ${userName}.`)) return;
    const confirmation = prompt(`To confirm deletion of ${userName}, type "DELETE":`);
    if (confirmation !== 'DELETE') { alert('Deletion cancelled.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from(user.sourceTable).delete().eq('id', user.sourceId);
      if (error) throw error;
      alert(`✅ ${userName} has been permanently deleted.`);
      fetchAllUsers();
    } catch (err) { alert(`❌ Deletion failed: ${err.message}`); }
    finally { setSaving(false); }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email || '',
      username: user.username || user.user_id || '',
      password: '', confirmPassword: '',
      full_name: user.full_name || `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim(),
      role: user.displayRole || 'user',
      is_active: user.is_active !== false && user.status !== 'rejected',
    });
    setError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (editForm.password && editForm.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (editForm.password && editForm.password !== editForm.confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const table = selectedUser.sourceTable;
      const recordId = selectedUser.sourceId;
      const updateData = {};

      if (table === 'profiles') {
        const nameParts = editForm.full_name.trim().split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
        updateData.full_name = editForm.full_name.trim();
        updateData.email = editForm.email;
        updateData.username = editForm.username;
        updateData.is_active = editForm.is_active;
        updateData.role = editForm.role || 'user';
      } else if (table === 'pending_registrations') {
        const nameParts = editForm.full_name.trim().split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
        updateData.email = editForm.email;
        updateData.username = editForm.username;
        updateData.status = editForm.is_active ? 'approved' : 'rejected';
      } else if (table === 'staff_users') {
        updateData.full_name = editForm.full_name.trim();
        updateData.email = editForm.email;
        updateData.user_id = editForm.username;
        updateData.is_active = editForm.is_active;
        updateData.role = editForm.role || 'staff';
      } else if (table === 'admin_users') {
        updateData.full_name = editForm.full_name.trim();
        updateData.email = editForm.email;
        updateData.username = editForm.username;
        updateData.role = editForm.role || 'admin';
      }

      if (editForm.password) updateData.password = await hashPassword(editForm.password);

      const { error: updateError } = await supabase.from(table).update(updateData).eq('id', recordId);
      if (updateError) {
        if (updateError.message?.includes('column "id" does not exist') || updateError.code === '42703') {
          const { error: retryError } = await supabase.from(table).update(updateData).eq('user_id', selectedUser.user_id || recordId);
          if (retryError) throw retryError;
        } else throw updateError;
      }
      alert(`✅ ${editForm.full_name.trim() || editForm.email} has been updated.`);
      setShowEditModal(false);
      fetchAllUsers();
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update user. Check console for details.');
    } finally { setSaving(false); }
  };

  const stats = {
    total: users.length,
    users: users.filter(u => u.displayRole === 'user' || !u.displayRole).length,
    staff: users.filter(u => u.displayRole === 'staff').length,
    admins: users.filter(u => u.displayRole === 'admin').length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'approved' || u.is_active === true).length,
  };

  const StatusBadge = ({ user }) => {
    let color = 'bg-gray-100 text-gray-700'; let label = 'Unknown';
    if (user.status === 'approved' || user.is_active === true) { color = 'bg-green-100 text-green-700'; label = 'Active'; }
    else if (user.status === 'pending') { color = 'bg-yellow-100 text-yellow-700'; label = 'Pending'; }
    else if (user.status === 'rejected' || user.is_active === false) { color = 'bg-red-100 text-red-700'; label = 'Inactive'; }
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>{label}</span>;
  };

  const RoleBadge = ({ role }) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700', staff: 'bg-blue-100 text-blue-700',
      moderator: 'bg-indigo-100 text-indigo-700', user: 'bg-green-100 text-green-700',
    };
    const color = colors[role] || 'bg-gray-100 text-gray-600';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{role || 'user'}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading all users...</p>
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
              <Users className="w-8 h-8 text-purple-600" />
              User Management
            </h1>
            <p className="text-slate-500 mt-1">View, edit, and manage all user accounts (regular, staff, admin)</p>
          </div>
         <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => setShowReport(true)}
    className="px-4 py-2 border border-purple-300 text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition flex items-center gap-2"
  >
    <Download className="w-4 h-4" />
    Summary Report
  </button>
  <button onClick={fetchAllUsers}
    className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    Refresh
  </button>
</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Users', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Users },
            { label: 'Regular', value: stats.users, color: 'bg-green-50 border-green-200 text-green-700', icon: User },
            { label: 'Staff', value: stats.staff, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Shield },
            { label: 'Admins', value: stats.admins, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Shield },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'Active', value: stats.active, color: 'bg-green-50 border-green-200 text-green-700', icon: UserCheck },
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

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Search by name, email, username, or ID..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white">
              <option value="all">All Roles</option>
              <option value="user">Regular User</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white">
              <option value="all">All Status</option>
              <option value="approved">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Username</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Email</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Role</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Source</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">No users found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={`${user.sourceTable}-${user.sourceId}`} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {(user.user_id || user.id || '').toString().slice(0, 12)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-700">{user.username || user.user_id || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{user.email || 'N/A'}</td>
                      <td className="px-4 py-4"><RoleBadge role={user.displayRole} /></td>
                      <td className="px-4 py-4">
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded font-mono">{user.sourceTable}</span>
                      </td>
                      <td className="px-4 py-4"><StatusBadge user={user} /></td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openDetails(user)}
                            className="flex items-center gap-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
                            title="View account details">
                            <Info className="w-3 h-3" /> Details
                          </button>
                          <button onClick={() => openEditModal(user)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition"
                            title="Edit user">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleDeleteUser(user)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition"
                            title="Delete user">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500 text-center">
          Showing {filteredUsers.length} of {users.length} total users
        </div>
      </div>

      {/* ===== DETAILS MODAL ===== */}
      {detailsUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDetailsUser(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-600" /> Account Details
              </h3>
              <button onClick={() => setDetailsUser(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl mb-5 flex items-center gap-4">
              <Avatar user={detailsUser} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-800 truncate">
                  {detailsUser.full_name || `${detailsUser.first_name || ''} ${detailsUser.last_name || ''}`.trim() || 'Unknown'}
                </p>
                <p className="text-sm text-slate-500 truncate">{detailsUser.email || 'No email'}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <RoleBadge role={detailsUser.displayRole} />
                  <StatusBadge user={detailsUser} />
                  <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded-full font-mono">
                    {detailsUser.sourceTable}
                  </span>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" /> Photos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Profile Picture */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Profile Picture
                  </p>
                  <SmartImage
                    src={resolveImageUrl(detailsUser.avatar_url)}
                    alt="Profile"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200 bg-slate-50"
                    fallback={
                      <div className="w-full h-44 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                        <Camera className="w-8 h-8 mb-2" />
                        <p className="text-xs font-semibold">No profile picture uploaded</p>
                      </div>
                    }
                  />
                </div>
                {/* ID Picture */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> ID Picture
                  </p>
                  <SmartImage
                    src={resolveImageUrl(detailsUser.id_photo_url)}
                    alt="Government ID"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200 bg-slate-50"
                    fallback={
                      <div className="w-full h-44 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                        <CreditCard className="w-8 h-8 mb-2" />
                        <p className="text-xs font-semibold">No ID picture uploaded</p>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getDetailFields(detailsUser).map((field, i) => (
                <div key={i} className="p-3 border border-slate-200 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <field.icon className="w-3.5 h-3.5" /> {field.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1 break-words">{field.value || 'N/A'}</p>
                </div>
              ))}
            </div>

            {getDetailFields(detailsUser).length === 0 && (
              <p className="text-center text-slate-500 py-6">No additional details available.</p>
            )}

            <div className="flex gap-3 pt-5 mt-5 border-t border-slate-200">
              <button
                onClick={() => { const u = detailsUser; setDetailsUser(null); openEditModal(u); }}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                <Edit3 className="w-4 h-4" /> Edit Account
              </button>
              <button onClick={() => setDetailsUser(null)}
                className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Edit User
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {selectedUser && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                <p className="text-sm font-bold text-slate-700">Editing: {selectedUser.full_name || selectedUser.email}</p>
                <p className="text-xs text-slate-500">Table: {selectedUser.sourceTable} · Role: {selectedUser.displayRole}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  <User className="w-4 h-4 inline mr-1 text-purple-600" /> Full Name
                </label>
                <div className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{editForm.full_name || 'Unknown'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Name cannot be edited. Contact user to update their profile.</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  <User className="w-4 h-4 inline mr-1 text-purple-600" />
                  {selectedUser?.sourceTable === 'staff_users' ? 'Work ID' : 'Username'}
                </label>
                <input type="text" value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                  required placeholder={selectedUser?.sourceTable === 'staff_users' ? 'Work ID number' : 'Username'} />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  <Mail className="w-4 h-4 inline mr-1 text-purple-600" /> Email Address
                </label>
                <input type="email" value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1" required />
              </div>

              {(selectedUser?.sourceTable === 'staff_users' || selectedUser?.sourceTable === 'admin_users') && (
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    <Shield className="w-4 h-4 inline mr-1 text-purple-600" /> Role
                  </label>
                  <select value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 bg-white">
                    {selectedUser?.sourceTable === 'staff_users' ? (
                      <><option value="staff">Staff</option><option value="admin">Admin</option></>
                    ) : (
                      <><option value="admin">Admin</option><option value="moderator">Moderator</option></>
                    )}
                  </select>
                </div>
              )}

              {selectedUser?.sourceTable !== 'admin_users' && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                    <UserCheck className="w-4 h-4 text-green-600" /> Account Active:
                  </label>
                  <button type="button"
                    onClick={() => setEditForm({...editForm, is_active: !editForm.is_active})}
                    className={`relative w-12 h-6 rounded-full transition cursor-pointer ${editForm.is_active ? 'bg-green-500' : 'bg-red-400'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition shadow ${editForm.is_active ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-sm font-medium text-slate-700">{editForm.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-600" />
                  Change Password <span className="text-xs font-normal text-slate-400">(leave blank to keep current)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-sm font-bold text-slate-700">New Password</label>
                    <input type={showPassword ? 'text' : 'password'} value={editForm.password}
                      onChange={e => setEditForm({...editForm, password: e.target.value})}
                      placeholder="Min 6 characters" minLength={6}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                    <input type={showConfirm ? 'text' : 'password'} value={editForm.confirmPassword}
                      onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})}
                      placeholder="Repeat password" minLength={6}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {editForm.password && editForm.password.length > 0 && editForm.password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                )}
                {editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  disabled={saving || (editForm.password && editForm.password !== editForm.confirmPassword)}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}{showReport && (
  <UserSummaryReportModal onClose={() => setShowReport(false)} />
)}
    </div>
  );
};

export default AdminUserManagement;

// =============================================
// USER ACCOUNTS SUMMARY-ONLY REPORT
// Adjustable coverage dates — fetches its own data
// from all four account tables filtered on created_at.
// Prints aggregates only: no names, emails, or IDs.
// =============================================
const UserSummaryReportModal = ({ onClose }) => {
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

  // ---- Fetch minimal rows from every account table (no PII) ----
  // Selected columns only: role/status flags + timestamps. Names, emails,
  // passwords, and IDs are never pulled into the report.
  useEffect(() => {
    const fetchRows = async () => {
      setFetching(true);
      setFetchError('');
      try {
        const range = (q) => {
          let n = q;
          if (fromDate) n = n.gte('created_at', `${fromDate}T00:00:00`);
          if (toDate) n = n.lte('created_at', `${toDate}T23:59:59.999999`);
          return n;
        };

        const [profilesRes, staffRes, adminRes, pendingRes] = await Promise.all([
          range(supabase.from('profiles').select('id, role, is_active, created_at')),
          range(supabase.from('staff_users').select('id, role, department, is_active, created_at')),
          range(supabase.from('admin_users').select('id, role, created_at')),
          range(supabase.from('pending_registrations').select('id, status, role, created_at')),
        ]);

        const firstError = [profilesRes, staffRes, adminRes, pendingRes].find((r) => r.error);
        if (firstError) throw firstError.error;

        const normalize = (d, table) => (d || []).map((r) => ({
          table,
          role: r.role,
          status: r.status !== undefined ? r.status : (r.is_active === false ? 'inactive' : 'approved'),
          department: r.department,
          created_at: r.created_at,
        }));

        setRows([
          ...normalize(profilesRes.data, 'profiles'),
          ...normalize(staffRes.data, 'staff_users'),
          ...normalize(adminRes.data, 'admin_users'),
          ...normalize(pendingRes.data, 'pending_registrations'),
        ]);
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

    const roleData = countBy('role', 'user');
    const statusData = countBy('status', 'unknown');
    const sourceData = countBy('table', 'other');
    const departmentData = countBy('department', 'Not Specified');

    // Registrations per month (from created_at, covering the selected range)
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = {};
    rows.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });
    const monthlyData = Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({
        name: `${MONTHS[Number(key.split('-')[1]) - 1]} ${key.slice(2, 4)}`,
        count,
      }));

    const activeCount = rows.filter((r) => r.status === 'approved' || r.status === true).length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;

    return {
      roleData,
      statusData,
      sourceData,
      departmentData,
      monthlyData,
      activeCount,
      pendingCount,
      topRole: roleData[0] || null,
      busiestMonth: monthlyData.reduce((a, b) => (b.count > (a?.count ?? -1) ? b : a), null),
    };
  }, [rows]);

  const pct = (count) => (rows.length ? Math.round((count / rows.length) * 100) : 0);

  const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
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

  const CountTable = ({ title, data, total, max = 12 }) => (
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
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 leading-tight truncate">User Accounts Summary Report</h3>
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
                  <Download className="w-4 h-4" />
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
                {rows.length} account{rows.length === 1 ? '' : 's'} loaded
              </span>
            </div>
          </div>

          {/* ===== Report body ===== */}
          <div className="p-8 text-slate-800">
            {/* Report header */}
            <div className="text-center border-b-2 border-slate-800 pb-5 mb-6 print-section">
              <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">E-MDRRMO</p>
              <h1 className="text-2xl font-black text-slate-900 mt-1">USER ACCOUNTS SUMMARY REPORT</h1>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  Coverage: {rangeLabel}
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  {rows.length} account{rows.length === 1 ? '' : 's'}
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
                  <Card label="Total Accounts" value={rows.length} sub="In coverage" color="bg-blue-50 border-blue-200 text-blue-700" />
                  <Card
                    label="Active"
                    value={stats.activeCount}
                    sub={`${pct(stats.activeCount)}% of total`}
                    color="bg-green-50 border-green-200 text-green-700"
                  />
                  <Card
                    label="Pending Registrations"
                    value={stats.pendingCount}
                    sub={stats.pendingCount > 0 ? 'Awaiting approval' : 'None pending'}
                    color="bg-yellow-50 border-yellow-200 text-yellow-700"
                  />
                  <Card
                    label="Busiest Month"
                    value={stats.busiestMonth ? stats.busiestMonth.name : '—'}
                    sub={stats.busiestMonth ? `${stats.busiestMonth.count} registrations` : 'No data'}
                    color="bg-violet-50 border-violet-200 text-violet-700"
                  />
                </div>

                {/* Role overview */}
                <div className="mb-8 print-section">
                  <h2 className="font-bold text-slate-800 mb-3">Role Overview</h2>
                  {stats.roleData.length === 0 ? (
                    <p className="text-sm text-slate-500">No accounts in the covered range.</p>
                  ) : (
                    <div className={`grid gap-3 ${stats.roleData.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : stats.roleData.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {stats.roleData.map((s, i) => (
                        <Card
                          key={s.name}
                          label={s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                          value={s.count}
                          sub={`${pct(s.count)}% of total`}
                          color={
                            s.name === 'admin'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : s.name === 'staff'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Role distribution (pie) */}
                {stats.roleData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Role Distribution</h2>
                    <div className="w-full h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.roleData.map((r) => ({ ...r, value: r.count }))}
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.roleData.map((_, i) => (
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

                {/* Registrations per month (bar) */}
                {stats.monthlyData.length > 0 && (
                  <div className="mb-8 print-section">
                    <h2 className="font-bold text-slate-800 mb-3">Registrations per Month</h2>
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Count tables */}
                <div className="space-y-8 mb-8">
                  <div className="print-section"><CountTable title="Accounts by Role" data={stats.roleData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Accounts by Status" data={stats.statusData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Accounts by Source Table" data={stats.sourceData} total={rows.length} /></div>
                  <div className="print-section"><CountTable title="Staff by Department" data={stats.departmentData} max={12} /></div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 print-break-avoid">
                  <p>This report is system-generated and reflects data at the time of generation. Account names and contact details are omitted by design.</p>
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