import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import { User2Icon } from 'lucide-react';
import Notification from './notification';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setIsOpen(false);
    navigate('/');
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  const NavLink = ({ to, children, className = '' }) => (
    <Link
      to={to}
      onClick={() => setIsOpen(false)}
      className={`group relative inline-block whitespace-nowrap py-2 text-center font-semibold uppercase transition-colors ${className}`}
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-600">
        {children}
      </span>
      <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );

  const LINK_BASE = "px-3 py-2 text-white text-md";

  return (
    <header className="absolute inset-x-0 top-0 z-[50000] w-full border-b border-gray-500 bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 lg:px-4">
      <div className="flex items-center justify-between gap-3">
        {/* Logo — smaller, keeps aspect ratio */}
        <Link to="/home" title="Go to Home Page." className="z-50 flex-shrink-0">
          <img src={imgLogo} alt="logo" className="h-9 w-auto lg:h-10" />
        </Link>

        {/* ===== Desktop nav ===== */}
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/hazard-report" className={LINK_BASE}>Hazard Report</NavLink>
          <NavLink to="/report" className={LINK_BASE}>Report Incident</NavLink>
          <NavLink to="/borrow" className={LINK_BASE}>Borrow Vehicle</NavLink>
          <NavLink to="/appointment" className={LINK_BASE}>Book Appointment</NavLink>
          <NavLink to="/track" className={LINK_BASE}>Track Appointments</NavLink>
          <NavLink to="/checkup" className={LINK_BASE}>OPD Check-up</NavLink>
          <NavLink to="/about" className={`hidden xl:inline-block ${LINK_BASE}`}>About</NavLink>
          <NavLink to="/settings" className={`hidden xl:inline-block ${LINK_BASE}`}>Settings</NavLink>
        </nav>

        {/* ===== Right cluster — always visible, compact ===== */}
        <div className="relative z-[60000] flex flex-shrink-0 items-center gap-1 lg:gap-1">
          {/* Log out — desktop only */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center rounded-lg px-4 py-3 text-md font-semibold uppercase text-white transition hover:bg-white/10 lg:flex xl:text-md"
          >
            Log out
          </button>

          {/* Profile */}
          <Link
            to="/profile"
            title="View Profile"
            aria-label="View Profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl p-1.5 text-white transition hover:bg-white hover:text-gray-700"
          >
            <User2Icon className="h-5 w-5 lg:h-6 lg:w-6" />
          </Link>

          {/* Notification bell (your fixed component) */}
          <Notification />

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="z-50 p-1 text-2xl font-bold text-white lg:hidden"
            onClick={() => setIsOpen((o) => !o)}
          >
            {isOpen ? '✖' : '☰'}
          </button>
        </div>
      </div>

      {/* ===== Mobile menu ===== */}
      {isOpen && (
        <nav
          ref={menuRef}
          className="absolute left-0 top-full flex w-full flex-col items-center gap-1 bg-white p-6 shadow-2xl lg:hidden"
        >
          <NavLink to="/hazard-report">Hazard Report</NavLink>
          <NavLink to="/report">Report Incident</NavLink>
          <NavLink to="/borrow">Borrow Vehicle</NavLink>
          <NavLink to="/appointment">Book Appointment</NavLink>
          <NavLink to="/track">Track Appointments</NavLink>
          <NavLink to="/checkup">OPD Check-up</NavLink>
          <NavLink to="/yearly-incident-trends">Incident Trends</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/settings">Settings</NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="py-2 px-4 text-lg font-semibold uppercase text-red-600"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}