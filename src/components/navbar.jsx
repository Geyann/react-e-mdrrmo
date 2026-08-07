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
      className="group relative inline-block py-2 my-2 px-2 text-gray-800 lg:text-white text-center font-semibold uppercase transition-colors text-nowrap"
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-600">
        {children}
      </span>
      <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );

  return (
    <header className="absolute inset-x-0 top-0 z-50 w-full border-b border-gray-500 bg-gradient-to-r from-blue-600 to-purple-600 p-3">
      <div className="flex items-center justify-between">
        <Link to="/home" title="Go to Home Page." className="z-50">
          <img src={imgLogo} alt="logo" className="w-16 h-12" />
        </Link>

        <button
          className="z-50 text-2xl font-bold text-white lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '✖' : '☰'}
        </button>

        <nav className={`${isOpen ? 'flex' : 'hidden'} absolute top-full left-0 w-full flex-col items-center gap-2 bg-white p-6 lg:static lg:flex lg:w-auto lg:flex-row lg:bg-transparent lg:p-0`}>
          <NavLink to="/hazard-report" onClick={() => setIsOpen(false)}>Hazard Report</NavLink>
          <NavLink to="/report" onClick={() => setIsOpen(false)}>Report Incident</NavLink>
          <NavLink to="/borrow" onClick={() => setIsOpen(false)}>Borrow Vehicle</NavLink>
          <NavLink to="/appointment" onClick={() => setIsOpen(false)}>Book an Appointment</NavLink>
          <NavLink to="/track" onClick={() => setIsOpen(false)}>Track Appointment/s</NavLink>
          <NavLink to="/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-up</NavLink>
          <NavLink to="/about" onClick={() => setIsOpen(false)}>About</NavLink>
          <NavLink to="/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>

          {/* Mobile logout button */}
          <button
            onClick={handleLogout}
            className="py-2 px-4 text-lg font-semibold uppercase text-red-600 lg:hidden"
          >
            Log out
          </button>
        </nav>

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

          <Link to="/profile" title="View Profile Picture."><User2Icon className="rounded-xl text-white hover:bg-white hover:text-gray-700" /></Link>
          <Link to="/notification" title="Notifications."><BellIcon className="rounded-xl text-white hover:bg-white hover:text-gray-700" /></Link>
        </div>
      </div>
    </header>
  );
}