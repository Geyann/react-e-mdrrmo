"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  MapPin,
  UserCheck,
  LogOut,
  Trash2,
  ChevronRight,
  Check,
} from 'lucide-react';
import imglogo from '../Images/icon.png';

// ── Reusable switch — real <button role="switch">, keyboard accessible ──
const Toggle = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
      checked
        ? 'bg-blue-600 border-blue-700 shadow-sm shadow-blue-600/40'
        : 'bg-gray-200 border-gray-400 shadow-sm'
    } ${
      disabled
        ? 'opacity-60 cursor-not-allowed'
        : 'cursor-pointer hover:shadow-md active:scale-90'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings = () => {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('mdrrmo_theme') === 'dark'; } catch { return false; }
  });
  const [notifications, setNotifications] = useState({
    weather: true,
    advisories: true,
    drills: false,
  });
  const [locationAccess, setLocationAccess] = useState(true);
  const [publicName, setPublicName] = useState(false);
  const [profile, setProfile] = useState({ name: 'Guest User', email: 'Not signed in' });
  const [saved, setSaved] = useState(false);
  const toastTimer = useRef(null);

  // Load profile from the same source the Appointment form uses
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        const name =
          u.full_name ||
          `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
          u.email ||
          'Guest User';
        setProfile({ name, email: u.email || '—' });
      }
    } catch { /* ignore malformed localStorage */ }
  }, []);

  // Keep the stored theme applied app-wide via <html class="dark">
  useEffect(() => {
    try {
      localStorage.setItem('mdrrmo_theme', isDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', isDark);
    } catch { /* ignore */ }
  }, [isDark]);

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSaved(false), 2000);
  };

  const commit = (updater) => {
    updater();
    flashSaved();
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try { localStorage.removeItem('currentUser'); } catch {}
      window.location.reload();
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all preferences to their defaults?')) {
      commit(() => {
        setNotifications({ weather: true, advisories: true, drills: false });
        setLocationAccess(true);
        setPublicName(false);
      });
    }
  };

  // ── Theme-aware class map (page still follows the stored theme) ──
  const t = {
    page: isDark ? 'bg-slate-900' : 'bg-gray-100',
    card: isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-white border-gray-200',
    panel: isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-gray-50 border-gray-200',
    rowBorder: isDark ? 'border-slate-700/60' : 'border-gray-100',
    title: isDark ? 'text-slate-100' : 'text-gray-800',
    label: isDark ? 'text-slate-200' : 'text-gray-700',
    sub: isDark ? 'text-slate-400' : 'text-gray-500',
    chip: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
  };

  // ── Shared settings row layout — clickable rows when onClick is provided ──
  const Row = ({ icon, title, sub, children, onClick }) => {
    const clickable = typeof onClick === 'function';
    return (
      <div
        onClick={clickable ? onClick : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        aria-label={clickable ? title : undefined}
        className={`flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0 ${t.rowBorder} ${
          clickable
            ? `cursor-pointer rounded-xl px-3 -mx-3 transition-colors duration-150 ${
                isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-100'
              }`
            : ''
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.chip}`}>{icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${t.label}`}>{title}</p>
            {sub && <p className={`text-xs mt-0.5 ${t.sub}`}>{sub}</p>}
          </div>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-4 sm:p-10 font-sans transition-colors duration-300 `}>

      {/* Auto-save toast */}
      {saved && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Settings saved
        </div>
      )}

      {/* ─── Gradient header — same family as "Schedule an Appointment" ─── */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl">
        <div className="flex flex-col items-center pt-8 pb-6 px-4 text-center">
         <SettingsIcon className="w-25 h-auto text-white" />
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             Settings
          </h1>
          <p className="text-white/90 text-sm mt-1">Manage your profile, preferences, and privacy</p>
        </div>
      </div>

      {/* ─── Body card ─── */}
      <div className={`max-w-4xl mx-auto ${t.card} rounded-b-3xl shadow-xl border p-6 md:p-8 space-y-6`}>

        {/* ── 1. Profile & Account ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <User className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Profile & Account</h2>
          </div>

          {/* User banner */}
          <div className={`flex items-center gap-4 rounded-xl p-4 border mb-4 ${
            isDark ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-bold truncate ${t.title}`}>{profile.name}</h3>
              <p className={`text-sm truncate ${t.sub}`}>{profile.email}</p>
              <p className={`text-[10px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Resident • Naic, Cavite
              </p>
            </div>
          </div>

          <Row
            icon={<User className="w-4 h-4" />}
            title="Edit Profile Information"
            sub="Update your name, contact details, and address"
          >
            <Link
              type="button"
              to="/edit-profile"
              className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/10'
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Manage <ChevronRight className="w-4 h-4" />
            </Link>
          </Row>

          <Row
            icon={<Shield className="w-4 h-4" />}
            title="Change Password"
            sub="Keep your account secure with a strong password"
          >
            <button
              type="button"
              className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/10'
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Update <ChevronRight className="w-4 h-4" />
            </button>
          </Row>
        </section>

        {/* ── 2. Notification Preferences ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <Bell className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Notification Preferences</h2>
          </div>

          <Row
            icon={<Bell className="w-4 h-4" />}
            title="Critical Weather Alerts"
            sub="Typhoon, flood, and severe weather warnings"
            onClick={() => commit(() => setNotifications(p => ({ ...p, weather: !p.weather })))}
          >
            <Toggle
              checked={notifications.weather}
              onChange={(v) => commit(() => setNotifications(p => ({ ...p, weather: v })))}
              label="Critical weather alerts"
            />
          </Row>

          <Row
            icon={<Bell className="w-4 h-4" />}
            title="Local Advisory Bulletins"
            sub="Municipal advisories and announcements for Naic"
            onClick={() => commit(() => setNotifications(p => ({ ...p, advisories: !p.advisories })))}
          >
            <Toggle
              checked={notifications.advisories}
              onChange={(v) => commit(() => setNotifications(p => ({ ...p, advisories: v })))}
              label="Local advisory bulletins"
            />
          </Row>

          <Row
            icon={<Bell className="w-4 h-4" />}
            title="Scheduled Drill Reminders"
            sub="Community preparedness and evacuation drills"
            onClick={() => commit(() => setNotifications(p => ({ ...p, drills: !p.drills })))}
          >
            <Toggle
              checked={notifications.drills}
              onChange={(v) => commit(() => setNotifications(p => ({ ...p, drills: v })))}
              label="Drill reminders"
            />
          </Row>

          <Row
            icon={<Shield className="w-4 h-4" />}
            title="Emergency Alerts"
            sub="Life-safety alerts can never be turned off"
          >
            <Toggle checked disabled label="Emergency alerts" />
          </Row>
        </section>

        {/* ── 3. Data & Privacy ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <MapPin className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Data & Privacy</h2>
          </div>

          <Row
            icon={<MapPin className="w-4 h-4" />}
            title="Location Access"
            sub="Required to receive weather and disaster alerts specific to your vicinity in Naic"
            onClick={() => commit(() => setLocationAccess(!locationAccess))}
          >
            <Toggle
              checked={locationAccess}
              onChange={(v) => commit(() => setLocationAccess(v))}
              label="Location access"
            />
          </Row>

          <Row
            icon={<UserCheck className="w-4 h-4" />}
            title="Show My Name on Public Reports"
            sub="Display your name on hazard reports submitted publicly"
            onClick={() => commit(() => setPublicName(!publicName))}
          >
            <Toggle
              checked={publicName}
              onChange={(v) => commit(() => setPublicName(v))}
              label="Show name on public reports"
            />
          </Row>

          <Row
            icon={<Shield className="w-4 h-4" />}
            title="Manage My Data"
            sub="Request a copy or deletion of your records (RA 10173)"
          >
            <a
              href="mailto:mdrrmo@naic.cavite.gov.ph?subject=Data%20Access%20%2F%20Deletion%20Request"
              className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/10'
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Request <ChevronRight className="w-4 h-4" />
            </a>
          </Row>
        </section>

        {/* ── 4. Danger Zone ── */}
        <section className={`rounded-2xl border p-5 ${isDark ? 'bg-red-950/20 border-red-900/60' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
            }`}>
              <Trash2 className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Danger Zone</h2>
          </div>

          <Row
            icon={<LogOut className="w-4 h-4" />}
            title="Sign Out"
            sub="Ends your session on this device"
          >
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition"
            >
              Sign Out
            </button>
          </Row>

          <Row
            icon={<Trash2 className="w-4 h-4" />}
            title="Reset All Preferences"
            sub="Restores every setting above to its default value"
          >
            <button
              type="button"
              onClick={handleReset}
              className={`text-sm font-semibold px-4 py-2 rounded-xl border transition ${
                isDark
                  ? 'border-red-500/50 text-red-300 hover:bg-red-500/10'
                  : 'border-red-300 text-red-600 hover:bg-red-100'
              }`}
            >
              Reset
            </button>
          </Row>
        </section>

        {/* Footer */}
        <p className={`text-center text-xs ${t.sub}`}>
          MDRRMO Citizen Portal v1.0 — Preferences are saved automatically to your account.
        </p>
      </div>
    </div>
  );
};

export default Settings;