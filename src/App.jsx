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

function App() {
  // Kunin ang kasalukuyang path/URL
  const location = useLocation();

  return (
    <div className="app">
     
      {location.pathname !== '/' && <Navbar />}

      <div className="content">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/checkup" element={<CheckUp />} />
          
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App