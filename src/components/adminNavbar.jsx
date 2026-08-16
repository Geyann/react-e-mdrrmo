import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import Notification from './notification';
import {  User2Icon } from 'lucide-react';
import { BellAlertIcon } from '@heroicons/react/16/solid';

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
      className="group relative inline-block py-2  px-2 text-gray-800 lg:text-white text-center font-semibold uppercase transition-colors text-nowrap"
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-600">
        {children}
      </span>
      <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );


  return (
    <header className="absolute inset-x-0 top-0 z-5000 w-full bg-gradient-to-r from-blue-600 to-purple-600 p-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/admin/dashboard" className="z-50">
          <img src={imgLogo} alt="logo" className="h-10 w-auto" />
        </Link>

        {/* Hamburger Toggle */}
        <button
          className="z-50 text-2xl font-bold text-white lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '✖' : '☰'}
        </button>

        {/* Navigation Links */}
        <nav className={`${isOpen ? 'flex' : 'hidden'} absolute top-full left-0 w-full flex-col items-center gap-2 bg-white/95 p-6 lg:static lg:flex lg:w-auto lg:flex-row lg:bg-transparent lg:p-0`}>
          <NavLink to="/admin/dashboard" onClick={() => setIsOpen(false)}>Dashboard</NavLink>
          <NavLink to="/admin/hazard-map" onClick={() => setIsOpen(false)}>Hazard Map</NavLink>
          <NavLink to="/admin/pending-account" onClick={() => setIsOpen(false)}>User Approval</NavLink>
          <NavLink to="/admin/report" onClick={() => setIsOpen(false)}>Incident Reported</NavLink>
          <NavLink to="/admin/borrow" onClick={() => setIsOpen(false)}>Borrowed Vehicles</NavLink>
          <NavLink to="/admin/appointment" onClick={() => setIsOpen(false)}>Appointments</NavLink>
          <NavLink to="/admin/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-ups</NavLink>
          <NavLink to="/admin/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>

          {/* Mobile logout button */}
          <button
            onClick={handleLogout}
            className="py-2 px-4 text-lg font-semibold uppercase text-red-600 lg:hidden"
          >
            Log out
          </button>
        </nav>

        {/* Desktop logout + icons */}
        <div className="hidden items-center gap-4 lg:flex">
           <button
            onClick={handleLogout}
            className="group relative inline-block py-2 px-4 text-center text-white font-semibold uppercase transition-colors"
          >
            <span className="text-nowrap relative z-10 transition-colors duration-300 group-hover:text-gray-700">
              Log out
            </span>
            <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </button>
          <Link to="/admin/profile" title="Profile"><User2Icon className="text-white hover:rounded-xl hover:bg-white hover:text-gray-700" /></Link>
          <Notification />
          <BellAlertIcon/>
        </div>
      </div>
    </header>
  );
}