import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import { BellIcon, User2Icon } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/');
  };

  const NavLink = ({ to, children, onClick }) => (
    <Link 
      to={to} 
      onClick={onClick}
      className="group relative inline-block py-2 px-1 text-center font-semibold uppercase text-[#262626] transition-colors text-nowrap"
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
        {children}
      </span>
      <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
      <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );

  return (
    <header className="bg-white absolute inset-x-0 top-0 z-5000 w-full p-6 border-b border-gray-500">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="z-50">
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
          <NavLink to="/hazard-report" onClick={() => setIsOpen(false)}>Hazard Report</NavLink>
          <NavLink to="/report" onClick={() => setIsOpen(false)}>Report Incident</NavLink>
          <NavLink to="/borrow" onClick={() => setIsOpen(false)}>Borrow Vehicle</NavLink>
          <NavLink to="/appointment" onClick={() => setIsOpen(false)}>Book an Appointment</NavLink>
          <NavLink to="/track" onClick={() => setIsOpen(false)}>Track Appointment/s</NavLink>
          <NavLink to="/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-up</NavLink>
          <NavLink to="/about" onClick={() => setIsOpen(false)}>About</NavLink>
          <NavLink to="/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>
        </nav>

        {/* Desktop: Logout + Icons */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="group relative inline-block py-2 px-4 text-center font-semibold uppercase text-[#262626] transition-colors"
          >
            <span className="text-nowrap relative z-10 transition-colors duration-300 group-hover:text-white">
              Log out
            </span>
            <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </button>
          <Link to="/profile"><User2Icon className="hover:bg-red-100" /></Link>
          <Link to="/notification"><BellIcon /></Link>
        </div>

        {/* Mobile Logout Button */}
        <button
          onClick={handleLogout}
          className={`${isOpen ? 'flex' : 'hidden'} lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-red-700 transition`}
        >
          Log out
        </button>
      </div>
    </header>
  );
}