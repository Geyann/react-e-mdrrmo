import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import Notification from './notification';
import { User2Icon, MenuIcon, XIcon, LogOut } from 'lucide-react';

export default function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false);
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
      className="relative block w-full py-3 px-6 text-left text-white text-sm font-semibold uppercase transition-colors duration-200 hover:bg-white hover:text-blue-600"
    >
      {children}
    </Link>
  );

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/hazard-map', label: 'Hazard Map' },
    { to: '/admin/pending-account', label: 'User Approval' },
    { to: '/admin/inventory', label: 'Admin Inventory' },
    { to: '/admin/report', label: 'Incident Reported' },
    { to: '/admin/borrow', label: 'Borrowed Vehicles' },
    { to: '/admin/appointment', label: 'Appointments' },
    { to: '/admin/checkup', label: 'Out Patient Check-ups' },
    { to: '/admin/settings', label: 'Settings' },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          TOP NAVBAR — notifications / profile / logout on the RIGHT
          ══════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 h-16 z-[60] bg-gradient-to-r from-blue-600 to-purple-600 border-b border-purple-500/40 shadow-lg flex items-center justify-between gap-3 px-3 sm:px-4">
        {/* Left: toggle + brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            className="p-2 rounded-lg text-white hover:bg-white/15 active:scale-95 transition shrink-0"
          >
            {isOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-2 min-w-0">
            <img src={imgLogo} alt="MDRRMO logo" className="h-9 w-auto shrink-0" />
            <span className="text-white text-base sm:text-lg font-bold truncate hidden xs:inline sm:inline">
              Admin Portal
            </span>
          </Link>
        </div>

        {/* Right: notification bell, profile, logout */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Notification />

          <Link
            to="/admin/profile"
            title="Profile"
            aria-label="View profile"
            className="p-2 rounded-xl text-white hover:bg-white/15 active:scale-95 transition"
          >
            <User2Icon size={22} />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-bold uppercase hover:bg-white/15 active:scale-95 transition"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          OVERLAY — below the top bar so the toggle stays clickable
          ══════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — starts below the top bar
          ══════════════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-16 bottom-0 left-0 w-64 z-50 bg-gradient-to-b from-blue-600 to-purple-600 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="py-4 px-6 border-b border-purple-400/40 shrink-0">
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">
              Management
            </p>
          </div>

          <div className="flex-grow flex flex-col py-2">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setIsOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile-only logout (the top bar's is hidden below sm) */}
          <div className="p-4 border-t border-purple-400/40 shrink-0 sm:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold uppercase hover:bg-white/15 transition"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
