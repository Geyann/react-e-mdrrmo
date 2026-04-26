import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import imgLogo from '../Images/icon.png';

const adminNavbar = () => {
  // 2. State to handle menu visibility
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

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
        <Link id='navbar-a' to="/admin/dashboard" onClick={() => setIsOpen(false)}>Dashboard </Link>
        <Link id='navbar-a' to="/admin/report" onClick={() => setIsOpen(false)}>Incident Reported</Link>
        <Link id='navbar-a' to="/admin/borrow" onClick={() => setIsOpen(false)}>Borrowed Vehicles</Link>
        <Link id='navbar-a' to="/admin/appointment" onClick={() => setIsOpen(false)}>Appointments</Link>
        <Link id='navbar-a' to="/admin/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-ups</Link>
        <Link id='navbar-a' to="/admin/settings" onClick={() => setIsOpen(false)}>Settings</Link>
      </nav>  
        <div className="notif">
          <Link id='navbar-a' to="/" className="logout-btn">Log out</Link>
          <Link id='navbar-a' to="/profile" className="profile">👤</Link>
          <Link id='navbar-a' to="/notification" className="notification">🔔</Link>
      

      </div>
      </div>
    </header>
  )
}

export default adminNavbar