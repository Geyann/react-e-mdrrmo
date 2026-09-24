import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback,
} from 'react';
import { supabase } from '../createClient';

/* ══════════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════════ */

const LS_THEME = 'mdrrmo_theme';      // pre-existing dark-mode key
const LS_PREFS = 'mdrrmo_settings';   // full preference bundle

export const DEFAULTS = {
  dark_mode: false,
  weather_alerts: true,
  local_advisories: true,
  drill_reminders: false,
  location_access: true,
  public_name: true,
  notifications_enabled: true,
};

// Columns that actually exist on `user_settings`.
const DB_COLUMNS = [
  'dark_mode',
  'weather_alerts',
  'local_advisories',
  'drill_reminders',
  'location_access',
];

const DB_SYNC_DEBOUNCE_MS = 600;

/* ══════════════════════════════════════════════════════════════════════
   STORAGE
   ══════════════════════════════════════════════════════════════════════ */

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export function readLocalPrefs() {
  const stored = readJson(LS_PREFS, {});
  const merged = { ...DEFAULTS, ...stored };
  // Migrate the old single-key dark-mode value if no bundle exists yet.
  if (stored.dark_mode === undefined) {
    merged.dark_mode = localStorage.getItem(LS_THEME) === 'dark';
  }
  return merged;
}

function writeLocalPrefs(prefs) {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
    localStorage.setItem(LS_THEME, prefs.dark_mode ? 'dark' : 'light');
  } catch {
    /* private mode / quota — in-memory state still works */
  }
}

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

// RLS is `auth.uid() = user_id`, so this either succeeds for the owner or is
// rejected — it can never leak another user's row.
const pushToServer = async (userId, prefs) => {
  const { error } = await supabase
    .from('user_settings')
    .upsert(prefsToRow(userId, prefs), { onConflict: 'user_id' });
  if (error) throw error;
};

/* ══════════════════════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════════════════════ */

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(readLocalPrefs);
  const [authUid, setAuthUid] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const uidRef = useRef(null);
  uidRef.current = authUid;
  const debounceRef = useRef(null);
  const firstRun = useRef(true);

  /* ── 1. Apply theme to <html> for the WHOLE app ────────────────── */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', !!prefs.dark_mode);
    root.dataset.theme = prefs.dark_mode ? 'dark' : 'light';
  }, [prefs.dark_mode]);

  /* ── 2. Boot: local immediately, then reconcile with the server ── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = readLocalPrefs();
      if (!cancelled) setPrefs(local);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        setAuthUid(user.id);

        const { data: row, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled || error) return;

        if (row) {
          // Server wins for the five persisted columns.
          const next = { ...local, ...rowToPrefs(row) };
          if (!cancelled) {
            setPrefs(next);
            writeLocalPrefs(next);
          }
        } else {
          // First time this account opens the app — seed a row.
          await pushToServer(user.id, local).catch(() => {});
        }
      } catch (err) {
        console.warn('[Settings] server sync skipped:', err?.message);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* ── 3. Persist: local instantly, server debounced ─────────────── */
  const persist = useCallback((next) => {
    writeLocalPrefs(next);
    setLastSavedAt(new Date().toISOString());

    if (!uidRef.current) return; // local-only account
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setSaving(true);
      pushToServer(uidRef.current, next)
        .catch((err) => console.warn('[Settings] server save failed:', err?.message))
        .finally(() => setSaving(false));
    }, DB_SYNC_DEBOUNCE_MS);
  }, []);

  const commit = useCallback((updater) => {
    setPrefs((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (firstRun.current) {
        firstRun.current = false;
        return next;
      }
      persist(next);
      return next;
    });
  }, [persist]);

  /* ── 4. Public API ─────────────────────────────────────────────── */
  const setPref = useCallback((key, value) => {
    commit((p) => ({ ...p, [key]: value }));
  }, [commit]);

  const togglePref = useCallback((key) => {
    commit((p) => ({ ...p, [key]: !p[key] }));
  }, [commit]);

  const patchPrefs = useCallback((obj) => {
    commit((p) => ({ ...p, ...obj }));
  }, [commit]);

  const resetPrefs = useCallback(() => {
    const next = { ...DEFAULTS };
    setPrefs(next);
    persist(next);
  }, [persist]);

  const alertsEnabled = useMemo(
    () => prefs.notifications_enabled !== false &&
      (prefs.weather_alerts || prefs.local_advisories || prefs.drill_reminders),
    [prefs]
  );

  const value = useMemo(
    () => ({
      prefs,
      ready,
      saving,
      lastSavedAt,
      authUid,
      canSync: !!authUid,
      alertsEnabled,
      setPref,
      togglePref,
      patchPrefs,
      resetPrefs,
      commit,
    }),
    [prefs, ready, saving, lastSavedAt, authUid, alertsEnabled,
     setPref, togglePref, patchPrefs, resetPrefs, commit]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/* ══════════════════════════════════════════════════════════════════════
   SAFE HOOK
   ──────────────────────────────────────────────────────────────────────
   Returns inert defaults instead of throwing when the provider is
   missing, so a page can never white-screen because of a mount-order
   mistake. `providerMissing` lets Settings.jsx show a diagnostic.
   ══════════════════════════════════════════════════════════════════════ */
const INERT = {
  prefs: DEFAULTS,
  ready: true,
  saving: false,
  lastSavedAt: null,
  authUid: null,
  canSync: false,
  alertsEnabled: true,
  providerMissing: true,
  setPref: () => {},
  togglePref: () => {},
  patchPrefs: () => {},
  resetPrefs: () => {},
  commit: () => {},
};

export function useSettings() {
  const ctx = useContext(SettingsContext);
  return ctx || INERT;
}
