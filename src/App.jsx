import React from 'react'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
import AdminAppointmentDashboard from './components/AdminAppointmentDashboard'
import Home from './pages/Home'
import About from './pages/About'
import Report from './pages/Report'
import Navbar from './components/navbar'
import Admin from './pages/Admin'
import Borrow from './pages/Borrow'
import Appointment from './pages/appointment'
import CheckUp from './pages/CheckUp'
import LoginPage from './pages/login'
import Adminlogin from './pages/adminlogin'
import RegisterAdmin from './pages/register-admin'
import AdminNavbar from './components/adminNavbar'
import HazardReport from './pages/HazardReport'
import UserHazardmap from './pages/Hazardmap'
import Settings from './pages/Settings'
import ReportedIncident from './pages/incidentReported'
import BorrowedVehicles from './pages/borrowedVehicles'
import TrackAppointment from './pages/trackAppointment'
import CheckUpTable from './pages/checkUpTable'
import CreateUser from './pages/CreateUser'
import UserApproval from './pages/userApproval'
import background from './Images/background.png'
import AdminHazardMap from './pages/AdminHazardMap'
import GuestNavbar from './components/GuestNavbar'
import Guest from './pages/Guest'
import MonthlyIncidentTrends from './pages/MonthlyIncidentTrends'
import Profile from './pages/Profile'; // Add this import at the top

// Then add this route inside the <Routes> block:
function App() {
 const location = useLocation();
  const path = location.pathname;

  // --- EASY NAVBAR LOGIC ---
  let currentNavbar;

  if ( path === '/admin' || path === '/admin/register-admin' || path === '/register' || path === '/login') {
    currentNavbar = null;
  } else if (path.includes('/admin/')) {
    currentNavbar = <AdminNavbar />;
  }else if(path.includes('/guest/') || path === '/' ){
    currentNavbar = <GuestNavbar />
  }
   else {
    // 3. For everything else (Home, About, etc.), show the User Navbar
    currentNavbar = <Navbar />;
  }
  return (
    <div className="app" style={{backgroundImage:`url(${background})`, repeat:'no-repeat', backgroundSize:'cover', minHeight:'100vh', maxHeight:'100vh', overflowY:'auto', scrollbarWidth:'none' }}>
{currentNavbar}
  
      

      <div className="content p-30"  >
        <Routes>

          <Route path="/admin/register-admin" element={<RegisterAdmin />} />
          <Route path="/admin" element={<Adminlogin />} />
          <Route path="/admin/dashboard" element={<Admin />} />
           <Route path="/admin/hazard-map" element={<AdminHazardMap />} />
          <Route path="/admin/pending-account" element={<UserApproval />} />
          <Route path="/admin/report" element={<ReportedIncident />} />
          <Route path="/admin/borrow" element={<BorrowedVehicles />} />
          <Route path="/admin/appointment" element={<AdminAppointmentDashboard />} />
          <Route path="/admin/checkup" element={<CheckUpTable />} />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />


          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<Profile />} /> 
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/hazard-report" element={<HazardReport />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/checkup" element={<CheckUp />} />
          <Route path="/hazardmap" element={<UserHazardmap />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/register" element={<CreateUser />} />
           <Route path="/yearly-incident-trends" element={<MonthlyIncidentTrends />} />
          <Route path="*" element={<Navigate to="/" />} />

           <Route path="/guest/hazardmap" element={<UserHazardmap />} />
            <Route path="/guest/yearly-incident-trends" element={<MonthlyIncidentTrends   />} />
          <Route path="/" element={<Guest />} />

          
          
        </Routes>
      </div>
    </div>
  )
}

export default App;
