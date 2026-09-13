import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import Notification from './notification';
import { User2Icon, MenuIcon, XIcon } from 'lucide-react';

export default function StaffNavbar() {
  const [isOpen, setIsOpen] = useState(true);
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
      className="relative block w-full py-3 px-6 text-left text-white font-semibold uppercase transition-colors duration-300 hover:bg-white hover:text-blue-600"
    >
      {children}
    </Link>
  );

  return (
    <>
      {/* Overlay - click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0  z-40"
          onClick={() => setIsOpen(true)}
        ></div>
      )}

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-600 to-purple-600 transform transition-transform duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header: Logo + Close */}
          <div className="flex items-center justify-between p-4 border-b border-blue-500">
            <Link to="/staff/dashboard" className="flex items-center gap-2">
              <img src={imgLogo} alt="logo" className="h-10 w-auto" />
              <span className="text-white text-xl font-bold">Staff</span>
            </Link>
            <button
              className="text-white"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              <XIcon size={24} />
            </button>
          </div>

          {/* Links */}
          <div className="flex-grow flex flex-col py-4 overflow-y-auto">
            <NavLink to="/staff/borrow" onClick={() => setIsOpen(false)}>Borrow Vehicle</NavLink>
            <NavLink to="/staff/checkup" onClick={() => setIsOpen(false)}>OPD Check Up Form</NavLink>
            <NavLink to="/staff/checkupqueue" onClick={() => setIsOpen(false)}>OPD Check Up Queue</NavLink>
            <NavLink to="/staff/inventory" onClick={() => setIsOpen(false)}>Inventory Management</NavLink>
            <NavLink to="/staff/borrower-slip" onClick={() => setIsOpen(false)}>Borrower Slip</NavLink>
            <NavLink to="/staff/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>
          </div>

          {/* Footer: Logout, Profile, Notifications */}
          <div className="flex flex-col items-center p-4 border-t border-blue-500 gap-4">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 text-center text-white font-semibold uppercase transition-colors duration-300 hover:bg-white hover:text-red-600"
            >
              Log out
            </button>
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                title="Profile"
                className="relative rounded-xl p-2 text-slate-100 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsOpen(true)}
              >
                <User2Icon className="text-white hover:text-purple-600" size={24} />
              </Link>
              <Notification />
            </div>
          </div>
        </div>
      </nav>

      {/* Open toggle - visible only when sidebar is closed */}
      {!isOpen && (
        <button
          className="fixed top-4 left-4 z-50 text-white p-2 rounded-md bg-blue-600"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon size={24} />
        </button>
      )}
    </>
  );
}