import React from 'react'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
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
import Hazardmap from './pages/Hazardmap'
import Settings from './pages/Settings'
import ReportedIncident from './pages/incidentReported'
import BorrowedVehicles from './pages/borrowedVehicles'
import TrackAppointment from './pages/trackAppointment'
import CheckUpTable from './pages/checkUpTable'
import CreateUser from './pages/CreateUser'
function App() {
 const location = useLocation();
  const path = location.pathname;

  // --- EASY NAVBAR LOGIC ---
  let currentNavbar;

  if (path === '/' || path === '/admin' || path === '/register-admin' || path === '/register') {
    // 1. If we are on login or register pages, show NO navbar
    currentNavbar = null;
  } else if (path.includes('/admin/')) {
    // 2. If the URL contains "/admin/", show the Admin Navbar
    currentNavbar = <AdminNavbar />;
  } else {
    // 3. For everything else (Home, About, etc.), show the User Navbar
    currentNavbar = <Navbar />;
  }
  return (
    <div className="app">
{currentNavbar}
  
      

      <div className="content">
        <Routes>

          <Route path="/register-admin" element={<RegisterAdmin />} />
          <Route path="/admin" element={<Adminlogin />} />
          <Route path="/admin/dashboard" element={<Admin />} />
          <Route path="/admin/report" element={<ReportedIncident />} />
          <Route path="/admin/borrow" element={<BorrowedVehicles />} />
          <Route path="/admin/appointment" element={<TrackAppointment />} />
          <Route path="/admin/checkup" element={<CheckUpTable />} />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />

          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/checkup" element={<CheckUp />} />
          <Route path="/hazardmap" element={<Hazardmap />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/register" element={<CreateUser />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
