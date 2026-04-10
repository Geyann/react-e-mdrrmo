import React, { useState } from 'react'; // 1. Import useState
import { Link } from 'react-router-dom';
import imgLogo from '../Images/icon.png';

export default function Navbar() {
  // 2. State to handle menu visibility
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="navbar-container">
      <div className="top-row">
        <div className="logo">
          <img id="logo" src={imgLogo} alt="logo" />
          <span>E-MDRRMO</span>
        </div>
        
        {/* 3. Hamburger Toggle Button (Visible only on mobile) */}
        <button className="hamburger" onClick={toggleMenu}>
          {isOpen ? '✖' : '☰'}
        </button>

        <div className="notif">
          <Link id='navbar-a' to="/" className="logout-btn">Log out</Link>
          <Link id='navbar-a' to="/profile" className="profile">👤</Link>
          <Link id='navbar-a' to="/notification" className="notification">🔔</Link>
        </div>
      </div>

      {/* 4. Conditional class based on isOpen state */}
      <nav className={`links-row ${isOpen ? 'active' : ''}`}>
        <Link id='navbar-a' to="/home" onClick={() => setIsOpen(false)}>Home</Link>
        <Link id='navbar-a' to="/report" onClick={() => setIsOpen(false)}>Report Incident</Link>
        <Link id='navbar-a' to="/borrow" onClick={() => setIsOpen(false)}>Borrow Vehicle</Link>
        <Link id='navbar-a' to="/appointment" onClick={() => setIsOpen(false)}>Book an Appointment</Link>
        <Link id='navbar-a' to="/track" onClick={() => setIsOpen(false)}>Track Appointment/s</Link>
        <Link id='navbar-a' to="/checkup" onClick={() => setIsOpen(false)}>Out Patient Check-up</Link>
        <Link id='navbar-a' to="/about" onClick={() => setIsOpen(false)}>About</Link>
        <Link id='navbar-a' to="/settings" onClick={() => setIsOpen(false)}>Settings</Link>
      </nav>
    </header>
  );
}