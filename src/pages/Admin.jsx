
import React from 'react'
import IncidentDashboard from '../components/IncidentDashboard';
import AdminIncidentAnalytics from '../components/AdminIncidentAnalytics';
import IncidentStats from '../components/IncidentStats';
import DispatchDashboard from '../components/DispatchDashboard';
import WeeklyDispatchGraph from '../components/WeeklyDispatchGraph';
import BorrowDashboard from '../components/BorrowStats';
import AdminBorrowAnalytics from '../components/AdminBorrowAnalytics';
import AdminAppointmentDashboard from '../components/AdminAppointmentDashboard';
import AdminCheckUpAnalytics from '../components/AdminCheckUpAnalytics';
import AdminDashboard from '../components/AdminDashboard';
const Admin = () => {
  return (
<div className="admin-container">
<AdminDashboard/>
 
</div>

  )
}
 export default Admin;