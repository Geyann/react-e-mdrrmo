import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';

export default function GuestNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/admin');
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50 w-full p-6 ">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="z-50">
          <img src={imgLogo} alt="logo" className="h-10 w-auto" />
        </Link>

        {/* Desktop Links / Mobile Toggle */}
        <div className="flex items-center gap-6 ">
          <Link 
            to="/login" 
            className="group relative inline-block py-2 px-4 text-lg font-semibold uppercase text-[#262626] transition-colors"
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
              Log in
            </span>
            <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </Link>

          {/* Hamburger */}
          <button 
            onClick={toggleMenu}
            className="flex flex-col items-center justify-center space-y-1.5 md:hidden z-50 p-2"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-6 bg-[#262626] transition-transform duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-6 bg-[#262626] transition-opacity duration-300 ${isOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-[#262626] transition-transform duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      <div className={`fixed inset-0 bg-[#fafafa] flex flex-col items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <nav className="flex flex-col items-center gap-8">
           <Link to="/" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase">Home</Link>
           {/* Add other menu items here as needed */}
           <Link to="/login" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase">Log in</Link>
        </nav>
      </div>
    </header>
  );
}