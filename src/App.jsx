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
function App() {
 const location = useLocation();
  const path = location.pathname;

  // --- EASY NAVBAR LOGIC ---
  let currentNavbar;

  if (path === '/' || path === '/admin' || path === '/register-admin') {
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
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<Adminlogin />} />
          <Route path="/admin/dashboard" element={<Admin />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/checkup" element={<CheckUp />} />
           <Route path="/hazardmap" element={<Hazardmap />} />
          
          
          <Route path="*" element={<Navigate to="/home" />} />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App