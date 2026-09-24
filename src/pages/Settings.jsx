"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, User, Bell, Shield, MapPin, UserCheck,
  LogOut, Trash2, ChevronRight, Check, AlertCircle, KeyRound,
  Loader2, Eye, EyeOff, X, Download,
} from 'lucide-react';
import { supabase } from '../createClient';

/* ══════════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════════ */

// `mdrrmo_theme` is the pre-existing dark-mode key — kept for compatibility.
const LS_THEME = 'mdrrmo_theme';
const LS_PREFS = 'mdrrmo_settings';

// The `user_settings` table has NO column for the public-name preference,
// so that one is localStorage-only. Every other key round-trips to the DB
// when the signed-in account has a real Supabase Auth session.
const DEFAULTS = {
  dark_mode: false,
  weather_alerts: true,
  local_advisories: true,
  drill_reminders: false,
  location_access: true,
  public_name: false,
};

// Columns that actually exist on `user_settings`.
const DB_COLUMNS = [
  'dark_mode',
  'weather_alerts',
  'local_advisories',
  'drill_reminders',
  'location_access',
];

// Must stay byte-identical to the hash used at registration and login
// (CreateUser.jsx / login.jsx / adminlogin.jsx / register-admin.jsx).
const PASSWORD_SALT = 'hackerai-salt-2024';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ══════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════════════════════════════════ */

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readLocalPrefs = () => {
  const stored = readJson(LS_PREFS, {});
  const merged = { ...DEFAULTS, ...stored };
  // Honour the old single-key dark-mode value if no bundle exists yet.
  if (stored.dark_mode === undefined) {
    merged.dark_mode = localStorage.getItem(LS_THEME) === 'dark';
  }
  return merged;
};

const writeLocalPrefs = (prefs) => {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
    localStorage.setItem(LS_THEME, prefs.dark_mode ? 'dark' : 'light');
  } catch {
    /* private mode / quota — in-memory state still works */
  }
};

const rowToPrefs = (row) => {
  const out = {};
  for (const col of DB_COLUMNS) {
    if (typeof row[col] === 'boolean') out[col] = row[col];
  }
  return out;
};

const prefsToRow = (userId, prefs) => {
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  for (const col of DB_COLUMNS) row[col] = !!prefs[col];
  return row;
};

// RLS on user_settings is correct (`auth.uid() = user_id`), so this either
// succeeds for the signed-in owner or is rejected — never leaks other rows.
const saveUserSettings = async (userId, prefs) => {
  const { error } = await supabase
    .from('user_settings')
    .upsert(prefsToRow(userId, prefs), { onConflict: 'user_id' });
  if (error) throw error;
};

/* ══════════════════════════════════════════════════════════════════════
   IDENTITY
   ══════════════════════════════════════════════════════════════════════ */

// Resolves who is actually signed in. Staff/admin take priority because
// `currentStaff` is the only session type that has no regular-user identity.
const loadIdentity = async () => {
  const rawStaff = localStorage.getItem('currentStaff');
  if (rawStaff) {
    try {
      const s = JSON.parse(rawStaff);
      let displayName = s.full_name || s.username || s.user_id || 'Staff Member';
      let email = s.email || '';
      let mobile = s.mobile_number || '';

      const { data } = await supabase
        .from('staff_users')
        .select('full_name, email, mobile_number, role, department')
        .eq('user_id', s.user_id)
        .maybeSingle();

      if (data) {
        displayName = data.full_name || displayName;
        email = data.email || email;
        mobile = data.mobile_number || mobile;
      }

      return {
        accountType: 'staff',
        role: s.role || 'staff',
        displayName,
        email: email || '—',
        mobile,
        workId: s.user_id || '',
        isActive: s.is_active !== false,
      };
    } catch {
      /* fall through to resident */
    }
  }

  const rawUser = localStorage.getItem('currentUser');
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      let displayName =
        u.full_name ||
        `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
        u.email ||
        'Resident';

      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, mobile_number, first_name, last_name')
        .eq('email', u.email)
        .maybeSingle();

      if (data) {
        displayName =
          data.full_name ||
          `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
          displayName;
      }

      return {
        accountType: 'user',
        role: u.role || 'user',
        displayName,
        email: u.email || '—',
        mobile: u.mobile_number || '',
        workId: u.username || '',
        isActive: true,
      };
    } catch {
      /* fall through to guest */
    }
  }

  return {
    accountType: 'guest',
    role: 'guest',
    displayName: 'Guest User',
    email: 'Not signed in',
    mobile: '',
    workId: '',
    isActive: false,
  };
};

/* ══════════════════════════════════════════════════════════════════════
   REUSABLE UI
   ══════════════════════════════════════════════════════════════════════ */

// Real <button role="switch"> — keyboard accessible and announced correctly.
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

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function Settings() {
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(readLocalPrefs);
  const [account, setAccount] = useState(null);
  const [authUid, setAuthUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  const authUidRef = useRef(null);
  authUidRef.current = authUid;

  /* ── Toast ───────────────────────────────────────────────────────── */
  const notify = useCallback((type, title, detail) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, title, detail });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Apply theme ─────────────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.dark_mode);
  }, [prefs.dark_mode]);

  /* ── Initial load ────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. localStorage first so the page is never blank.
      setPrefs(readLocalPrefs());

      // 2. Identity (works for guest, resident, staff, admin).
      const who = await loadIdentity();
      if (!cancelled) setAccount(who);

      // 3. Best-effort Supabase session + user_settings row.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        setAuthUid(user.id);

        const { data: row } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (row) {
          // Server is the source of truth for the five persisted columns.
          const next = { ...readLocalPrefs(), ...rowToPrefs(row) };
          setPrefs(next);
          writeLocalPrefs(next);
        } else {
          // First login for this account — seed a row.
          const seed = readLocalPrefs();
          await saveUserSettings(user.id, seed).catch(() => {});
        }
      } catch (err) {
        console.warn('Settings: auth/user_settings sync skipped —', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ── Persist a preference change ──────────────────────────────────── */
  const commit = useCallback(
    async (updater) => {
      setSaving(true);
      setPrefs((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        writeLocalPrefs(next);          // 1. local — always succeeds
        if (authUidRef.current) {       // 2. DB — best effort
          saveUserSettings(authUidRef.current, next).catch((err) => {
            console.warn('Settings: DB save failed —', err?.message);
          });
        }
        return next;
      });
      notify('success', 'Settings saved', 'Your preference has been updated.');
      setTimeout(() => setSaving(false), 350);
    },
    [notify]
  );

  /* ── Location access actually requests browser permission ─────────── */
  const handleLocationToggle = useCallback(
    async (enabled) => {
      if (enabled) {
        if (!navigator.geolocation) {
          notify('error', 'Not supported', 'This browser does not expose a location API.');
          return;
        }
        const granted = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });
        if (!granted) {
          notify(
            'error',
            'Permission denied',
            'Location access stays off. Enable it in your browser site settings, then try again.'
          );
          return;
        }
      }
      await commit((p) => ({ ...p, location_access: enabled }));
    },
    [commit, notify]
  );

  /* ── Sign out ─────────────────────────────────────────────────────── */
  const handleSignOut = useCallback(async () => {
    if (!window.confirm('Sign out of SafeResponse on this device?')) return;
    setSaving(true);
    try {
      await supabase.auth.signOut();
    } catch {
      /* no Supabase session — nothing to clear */
    }
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentStaff');
    } catch {
      /* ignore */
    }
    // Settings are intentionally kept so they survive the next login.
    navigate(account?.accountType === 'staff' ? '/admin' : '/login', { replace: true });
  }, [account, navigate]);

  /* ── Reset preferences ────────────────────────────────────────────── */
  const handleReset = useCallback(async () => {
    const ok = window.confirm(
      'Reset every preference on this page back to its default value?\n\n' +
      'This does NOT delete your account, reports, or requests.'
    );
    if (!ok) return;

    setSaving(true);
    writeLocalPrefs(DEFAULTS);
    setPrefs(DEFAULTS);
    if (authUidRef.current) {
      saveUserSettings(authUidRef.current, DEFAULTS).catch((err) => {
        console.warn('Settings: DB reset failed —', err?.message);
      });
    }
    notify('success', 'Preferences reset', 'All settings are back to their defaults.');
    setTimeout(() => setSaving(false), 350);
  }, [notify]);

  /* ── Change password ──────────────────────────────────────────────── */
  const openPasswordModal = () => {
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwError('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    setPwError('');

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwError('New password must be different from the current one.');
      return;
    }

    setPwBusy(true);
    try {
      const currentHash = await hashPassword(currentPassword);
      const newHash = await hashPassword(newPassword);

      const { data: { user } } = await supabase.auth.getUser();

      // Path 1 — real Supabase session (OAuth or migrated accounts).
      if (user) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);

        // Keep the legacy mirror in sync if a row exists.
        if (account?.accountType === 'user' && account.email) {
          await supabase
            .from('pending_registrations')
            .update({ password: newHash, updated_at: new Date().toISOString() })
            .eq('email', account.email)
            .then(({ error: e }) => { if (e) console.warn('Legacy hash mirror failed:', e.message); });
        }
      } else if (account?.accountType === 'staff' && account.workId) {
        // Path 2 — staff_users (Work ID keyed).
        const { data: staff, error: readErr } = await supabase
          .from('staff_users')
          .select('id, password')
          .eq('user_id', account.workId)
          .maybeSingle();

        if (readErr) throw new Error(readErr.message);
        if (!staff) {
          throw new Error(
            'Could not read your staff account. Row-level security is blocking this lookup — ' +
            'see the note below about fixing the staff_users policies.'
          );
        }
        if (staff.password !== currentHash) {
          throw new Error('Current password is incorrect.');
        }
        const { error } = await supabase
          .from('staff_users')
          .update({ password: newHash })
          .eq('id', staff.id);
        if (error) throw new Error(error.message);
      } else if (account?.accountType === 'user' && account.email) {
        // Path 3 — legacy pending_registrations.
        const { data: reg, error: readErr } = await supabase
          .from('pending_registrations')
          .select('id, password')
          .eq('email', account.email)
          .maybeSingle();

        if (readErr) throw new Error(readErr.message);
        if (!reg) {
          throw new Error(
            'Could not read your account. Row-level security is blocking this lookup — ' +
            'see the note below about fixing the pending_registrations policies.'
          );
        }
        if (reg.password !== currentHash) {
          throw new Error('Current password is incorrect.');
        }
        const { error } = await supabase
          .from('pending_registrations')
          .update({ password: newHash, updated_at: new Date().toISOString() })
          .eq('id', reg.id);
        if (error) throw new Error(error.message);
      } else {
        throw new Error('Sign in to change your password.');
      }

      setShowPasswordModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify('success', 'Password updated', 'Use your new password the next time you sign in.');
    } catch (err) {
      setPwError(err.message || 'Could not change your password.');
    } finally {
      setPwBusy(false);
    }
  };

  /* ── Export my data (RA 10173 self-service) ───────────────────────── */
  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      let pendingId = null;
      const rawUser = localStorage.getItem('currentUser');
      if (rawUser) {
        try { const u = JSON.parse(rawUser); pendingId = u.id || u.user_id || null; } catch {}
      }
      const { data: { user } } = await supabase.auth.getUser();
      const authId = user?.id || null;

      if (!pendingId && !authId) throw new Error('No signed-in identity found.');

      const needles = [pendingId, authId].filter(Boolean).map(String);
      const mine = (row) =>
        [row.userId, row.user_id, row.user_id_from_auth, row.user_id, row.userId]
          .filter(Boolean)
          .some((v) => needles.includes(String(v)));

      const [ap, inc, hz, ck] = await Promise.all([
        supabase.from('appointments').select('*'),
        supabase.from('reportIncident').select('*'),
        supabase.from('hazard_reports').select('*'),
        supabase.from('outPatientCheckUp').select('*'),
      ]);

      const bundle = {
        exported_at: new Date().toISOString(),
        system: 'SafeResponse / E-MDRRMO Naic',
        account: { name: account?.displayName, email: account?.email, role: account?.role },
        note:
          'Sections that come back empty were blocked by row-level security for this ' +
          'account type rather than genuinely containing no records.',
        appointments: (ap.data || []).filter(mine),
        incident_reports: (inc.data || []).filter(mine),
        hazard_reports: (hz.data || [])
          .filter(mine)
          .map(({ hazard_photos, ...rest }) => ({ ...rest, photo_count: hazard_photos?.length || 0 })),
        checkups: (ck.data || []).filter(mine),
      };

      const total = bundle.appointments.length + bundle.incident_reports.length +
        bundle.hazard_reports.length + bundle.checkups.length;

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mdrrmo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notify(
        'success',
        'Data exported',
        total > 0
          ? `${total} record(s) downloaded as JSON.`
          : 'Export downloaded, but no rows were returned — check the RLS note in the export file.'
      );
    } catch (err) {
      notify('error', 'Export failed', err.message || 'Could not build your data export.');
    } finally {
      setExporting(false);
    }
  }, [account, notify]);

  /* ── Theme-aware class map ────────────────────────────────────────── */
  const isDark = prefs.dark_mode;
  const t = {
    card: isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-white border-gray-200',
    panel: isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-gray-50 border-gray-200',
    rowBorder: isDark ? 'border-slate-700/60' : 'border-gray-100',
    title: isDark ? 'text-slate-100' : 'text-gray-800',
    label: isDark ? 'text-slate-200' : 'text-gray-700',
    sub: isDark ? 'text-slate-400' : 'text-gray-500',
    chip: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
  };

  const Row = ({ icon, title, sub, children, onClick, disabled = false }) => {
    const clickable = typeof onClick === 'function' && !disabled;
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

  const ActionButton = ({ children, onClick, disabled = false, tone = 'primary' }) => {
    const tones = {
      primary: isDark
        ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/10'
        : 'border-blue-300 text-blue-600 hover:bg-blue-50',
      danger: isDark
        ? 'border-red-500/50 text-red-300 hover:bg-red-500/10'
        : 'border-red-300 text-red-600 hover:bg-red-50',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl border transition disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]}`}
      >
        {children}
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  if (loading && !account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading your settings...</p>
        </div>
      </div>
    );
  }

  const initials =
    (account?.displayName || 'U')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const roleLabel =
    account?.role === 'admin' ? 'Administrator'
      : account?.role === 'staff' ? 'Staff Member'
      : account?.role === 'moderator' ? 'Moderator'
      : 'Resident';

  const deletionSubject = encodeURIComponent('Data Deletion Request — RA 10173');
  const deletionBody = encodeURIComponent(
    `Name: ${account?.displayName || ''}\n` +
    `Email: ${account?.email || ''}\n` +
    `Account ID: ${account?.workId || ''}\n\n` +
    'I request the deletion of my personal data held by the MDRRMO SafeResponse system.\n\n' +
    'Please confirm receipt and advise on the retention period for any records that must be kept.'
  );

  return (
    <div className="min-h-screen p-4 sm:p-10 font-sans transition-colors duration-300">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-[100] max-w-sm flex items-start gap-3 px-4 py-3 mt-15 rounded-xl shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            : <Check className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.detail && <p className="text-xs opacity-90 mt-0.5">{toast.detail}</p>}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="p-1 -mr-1 -mt-1 rounded hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl">
        <div className="flex flex-col items-center pt-8 pb-6 px-4 text-center">
          <SettingsIcon className="w-14 h-14 text-white" />
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Settings
            {saving && <Loader2 className="w-5 h-5 animate-spin text-white/80" aria-label="Saving" />}
          </h1>
          <p className="text-white/90 text-sm mt-1">Manage your profile, preferences, and privacy</p>
        </div>
      </div>

      <div className={`max-w-4xl mx-auto ${t.card} rounded-b-3xl shadow-xl border p-6 md:p-8 space-y-6`}>

        {/* Sync status banner */}
        {!authUid && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              You're signed in with a local account, so preferences are stored on this device only.
              Sign in with Supabase Auth (Google) to sync them across devices.
            </p>
          </div>
        )}

        {/* ── 1. Profile & Account ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <User className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Profile &amp; Account</h2>
          </div>

          <div className={`flex items-center gap-4 rounded-xl p-4 border mb-4 ${
            isDark ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-bold truncate ${t.title}`}>{account?.displayName}</h3>
              <p className={`text-sm truncate ${t.sub}`}>{account?.email}</p>
              <p className={`text-[10px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {roleLabel}{account?.workId ? ` · ${account.workId}` : ''} · Naic, Cavite
              </p>
            </div>
          </div>

          <Row
            icon={<User className="w-4 h-4" />}
            title="Edit Profile Information"
            sub="Update your name, contact details, and address"
          >
            <Link
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
            icon={<KeyRound className="w-4 h-4" />}
            title="Change Password"
            sub="Keep your account secure with a strong password"
          >
            <ActionButton onClick={openPasswordModal}>Update</ActionButton>
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
            onClick={() => commit((p) => ({ ...p, weather_alerts: !p.weather_alerts }))}
          >
            <Toggle
              checked={prefs.weather_alerts}
              onChange={(v) => commit((p) => ({ ...p, weather_alerts: v }))}
              label="Critical weather alerts"
            />
          </Row>

          <Row
            icon={<Bell className="w-4 h-4" />}
            title="Local Advisory Bulletins"
            sub="Municipal advisories and announcements for Naic"
            onClick={() => commit((p) => ({ ...p, local_advisories: !p.local_advisories }))}
          >
            <Toggle
              checked={prefs.local_advisories}
              onChange={(v) => commit((p) => ({ ...p, local_advisories: v }))}
              label="Local advisory bulletins"
            />
          </Row>

          <Row
            icon={<Bell className="w-4 h-4" />}
            title="Scheduled Drill Reminders"
            sub="Community preparedness and evacuation drills"
            onClick={() => commit((p) => ({ ...p, drill_reminders: !p.drill_reminders }))}
          >
            <Toggle
              checked={prefs.drill_reminders}
              onChange={(v) => commit((p) => ({ ...p, drill_reminders: v }))}
              label="Drill reminders"
            />
          </Row>

          <Row
            icon={<Shield className="w-4 h-4" />}
            title="Emergency Alerts"
            sub="Life-safety alerts can never be turned off"
          >
            <Toggle checked disabled label="Emergency alerts (always on)" />
          </Row>
        </section>

        {/* ── 3. Appearance ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <SettingsIcon className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Appearance</h2>
          </div>

          <Row
            icon={<SettingsIcon className="w-4 h-4" />}
            title="Dark Mode"
            sub={`Currently ${prefs.dark_mode ? 'on' : 'off'}`}
            onClick={() => commit((p) => ({ ...p, dark_mode: !p.dark_mode }))}
          >
            <Toggle
              checked={prefs.dark_mode}
              onChange={(v) => commit((p) => ({ ...p, dark_mode: v }))}
              label="Dark mode"
            />
          </Row>
        </section>

        {/* ── 4. Data & Privacy ── */}
        <section className={`${t.panel} rounded-2xl border p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.chip}`}>
              <MapPin className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${t.title}`}>Data &amp; Privacy</h2>
          </div>

          <Row
            icon={<MapPin className="w-4 h-4" />}
            title="Location Access"
            sub="Required for hazard reports and location-specific alerts near you"
            onClick={() => handleLocationToggle(!prefs.location_access)}
          >
            <Toggle
              checked={prefs.location_access}
              onChange={handleLocationToggle}
              label="Location access"
            />
          </Row>

          <Row
            icon={<UserCheck className="w-4 h-4" />}
            title="Show My Name on Public Reports"
            sub="Display your name on hazard reports submitted publicly"
            onClick={() => commit((p) => ({ ...p, public_name: !p.public_name }))}
          >
            <Toggle
              checked={prefs.public_name}
              onChange={(v) => commit((p) => ({ ...p, public_name: v }))}
              label="Show name on public reports"
            />
          </Row>

          <Row
            icon={<Download className="w-4 h-4" />}
            title="Download My Data"
            sub="Export every record linked to your account as JSON (RA 10173)"
            onClick={handleExportData}
          >
            <ActionButton onClick={handleExportData} disabled={exporting}>
              {exporting ? 'Preparing...' : 'Export'}
            </ActionButton>
          </Row>

          <Row
            icon={<Shield className="w-4 h-4" />}
            title="Request Data Deletion"
            sub="Send a formal deletion request to the MDRRMO data officer"
          >
            <a
              href={`mailto:mdrrmo@naic.cavite.gov.ph?subject=${deletionSubject}&body=${deletionBody}`}
              className={`text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'border-red-500/50 text-red-300 hover:bg-red-500/10'
                  : 'border-red-300 text-red-600 hover:bg-red-50'
              }`}
            >
              Request <ChevronRight className="w-4 h-4" />
            </a>
          </Row>
        </section>

        {/* ── 5. Danger Zone ── */}
        <section className={`rounded-2xl border p-5 ${isDark ? 'bg-red-950/20 border-red-900/60' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
            }`}>
              <LogOut className="w-4 h-4" />
            </span>
            <h2 className={`font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Danger Zone</h2>
          </div>

          <Row
            icon={<LogOut className="w-4 h-4" />}
            title="Sign Out"
            sub="Ends your session on this device (both resident and staff sessions)"
          >
            <button
              type="button"
              onClick={handleSignOut}
              disabled={saving}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              Sign Out
            </button>
          </Row>

          <Row
            icon={<Trash2 className="w-4 h-4" />}
            title="Reset All Preferences"
            sub="Restores every setting above to its default value (your account is untouched)"
          >
            <ActionButton onClick={handleReset} disabled={saving} tone="danger">
              Reset
            </ActionButton>
          </Row>
        </section>

        <p className={`text-center text-xs ${t.sub}`}>
          SafeResponse Citizen Portal · Preferences save automatically
          {authUid ? ' and sync across your devices.' : ' on this device.'}
        </p>
      </div>

      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !pwBusy && setShowPasswordModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pw-modal-title"
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 id="pw-modal-title" className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => !pwBusy && setShowPasswordModal(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {pwError && (
                <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{pwError}</p>
                </div>
              )}

              <div>
                <label htmlFor="cur-pw" className="text-sm font-bold text-gray-700 block mb-1.5">
                  Current Password
                </label>
                <input
                  id="cur-pw"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="new-pw" className="text-sm font-bold text-gray-700 block mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-pw"
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="w-full p-3 pr-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters.</p>
              </div>

              <div>
                <label htmlFor="confirm-pw" className="text-sm font-bold text-gray-700 block mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="confirm-pw"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwBusy || (!!pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 disabled:bg-purple-300 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  {pwBusy ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                  ) : (
                    <><KeyRound className="w-4 h-4" /> Update Password</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={pwBusy}
                  className="px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
