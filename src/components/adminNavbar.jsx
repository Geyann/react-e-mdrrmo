import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import { BellIcon, User2Icon } from 'lucide-react';

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
      className="group relative inline-block py-2 px-1 text-white text-center font-semibold uppercase text-[#262626] transition-colors text-nowrap"
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
        {children}
      </span>
      <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
      <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );

  return (
    <header className="absolute inset-x-0 top-0 z-5000 bg-gradient-to-r from-blue-600 to-purple-600 w-full p-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/admin/dashboard" className="z-50">
          <img src={imgLogo} alt="logo" className="h-10 w-auto" />
        </Link>

        {/* Hamburger Toggle */}
        <button 
          className="lg:hidden z-50 text-2xl font-bold" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '✖' : '☰'}
        </button>

        {/* Navigation Links */}
        <nav className={`${isOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row absolute lg:static top-full left-0 w-full lg:w-auto bg-white/95 lg:bg-transparent p-6 lg:p-0 gap-2 items-center`}>
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
            className="lg:hidden py-2 px-4 text-lg font-semibold uppercase text-red-600"
          >
            Log out
          </button>
        </nav>

        {/* Desktop logout + icons */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="group relative inline-block py-2 px-4 text-center text-white font-semibold uppercase text-[#262626] transition-colors"
          >
            <span className="text-nowrap relative z-10 transition-colors duration-300 group-hover:text-white">
              Log out
            </span>
            <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </button>
          <Link to="/profile"><User2Icon className=" text-white" /></Link>
          <Link to="/notification"><BellIcon className='text-white' /></Link>
        </div>
      </div>
    </header>
  );
}