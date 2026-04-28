import React, { useState } from 'react';
import imglogo from '../images/icon.png';

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`settings-wrapper ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="settings-container">
        <h1 className="settings-main-title">Settings</h1>

        <div className="settings-grid-top">
          {/* General & Account Card */}
          <div className="settings-card purple-card">
            <div className="card-header">
              <span className="icon">⚙️</span>
              <h2>General & Account</h2>
            </div>
            <div className="card-content">
              <div className="setting-item">
                <span>Edit Profile Information</span>
                <button className="link-btn">Manage →</button>
              </div>
              <div className="setting-item">
                <span>Edit Profile Information</span>
                <button className="link-btn">Update →</button>
              </div>
            </div>
          </div>

          {/* Appearance Card */}
          <div className="settings-card purple-card">
            <div className="card-header">
              <span className="icon">☀️</span>
              <h2>Appearance</h2>
            </div>
            <div className="card-content">
              <div className="setting-item">
                <div className="text-group">
                  <span className="item-title">Dark Mode</span>
                  <p className="item-sub">Toggles the application theme between Light and Dark mode. Saved via Firestore.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isDarkMode} 
                    onChange={() => setIsDarkMode(!isDarkMode)} 
                  />
                  <span className="slider round"></span>
                  <span className="switch-label">{isDarkMode ? 'Dark' : 'Light'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences Card */}
        <div className="settings-card purple-card wide-card">
          <div className="card-header centered">
            <span className="icon">📢</span>
            <h2>Notification Preferences</h2>
          </div>
          <div className="card-content list-content">
            <div className="setting-item">
              <span className="item-title-small">Critical Weather Alerts (Typhoon, Flood)</span>
              <input type="checkbox" className="custom-checkbox" />
            </div>
            <div className="setting-item">
              <span className="item-title-small">Local Advisory Bulletins</span>
              <input type="checkbox" className="custom-checkbox" />
            </div>
            <div className="setting-item">
              <span className="item-title-small">Scheduled Drill Reminders</span>
              <input type="checkbox" className="custom-checkbox" />
            </div>
          </div>
        </div>

        {/* Data & Privacy Card */}
        <div className="settings-card purple-card wide-card">
          <div className="card-header centered">
            <h2>Data & Privacy</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="text-group">
                <span className="item-title">Location Access for Localized Alerts</span>
                <p className="item-sub">Required to receive weather and disaster alerts specific to your current vicinity in Naic.</p>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider round"></span>
                <span className="switch-label">Off</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;