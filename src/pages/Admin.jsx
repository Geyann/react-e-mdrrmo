
import React from 'react'
<<<<<<< HEAD
import IncidentDashboard from '../components/IncidentDashboard';
import AdminIncidentAnalytics from '../components/AdminIncidentAnalytics';
import IncidentStats from '../components/IncidentStats';
import DispatchDashboard from '../components/DispatchDashboard';
import WeeklyDispatchGraph from '../components/WeeklyDispatchGraph';
import BorrowDashboard from '../components/BorrowStats';
import AdminBorrowAnalytics from '../components/AdminBorrowAnalytics';
import AdminAppointmentDashboard from '../components/AdminAppointmentDashboard';
import AdminCheckUpAnalytics from '../components/AdminCheckUpAnalytics';
const Admin = () => {
  return (
<div className="admin-container">
<h1>Admin Dashboard</h1>
 
  <div>
      <div className='reports-dashboard' style={{ borderRadius:'40px',columnCount:'2', padding:'20px', gap:'30px'}}>
        <section className='stats' style={{backgroundColor:'#e5e7eb', top:'20px', borderRadius:'40px', padding:'20px'}}>
          <h2>Incident Trends</h2>
          <p>Overview of incident trends for the current month</p>
<IncidentStats />
        </section>
        <section className='stats' style={{backgroundColor:'#e5e7eb', top:'20px', borderRadius:'40px', padding:'20px'}}>
<AdminIncidentAnalytics />
        </section>
      </div>
      </div>
      <div>
  
      <div className='reports-dashboard' style={{ borderRadius:'40px',columnCount:'2', padding:'20px', gap:'30px'}}>
        <section className='stats' style={{backgroundColor:'#e5e7eb', top:'20px', borderRadius:'40px', padding:'20px', paddingBottom:'160px'}}>
            <h2>Vehicle Borrowed Monthly</h2>
          <p>Overview of borrowed vehicles for the current month</p>
          <BorrowDashboard />
        </section>
        <section className='stats' style={{backgroundColor:'#e5e7eb', top:'20px', borderRadius:'40px', padding:'20px'}}>
<AdminBorrowAnalytics />
        </section>
      </div>
      </div> <div style={{ borderRadius:'40px',columnCount:'1', padding:'20px', gap:'40px'}}>
      
      <AdminAppointmentDashboard />
      <br /><br />
  <AdminCheckUpAnalytics />
    
      </div>
=======

const Admin = () => {

  return (

<div className="admin-container">
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard! Here you can manage reports, appointments, and more.</p>
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
</div>

  )
}
 export default Admin;