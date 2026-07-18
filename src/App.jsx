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
import Profile from './pages/Profile'
import AuthCallback from './pages/AuthCallback'
import CreateUserForOauth from './components/CreateUserForOauth'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLoginRedirect from './components/AdminLoginRedirect'
import StaffNavbar from './components/StaffNavbar'
import StaffHome from './pages/StaffHome'
import StaffInventory from './pages/StaffInventory'
import DynamicNavbar from './components/dynamicNavbar'
import EditProfile from './pages/editProfile'

function App() {
  const location = useLocation();
  const path = location.pathname;


  return (
    <div className="app" style={{ backgroundImage: `url(${background})`, repeat: 'no-repeat', backgroundSize: 'cover', minHeight: '100vh', maxHeight: '100vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
     <DynamicNavbar /> {/* <-- THIS IS ALL YOU NEED */}
      <div className="content pt-20">
        <Routes>

          {/* ===== PUBLIC ROUTES (no protection needed) ===== */}
          <Route path="/" element={<Guest />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<CreateUser />} />
          <Route path="/register/oauth" element={<CreateUserForOauth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* ===== ADMIN LOGIN ROUTES (exact paths, must be BEFORE /admin/*) ===== */}
          <Route path="/admin" element={<AdminLoginRedirect />} />
          <Route path="/admin/" element={<AdminLoginRedirect />} />
          <Route path="/admin/register-admin" element={<RegisterAdmin />} />

          {/* ===== GUEST ROUTES (no login needed) ===== */}
          <Route path="/guest/hazardmap" element={<UserHazardmap />} />
          <Route path="/guest/yearly-incident-trends" element={<MonthlyIncidentTrends />} />

          {/* ===== PROTECTED USER ROUTES ===== */}
          <Route path="/home" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />
          <Route path="/track" element={
            <ProtectedRoute><TrackAppointment/></ProtectedRoute>
          } />
          <Route path="/about" element={
            <ProtectedRoute><About /></ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute><Report /></ProtectedRoute>
          } />
          <Route path="/hazard-report" element={
            <ProtectedRoute><HazardReport /></ProtectedRoute>
          } />
          <Route path="/borrow" element={
            <ProtectedRoute><Borrow /></ProtectedRoute>
          } />
          <Route path="/appointment" element={
            <ProtectedRoute><Appointment /></ProtectedRoute>
          } />
          <Route path="/checkup" element={
            <ProtectedRoute><CheckUp /></ProtectedRoute>
          } />
          <Route path="/hazardmap" element={
            <ProtectedRoute><UserHazardmap /></ProtectedRoute>
          } />
          <Route path="/edit-profile" element={<EditProfile/>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/profile" element={
          <Profile/>} />
          <Route path="/yearly-incident-trends" element={
            <ProtectedRoute><MonthlyIncidentTrends /></ProtectedRoute>
          } />

          {/* ===== PROTECTED ADMIN ROUTES ===== */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>
          } />
          <Route path="/admin/register-admin" element={
            <ProtectedRoute adminOnly={true}><RegisterAdmin /></ProtectedRoute>
          } />
          <Route path="/admin/hazard-map" element={
            <ProtectedRoute adminOnly={true}><AdminHazardMap /></ProtectedRoute>
          } />
          <Route path="/admin/pending-account" element={
            <ProtectedRoute adminOnly={true}><UserApproval /></ProtectedRoute>
          } />
          <Route path="/admin/report" element={
            <ProtectedRoute adminOnly={true}><ReportedIncident /></ProtectedRoute>
          } />
          <Route path="/admin/borrow" element={
            <ProtectedRoute adminOnly={true}><BorrowedVehicles /></ProtectedRoute>
          } />
          <Route path="/admin/appointment" element={
            <ProtectedRoute adminOnly={true}><AdminAppointmentDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/checkup" element={
            <ProtectedRoute adminOnly={true}><CheckUpTable /></ProtectedRoute>
          } />
          {/* ===== PROTECTED STAFF ROUTES ===== */}
           <Route path="/staff/dashboard" element={
            <ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>
          } />
           <Route path="/staff/borrow" element={
            <ProtectedRoute staffOnly={true}><Borrow /></ProtectedRoute>
          } />
           <Route path="/staff/checkup" element={
            <ProtectedRoute staffOnly={true}><CheckUp /></ProtectedRoute>
          } />
           <Route path="/staff/inventory" element={
            <ProtectedRoute staffOnly={true}><StaffInventory /></ProtectedRoute>
          } />
           <Route path="/staff/borrower-slip" element={
            <ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>
          } />
           <Route path="/staff/settings" element={
            <ProtectedRoute staffOnly={true}><Settings /></ProtectedRoute>
          } />
           <Route path="/staff/profile" element={
            <ProtectedRoute staffOnly={true}><Profile /></ProtectedRoute>
          } />
           <Route path="/staff/notification" element={
            <ProtectedRoute staffOnly={true}><StaffHome /></ProtectedRoute>
          } />

          {/* ===== ADMIN CATCH-ALL (must be LAST after all /admin/* exact routes) ===== */}
          <Route path="/admin/*" element={<Navigate to="/admin" />} />
          
         

          {/* ===== CATCH-ALL FOR EVERYTHING ELSE ===== */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App