import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';

const AdminApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch users on component mount
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending') // Only show profiles waiting for action
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (user, action) => {
    if (action === 'approve') {
      try {
        // Updating the status to 'approved' trips the PostgreSQL database trigger
        const { error: updateError } = await supabase
          .from('pending_registrations')
          .update({ status: 'approved' })
          .eq('id', user.id);

        if (updateError) throw updateError;

        alert(`${user.first_name} has been approved. Account generated successfully!`);
      } catch (err) {
        alert(`Approval failed: ${err.message}`);
      }
    } else if (action === 'reject') {
      if (window.confirm(`Are you sure you want to reject ${user.first_name}'s application?`)) {
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
    // Refresh list to remove the processed record
    fetchPendingUsers();
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading applications...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Pending Registrations</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left' }}>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>Email</th>
            <th style={cellStyle}>ID Number</th>
            <th style={cellStyle}>ID Image</th>
            <th style={cellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ ...cellStyle, textAlign: 'center', color: '#666' }}>
                No pending applications found.
              </td>
            </tr>
          ) : (
            pendingUsers.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={cellStyle}>
                  {`${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`}
                </td>
                <td style={cellStyle}>{user.email}</td>
                <td style={cellStyle}>{user.id_number || 'N/A'}</td>
                <td style={cellStyle}>
                  {user.id_image_url ? (
                    <a href={user.id_image_url} target="_blank" rel="noreferrer" style={{ color: '#0056b3' }}>
                      View ID
                    </a>
                  ) : (
                    'No Image'
                  )}
                </td>
                <td style={cellStyle}>
                  <button 
                    onClick={() => handleAction(user, 'approve')}
                    style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 12px', marginRight: '8px', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(user, 'reject')}
                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const cellStyle = { padding: '12px', border: '1px solid #ddd' };

export default AdminApproval;