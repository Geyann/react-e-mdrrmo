import React, { useState } from 'react';
<<<<<<< HEAD
import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';

const AdminNavbar = () => {
  // 2. State to handle menu visibility
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
=======
import { Link } from 'react-router-dom';
import imgLogo from '../Images/icon.png';

const adminNavbar = () => {
  // 2. State to handle menu visibility
  const [isOpen, setIsOpen] = useState(false);
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

<<<<<<< HEAD
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/admin');
  };

=======
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
  return (
    <header className="navbar-container">
      <div className="top-row">        
        {/* 3. Hamburger Toggle Button (Visible only on mobile) */}
        <button className="hamburger" onClick={toggleMenu}>
          {isOpen ? '✖' : '☰'}
        </button>
        <div className="logo">
          <img id="logo" src={imgLogo} alt="logo" />
        </div>


      {/* 4. Conditional class based on isOpen state */}
      <nav className={`links-row ${isOpen ? 'active' : ''}`}>
<<<<<<< HEAD
        <Link className='navbar-a' to="/admin/dashboard" onClick={() => setIsOpen(false)}>Dashboard </Link>
          <Link className='navbar-a' to="/admin/hazard-map" onClick={() => setIsOpen(false)}>Hazard Map </Link>
        <Link className='navbar-a' to="/admin/pending-account" onClick={() => setIsOpen(false)}>User Approval </Link>
        <Link className='navbar-a' to="/admin/report" onClick={() => setIsOpen(false)}>Incident Reported</Link>
        <Link className='navbar-a' to="/admin/borrow" onClick={() => setIsOpen(false)}>Borrowed Vehicles</Link>
        <Link className='navbar-a' to="/admin/appointment" onClick={() => setIsOpen(false)}>Appointments</Link>
        <Link className='navbar-a' to="/admin/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-ups</Link>
        <Link className='navbar-a' to="/admin/settings" onClick={() => setIsOpen(false)}>Settings</Link>
      </nav>  
         <div className="notif">
                  <Link id='navbar-a' to="/admin" className="logout-btn">Log out</Link>
                  <Link className="navbar-a profile" to="/profile"><img src="https://cdn-icons-png.flaticon.com/128/3033/3033143.png" loading="lazy" alt="Account" title="Account" width="35" height="35" /></Link>
                  <Link className="navbar-a notification" to="/notification"><img src="https://cdn-icons-png.flaticon.com/512/3602/3602123.png" width="35" height="35" alt="Notifications" title="Notifications"  /></Link>
=======
        <Link id='navbar-a' to="/admin/dashboard" onClick={() => setIsOpen(false)}>Dashboard </Link>
        <Link id='navbar-a' to="/admin/report" onClick={() => setIsOpen(false)}>Incident Reported</Link>
        <Link id='navbar-a' to="/admin/borrow" onClick={() => setIsOpen(false)}>Borrowed Vehicles</Link>
        <Link id='navbar-a' to="/admin/appointment" onClick={() => setIsOpen(false)}>Appointments</Link>
        <Link id='navbar-a' to="/admin/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-ups</Link>
        <Link id='navbar-a' to="/admin/settings" onClick={() => setIsOpen(false)}>Settings</Link>
      </nav>  
         <div className="notif">
                  <Link id='navbar-a' to="/" className="logout-btn">Log out</Link>
                  <Link id='navbar-a' to="/profile" className="profile"><img src="https://cdn-icons-png.flaticon.com/128/3033/3033143.png" loading="lazy" alt="Account " title="Account " width="35" height="35" /></Link>
                  <Link id='navbar-a' to="/notification" className="notification"><img src="   https://cdn-icons-png.flaticon.com/512/3602/3602123.png " width="35" height="35" alt="" title=""  /></Link>
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
              
        
              </div>
      </div>
    </header>
  )
}

<<<<<<< HEAD
export default AdminNavbar
=======
export default adminNavbar
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
