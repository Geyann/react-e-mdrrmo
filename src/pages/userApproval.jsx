import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import { Check, X, Search, AlertCircle, UserCheck, UserX, Clock, Eye, Shield, Mail, IdCard, Camera, ArrowLeft } from 'lucide-react';

const AdminApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate a user-friendly display ID
  const generateUserId = () => {
    const prefix = 'USR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleAction = async (user, action) => {
    if (action === 'approve') {
      try {
        const newUserId = generateUserId();

        // Update pending_registrations status to approved and set user_id
        const { error: updateError } = await supabase
          .from('pending_registrations')
          .update({ 
            status: 'approved',
            user_id: newUserId 
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Also upsert into profiles table with the user_id
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            user_id: newUserId,
            email: user.email,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            age: user.age,
            birthdate: user.birthdate,
            address: user.address,
            mobile_number: user.mobile_number,
            role: user.role || 'user',
            full_name: `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`
          }, { onConflict: 'id' });

        if (profileError) throw profileError;

        alert(`${user.first_name} ${user.last_name} has been approved! User ID: ${newUserId}`);
      } catch (err) {
        alert(`Approval failed: ${err.message}`);
      }
    } else if (action === 'reject') {
      if (window.confirm(`Are you sure you want to reject ${user.first_name} ${user.last_name}'s application?`)) {
        try {
          const { error: rejectError } = await supabase
            .from('pending_registrations')
            .update({ status: 'rejected' })
            .eq('id', user.id);

          if (rejectError) throw rejectError;
          alert('Application rejected.');
        } catch (err) {
          alert(`Rejection failed: ${err.message}`);
        }
      }
    }
    fetchPendingUsers();
  };

  const filteredUsers = pendingUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.id_number?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="p-6 md:p-10 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              Pending Registrations
            </h1>
            <p className="text-slate-500 mt-1">Review and manage new user applications</p>
          </div>
          <button
            onClick={fetchPendingUsers}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-2xl border border-yellow-200 bg-yellow-50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-yellow-700">Pending</p>
                <p className="text-3xl font-bold text-yellow-800 mt-1">{pendingUsers.length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-blue-200 bg-blue-50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-700">Total Users</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{pendingUsers.length}</p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-700">Awaiting Review</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{pendingUsers.length}</p>
              </div>
              <Eye className="w-10 h-10 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    <UserCheck className="w-4 h-4 inline mr-1" />
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    <IdCard className="w-4 h-4 inline mr-1" />
                    ID Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                    <Camera className="w-4 h-4 inline mr-1" />
                    ID Image
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">
                        {searchTerm ? "No matching applications found." : "No pending applications found."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.first_name?.charAt(0)?.toUpperCase() || '?'}
                            {user.last_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}
                            </p>
                            <p className="text-xs text-slate-500">Age: {user.age || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-800 font-medium">{user.email}</p>
                        <p className="text-xs text-slate-500">{user.mobile_number || 'No phone'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          {user.id_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.id_image_url ? (
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold text-sm transition"
                          >
                            <Camera className="w-4 h-4" />
                            View ID
                          </button>
                        ) : (
                          <span className="text-slate-400 text-sm">No Image</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAction(user, 'approve')}
                            className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(user, 'reject')}
                            className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition shadow-sm"
                          >
                            <X className="w-4 h-4" />
                            Reject
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

        <div className="mt-4 text-center text-sm text-slate-500">
          Showing {filteredUsers.length} pending application(s)
        </div>

        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedUser.first_name} {selectedUser.last_name}'s ID
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <img 
                src={selectedUser.id_image_url} 
                alt="Valid ID" 
                className="w-full rounded-xl border border-slate-200"
              />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 font-semibold">Full Name</p>
                  <p className="font-bold text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">ID Number</p>
                  <p className="font-bold text-slate-800">{selectedUser.id_number}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Email</p>
                  <p className="font-bold text-slate-800">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Mobile</p>
                  <p className="font-bold text-slate-800">{selectedUser.mobile_number || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { handleAction(selectedUser, 'approve'); setSelectedUser(null); }}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => { handleAction(selectedUser, 'reject'); setSelectedUser(null); }}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApproval;