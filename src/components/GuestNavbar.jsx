import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';

export default function GuestNavbar() {

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/admin');
  };

  return (
    <header className="absolute bg-white inset-x-0 top-0 z-5000 w-full p-6 border-b-1 border-gray-500">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="z-50">
          <img src={imgLogo} alt="logo" className="h-10 w-auto" />
        </Link>

        {/* Desktop Links / Mobile Toggle */}
        <div className="flex items-center gap-6 ">
          <Link 
            to="/login" 
            className="group relative inline-block py-2 px-4 text-lg font-semibold uppercase text-[#262626] transition-colors "
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-white ">
              Log in
            </span>
            <span className="absolute inset-0 border-y-2 border-[#262626] opacity-0 transition-all duration-300 scale-y-[2] group-hover:scale-y-100 group-hover:opacity-100" />
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-[#262626] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </Link>

          {/* Hamburger */}
     
        </div>
      </div>

      
    </header>
  );
}