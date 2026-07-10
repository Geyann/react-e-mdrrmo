import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';
import { BellIcon, User2Icon } from 'lucide-react';

export default function StaffNavbar() {
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
      className="group relative inline-block py-2 my-2 px-2 text-white text-center font-semibold uppercase text-[#262626] transition-colors text-nowrap"
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-600">
        {children}
      </span>
      <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
    </Link>
  );

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 absolute inset-x-0 top-0 z-5000 w-full p-3 border-b border-gray-500">
      <div className="flex items-center justify-between ">
        <Link to="/home" title='Go to Home Page.' className="z-50">
          <img src={imgLogo} alt="logo" className=" top-10 left-3 w-16 h-12 hover:h-12.5 " />
      
        </Link>

        <button 
          className="lg:hidden z-50 text-2xl text-white font-bold" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '✖' : '☰'}
        </button>

        <nav className={`${isOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row absolute lg:static top-full left-0 w-full lg:w-auto bg-white/95  lg:bg-transparent p-6 lg:p-0 gap-2 items-center`}>
          <NavLink to="/staff/borrow" onClick={() => setIsOpen(false)}>Borrow Vehicle</NavLink>
          <NavLink to="/staff/checkup" onClick={() => setIsOpen(false)}>OPD Check Up Form</NavLink>
          <NavLink to="/staff/inventory" onClick={() => setIsOpen(false)}>Inventory Management</NavLink>
          <NavLink to="/staff/borrower-slip" onClick={() => setIsOpen(false)}>Borrower Slip </NavLink>
          <NavLink to="/staff/settings" onClick={() => setIsOpen(false)}>Settings</NavLink>
          
          {/* Mobile logout button */}
          <button 
            onClick={handleLogout}
            className="lg:hidden py-2 px-4 text-lg font-semibold uppercase text-red-600"
          >
            Log out
          </button>
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="group text-white relative inline-block py-2 px-4 text-center font-semibold uppercase text-[#262626] transition-colors"
          >
            <span className="text-nowrap relative z-10 transition-colors duration-300 group-hover:text-gray-700">
              Log out
            </span>
            <span className="absolute rounded-md top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </button>
          
          <Link to="/profile" title='View Profile Picture.'><User2Icon className="text-white hover:bg-white hover:text-gray-700 rounded-xl" /></Link>
          <Link to="  /notification" title='Notifications.'><BellIcon className='text-white hover:bg-white hover:text-gray-700 rounded-xl' /></Link>
        </div>
      </div>
    </header>
  );
}