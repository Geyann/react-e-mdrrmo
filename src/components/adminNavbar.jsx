import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import Notification from './notification';
import { User2Icon, MenuIcon, XIcon } from 'lucide-react'; // Import MenuIcon and XIcon
import { BellAlertIcon } from '@heroicons/react/16/solid'; // Keeping BellAlertIcon

export default function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false); // State to control sidebar's open/close status
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/admin');
  };

  const NavLink = ({ to, children, onClick }) => (
    <Link
      to={to}
      onClick={onClick}
      // Styling for vertical links in the sidebar
      className="relative block w-full py-3 px-6 text-left text-white font-semibold uppercase transition-colors duration-300 hover:bg-white hover:text-blue-600"
    >
      {children}
    </Link>
  );

  return (
    <>
      {/* Overlay - visible when sidebar is open on any screen size to click outside and close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 z-40" // Removed lg:hidden here
          onClick={() => setIsOpen(false)} // Clicking this overlay closes the sidebar
        ></div>
      )}

      {/* Sidebar Navigation Container */}
      <nav
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-600 to-purple-600 transform transition-transform duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} // Controls sliding in/out universally
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header: Logo and Close button */}
          <div className="flex items-center justify-between p-4 border-b border-blue-500">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <img src={imgLogo} alt="logo" className="h-10 w-auto" />
              <span className="text-white text-xl font-bold">Admin</span>
            </Link>
            {/* THIS IS THE BUTTON TO CLOSE THE SIDEBAR, now visible on all screens */}
            <button
              className="text-white" // Removed lg:hidden, so it's always visible when sidebar is open
              onClick={() => setIsOpen(false)} // This function call closes the sidebar
              aria-label="Close menu"
            >
              <XIcon size={24} /> {/* The 'X' icon */}
            </button>
          </div>

          {/* Navigation Links - Scrollable area if content overflows */}
          <div className="flex-grow flex flex-col py-4 overflow-y-auto">
            <NavLink to="/admin/dashboard" onClick={() => setIsOpen(false)}>Dashboard</NavLink>
            <NavLink to="/admin/hazard-map" onClick={() => setIsOpen(false)}>Hazard Map</NavLink>
            <NavLink to="/admin/pending-account" onClick={() => setIsOpen(false)}>User Approval</NavLink>
            <NavLink to="/admin/inventory" onClick={() => setIsOpen(false)}>Admin Inventory</NavLink>
            <NavLink to="/admin/report" onClick={() => setIsOpen(false)}>Incident Reported</NavLink>
            <NavLink to="/admin/borrow" onClick={() => setIsOpen(false)}>Borrowed Vehicles</NavLink>
            <NavLink to="/admin/appointment" onClick={() => setIsOpen(false)}>Appointments</NavLink>
            <NavLink to="/admin/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-ups</NavLink>
            <NavLink to="/admin/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>
          </div>

          {/* Sidebar Footer: Logout, Profile, Notifications */}
          <div className="flex flex-col items-center p-4 border-t border-blue-500 gap-4">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 text-center text-white font-semibold uppercase transition-colors duration-300 hover:bg-white hover:text-red-600"
            >
              Log out
            </button>
            <div className="flex items-center gap-4">
              <Link to="/admin/profile" title="Profile" className='relative rounded-xl p-2 text-slate-100 transition hover:bg-slate-100 hover:text-slate-900' onClick={() => setIsOpen(false)}>
                <User2Icon className="text-white hover:text-purple-600" size={24} />
              </Link>
              <Notification />
            </div>
          </div>
        </div>
      </nav>

      {/* Open Sidebar Toggle Button */}
      {/* This button is fixed on the top-left and only visible when the sidebar is currently closed, on ALL screen sizes */}
      {!isOpen && (
        <button
          className="fixed top-4 left-4 z-50 text-white p-2 rounded-md bg-blue-600" // Removed lg:hidden
          onClick={() => setIsOpen(true)} // This function call opens the sidebar
          aria-label="Open menu"
        >
          <MenuIcon size={24} /> {/* The 'hamburger' icon */}
        </button>
      )}

      {/*
        ***********************************************************************************************
        IMPORTANT: Adjusting your main content's position

        Because the sidebar can now open and close on ALL screen sizes, your main page content
        needs to dynamically shift to avoid being covered by the sidebar or having an empty gap
        when the sidebar is closed.

        You need to modify the parent component (e.g., your App.js or Layout.js) that renders
        this AdminNavbar and your main routes.

        Here's how you should structure your parent component:

        // In your App.js or main layout component
        import React, { useState } from 'react';
        import AdminNavbar from './components/AdminNavbar'; // Adjust path as needed
        // ... other imports like Routes, etc.

        function App() {
          const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Manage sidebar state here

          return (
            <div className="flex min-h-screen"> // Ensure container takes full height
              <AdminNavbar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> // Pass state
              <main
                className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}
              >
                // Your routing logic and page content goes here, e.g., <Routes>...</Routes>
                // Example:
                <div className="p-4"> // Add padding to your actual content
                  <h1>Welcome to the Dashboard!</h1>
                  <p>This is your main content area.</p>
                </div>
              </main>
            </div>
          );
        }
        export default App;

        ***********************************************************************************************
      */}
    </>
  );
}