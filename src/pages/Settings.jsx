"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudRain,
  Database,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Moon,
  RotateCcw,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Siren,
  Smartphone,
  Sun,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";

import { supabase } from "../createClient";

/* ══════════════════════════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════════════════════════ */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const LS_THEME = "mdrrmo_theme";
const LS_PREFS = "mdrrmo_settings";

const PASSWORD_SALT = "hackerai-salt-2024";

const DEFAULTS = {
  dark_mode: false,
  weather_alerts: true,
  local_advisories: true,
  drill_reminders: false,
  location_access: true,
  public_name: false,
};

const DB_COLUMNS = [
  "dark_mode",
  "weather_alerts",
  "local_advisories",
  "drill_reminders",
  "location_access",
];

const DATA_OFFICE_EMAIL =
  "mdrrmo@naic.cavite.gov.ph";

/* ══════════════════════════════════════════════════════════════════
   PASSWORD
   ══════════════════════════════════════════════════════════════════ */

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${password}${PASSWORD_SALT}`,
  );

  const hashBuffer =
    await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function hashPasswordWithoutSalt(password) {
  const encoder = new TextEncoder();

  const data = encoder.encode(password);

  const hashBuffer =
    await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

/* ══════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════════════════════════════ */

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);

    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readLocalSession = (key) => {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const readLocalPrefs = () => {
  const stored = readJson(LS_PREFS, {});
  const merged = {
    ...DEFAULTS,
    ...stored,
  };

  if (stored.dark_mode === undefined) {
    try {
      merged.dark_mode =
        localStorage.getItem(LS_THEME) ===
        "dark";
    } catch {
      merged.dark_mode = false;
    }
  }

  return merged;
};

const writeLocalPrefs = (prefs) => {
  try {
    localStorage.setItem(
      LS_PREFS,
      JSON.stringify(prefs),
    );

    localStorage.setItem(
      LS_THEME,
      prefs.dark_mode ? "dark" : "light",
    );
  } catch {
    // In-memory state still works.
  }
};

const rowToPrefs = (row) => {
  const output = {};

  for (const column of DB_COLUMNS) {
    if (typeof row[column] === "boolean") {
      output[column] = row[column];
    }
  }

  return output;
};

const prefsToRow = (
  userId,
  prefs,
) => {
  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  for (const column of DB_COLUMNS) {
    row[column] = Boolean(prefs[column]);
  }

  return row;
};

const saveUserSettings = async (
  userId,
  prefs,
) => {
  const { error } = await supabase
    .from("user_settings")
    .upsert(prefsToRow(userId, prefs), {
      onConflict: "user_id",
    });

  if (error) {
    throw error;
  }
};

/* ══════════════════════════════════════════════════════════════════
   IDENTITY
   ══════════════════════════════════════════════════════════════════ */

const cleanText = (value) =>
  String(value ?? "").trim();

const phoneDigits = (value) =>
  String(value ?? "").replace(/\D/g, "");

const loadIdentity = async () => {
  const storedStaff = readLocalSession(
    "currentStaff",
  );

  if (storedStaff) {
    try {
      const ids = new Set();

      const addId = (value) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== ""
        ) {
          ids.add(String(value));
        }
      };

      const workId =
        storedStaff.user_id ||
        storedStaff.id ||
        "";

      let displayName =
        storedStaff.full_name ||
        storedStaff.username ||
        workId ||
        "Staff Member";

      let email =
        storedStaff.email || "";

      let mobile =
        storedStaff.mobile_number || "";

      let role =
        storedStaff.role || "staff";

      let department =
        storedStaff.department || "";

      let source =
        storedStaff.source ||
        "staff_users";

      addId(storedStaff.id);
      addId(storedStaff.user_id);
      addId(storedStaff.email);

      if (source === "admin_users") {
        const { data: adminRow } =
          await supabase
            .from("admin_users")
            .select(
              "id, custom_id, user_id, username, full_name, email, role",
            )
            .or(
              `custom_id.eq.${workId},username.eq.${workId}`,
            )
            .limit(1)
            .maybeSingle();

        if (adminRow) {
          displayName =
            adminRow.full_name ||
            displayName;

          email =
            adminRow.email || email;

          role =
            adminRow.role || "admin";

          addId(adminRow.id);
          addId(adminRow.custom_id);
          addId(adminRow.user_id);
          addId(adminRow.username);
        }
      } else {
        const { data: staffRow } =
          await supabase
            .from("staff_users")
            .select(
              "id, user_id, username, full_name, email, mobile_number, role, department, is_active",
            )
            .eq("user_id", workId)
            .maybeSingle();

        if (staffRow) {
          displayName =
            staffRow.full_name ||
            displayName;

          email =
            staffRow.email || email;

          mobile =
            staffRow.mobile_number ||
            mobile;

          role =
            staffRow.role || role;

          department =
            staffRow.department ||
            department;

          addId(staffRow.id);
          addId(staffRow.username);
        }
      }

      return {
        accountType: "staff",
        role,
        source,
        displayName,
        email: email || "—",
        mobile,
        workId,
        department,
        ids: Array.from(ids),
        isActive:
          storedStaff.is_active !== false,
      };
    } catch {
      // Continue to the resident session.
    }
  }

  const storedUser = readLocalSession(
    "currentUser",
  );

  if (storedUser) {
    try {
      const ids = new Set();

      const addId = (value) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== ""
        ) {
          ids.add(String(value));
        }
      };

      addId(storedUser.id);
      addId(storedUser.user_id);
      addId(storedUser.email);

      let displayName =
        storedUser.full_name ||
        [
          storedUser.first_name,
          storedUser.middle_name,
          storedUser.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        storedUser.email ||
        "Resident";

      let email =
        storedUser.email || "";

      let mobile =
        storedUser.mobile_number || "";

      if (email) {
        const { data: profile } =
          await supabase
            .from("profiles")
            .select(
              "id, user_id, username, full_name, email, mobile_number, first_name, middle_name, last_name, role",
            )
            .eq("email", email)
            .maybeSingle();

        if (profile) {
          displayName =
            profile.full_name ||
            [
              profile.first_name,
              profile.middle_name,
              profile.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            displayName;

          email =
            profile.email || email;

          mobile =
            profile.mobile_number ||
            mobile;

          addId(profile.id);
          addId(profile.user_id);
          addId(profile.username);
        }
      }

      return {
        accountType: "user",
        role:
          storedUser.role || "user",
        source: "profiles",
        displayName,
        email: email || "—",
        mobile,
        workId:
          storedUser.username || "",
        department: "",
        ids: Array.from(ids),
        isActive: true,
      };
    } catch {
      // Fall through to guest.
    }
  }

  return {
    accountType: "guest",
    role: "guest",
    source: "guest",
    displayName: "Guest User",
    email: "Not signed in",
    mobile: "",
    workId: "",
    department: "",
    ids: [],
    isActive: false,
  };
};

/* ══════════════════════════════════════════════════════════════════
   REUSABLE UI
   ══════════════════════════════════════════════════════════════════ */

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();

        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition duration-200",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/20",
        checked
          ? "border-blue-700 bg-blue-600 shadow-md shadow-blue-600/20"
          : "border-slate-300 bg-slate-200 shadow-sm dark:border-slate-600 dark:bg-slate-700",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:brightness-105 active:scale-95",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked
            ? "translate-x-6"
            : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  tone = "blue",
}) {
  const toneClasses = {
    blue: {
      icon:
        "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
      line:
        "bg-blue-500",
    },
    purple: {
      icon:
        "bg-purple-50 text-purple-600 ring-purple-100 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-900",
      line:
        "bg-purple-500",
    },
    green: {
      icon:
        "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
      line:
        "bg-emerald-500",
    },
    amber: {
      icon:
        "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
      line:
        "bg-amber-500",
    },
    red: {
      icon:
        "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
      line:
        "bg-rose-500",
    },
  };

  const selectedTone = toneClasses[tone];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div
        className={`h-1 ${selectedTone.line}`}
        aria-hidden="true"
      />

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${selectedTone.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-800 dark:text-white">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  danger = false,
}) {
  return (
    <div
      className={[
        "flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between",
        danger
          ? "border-rose-100 dark:border-rose-900/50"
          : "border-slate-100 dark:border-slate-800",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            danger
              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p
            className={[
              "text-sm font-bold",
              danger
                ? "text-rose-800 dark:text-rose-200"
                : "text-slate-800 dark:text-slate-100",
            ].join(" ")}
          >
            {title}
          </p>

          {description && (
            <p
              className={[
                "mt-1 text-xs leading-5",
                danger
                  ? "text-rose-600/80 dark:text-rose-300/70"
                  : "text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 sm:pl-4">
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  danger = false,
  external = false,
  href,
}) {
  const classes = [
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition",
    "focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/15",
    "disabled:cursor-not-allowed disabled:opacity-50",
    danger
      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
      : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40",
  ].join(" ");

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={
          external
            ? "noopener noreferrer"
            : undefined
        }
        className={classes}
      >
        {children}
        <ChevronRight className="h-4 w-4" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function Settings() {
  const navigate = useNavigate();

  const [prefs, setPrefs] =
    useState(readLocalPrefs);

  const [account, setAccount] =
    useState(null);

  const [authUid, setAuthUid] =
    useState(null);

  const [syncError, setSyncError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [pwForm, setPwForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [showPw, setShowPw] =
    useState(false);

  const [pwBusy, setPwBusy] =
    useState(false);

  const [pwError, setPwError] =
    useState("");

  const toastTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  const authUidRef = useRef(null);
  authUidRef.current = authUid;

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  /* ------------------------------------------------------------
     TOAST
  ------------------------------------------------------------ */

  const notify = useCallback(
    (
      type,
      title,
      detail = "",
    ) => {
      if (toastTimerRef.current) {
        window.clearTimeout(
          toastTimerRef.current,
        );
      }

      setToast({
        type,
        title,
        detail,
      });

      toastTimerRef.current =
        window.setTimeout(() => {
          setToast(null);
        }, 4500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(
          toastTimerRef.current,
        );
      }

      if (saveTimerRef.current) {
        window.clearTimeout(
          saveTimerRef.current,
        );
      }
    };
  }, []);

  /* ------------------------------------------------------------
     APPLY DARK MODE
  ------------------------------------------------------------ */

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      Boolean(prefs.dark_mode),
    );

    document.documentElement.dataset.theme =
      prefs.dark_mode ? "dark" : "light";
  }, [prefs.dark_mode]);

  /* ------------------------------------------------------------
     INITIAL LOAD
  ------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setPrefs(readLocalPrefs());
      setLoading(true);
      setSyncError("");

      try {
        const localPrefs = readLocalPrefs();
        const who = await loadIdentity();

        if (cancelled) {
          return;
        }

        setAccount(who);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setLoading(false);
          }

          return;
        }

        if (!cancelled) {
          setAuthUid(user.id);
        }

        const { data, error } =
          await supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          setSyncError(
            error.message ||
              "Cloud settings sync is unavailable.",
          );
        } else if (data) {
          const next = {
            ...localPrefs,
            ...rowToPrefs(data),
          };

          setPrefs(next);
          writeLocalPrefs(next);
        } else {
          await saveUserSettings(
            user.id,
            localPrefs,
          ).catch((saveError) => {
            console.warn(
              "Settings seed failed:",
              saveError,
            );

            setSyncError(
              "Your settings are saved on this device, but cloud sync is currently unavailable.",
            );
          });
        }
      } catch (initializationError) {
        console.error(
          "Settings initialization failed:",
          initializationError,
        );

        if (!cancelled) {
          setSyncError(
            initializationError?.message ||
              "Some account settings could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------
     SAVE A PREFERENCE
  ------------------------------------------------------------ */

  const commit = useCallback(
    (
      updater,
      {
        title = "Settings saved",
        detail =
          "Your preference has been updated.",
      } = {},
    ) => {
      const previous = prefsRef.current;

      const next =
        typeof updater === "function"
          ? updater(previous)
          : {
              ...previous,
              ...updater,
            };

      prefsRef.current = next;
      setPrefs(next);
      writeLocalPrefs(next);

      setSaving(true);

      if (saveTimerRef.current) {
        window.clearTimeout(
          saveTimerRef.current,
        );
      }

      saveTimerRef.current =
        window.setTimeout(() => {
          setSaving(false);
        }, 350);

      if (authUidRef.current) {
        void saveUserSettings(
          authUidRef.current,
          next,
        ).catch((saveError) => {
          console.warn(
            "Settings database save failed:",
            saveError,
          );

          notify(
            "error",
            "Saved on this device",
            "Cloud sync failed. Your preference will be retried the next time settings are changed.",
          );
        });
      }

      notify("success", title, detail);
    },
    [notify],
  );

  /* ------------------------------------------------------------
     LOCATION PERMISSION
  ------------------------------------------------------------ */

  const handleLocationToggle =
    useCallback(
      async (enabled) => {
        if (enabled) {
          if (!navigator.geolocation) {
            notify(
              "error",
              "Location unavailable",
              "This browser does not support the location API.",
            );

            return;
          }

          const granted = await new Promise(
            (resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => resolve(false),
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0,
                },
              );
            },
          );

          if (!granted) {
            notify(
              "error",
              "Location permission denied",
              "Enable location access in your browser settings, then try again.",
            );

            return;
          }
        }

        commit(
          (current) => ({
            ...current,
            location_access: enabled,
          }),
          {
            title: enabled
              ? "Location access enabled"
              : "Location access disabled",
            detail: enabled
              ? "GPS may be used when a service requires your location."
              : "GPS coordinates will not be attached to new reports.",
          },
        );
      },
      [commit, notify],
    );

  /* ------------------------------------------------------------
     SIGN OUT
  ------------------------------------------------------------ */

  const handleSignOut = useCallback(async () => {
    const confirmed = window.confirm(
      "Sign out of SafeResponse on this device?",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      await supabase.auth.signOut();
    } catch {
      // A manual account may not have a Supabase session.
    }

    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentStaff");
    } catch {
      // Ignore storage failures.
    }

    navigate(
      account?.accountType === "staff"
        ? "/admin"
        : "/login",
      {
        replace: true,
      },
    );
  }, [account, navigate]);

  /* ------------------------------------------------------------
     RESET PREFERENCES
  ------------------------------------------------------------ */

  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      "Reset every preference to its default value?\n\nThis does not delete your account, reports, or requests.",
    );

    if (!confirmed) {
      return;
    }

    const next = {
      ...DEFAULTS,
    };

    prefsRef.current = next;
    setPrefs(next);
    writeLocalPrefs(next);

    setSaving(true);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current =
      window.setTimeout(() => {
        setSaving(false);
      }, 350);

    if (authUidRef.current) {
      void saveUserSettings(
        authUidRef.current,
        next,
      ).catch((resetError) => {
        console.warn(
          "Settings reset sync failed:",
          resetError,
        );

        notify(
          "error",
          "Preferences reset locally",
          "Cloud synchronization failed. Try resetting them again later.",
        );
      });
    }

    notify(
      "success",
      "Preferences reset",
      "All settings have returned to their defaults.",
    );
  }, [notify]);

  /* ------------------------------------------------------------
     PASSWORD MODAL
  ------------------------------------------------------------ */

  const openPasswordModal = () => {
    if (account?.accountType === "guest") {
      notify(
        "error",
        "Sign in required",
        "Sign in before changing your password.",
      );

      return;
    }

    setPwForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPwError("");
    setShowPw(false);
    setShowPasswordModal(true);
  };

  const closePasswordModal = useCallback(() => {
    if (pwBusy) {
      return;
    }

    setShowPasswordModal(false);
    setPwError("");
  }, [pwBusy]);

  useEffect(() => {
    if (!showPasswordModal) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closePasswordModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [showPasswordModal, closePasswordModal]);

  const handleChangePassword = async (
    event,
  ) => {
    event.preventDefault();

    if (pwBusy) {
      return;
    }

    setPwError("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = pwForm;

    if (!currentPassword) {
      setPwError(
        "Enter your current password.",
      );

      return;
    }

    if (newPassword.length < 6) {
      setPwError(
        "New password must be at least 6 characters.",
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError(
        "The new passwords do not match.",
      );

      return;
    }

    if (newPassword === currentPassword) {
      setPwError(
        "New password must be different from your current password.",
      );

      return;
    }

    setPwBusy(true);

    try {
      const currentSaltedHash =
        await hashPassword(currentPassword);

      const currentUnsaltedHash =
        await hashPasswordWithoutSalt(
          currentPassword,
        );

      const newHash =
        await hashPassword(newPassword);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } =
          await supabase.auth.updateUser({
            password: newPassword,
          });

        if (error) {
          throw new Error(error.message);
        }

        if (
          account?.accountType === "user" &&
          account.email &&
          account.email !== "—"
        ) {
          const { error: mirrorError } =
            await supabase
              .from("pending_registrations")
              .update({
                password: newHash,
                updated_at:
                  new Date().toISOString(),
              })
              .eq("email", account.email);

          if (mirrorError) {
            console.warn(
              "Legacy password mirror failed:",
              mirrorError,
            );
          }
        }
      } else if (
        account?.accountType === "staff" &&
        account.workId
      ) {
        if (account.role === "admin") {
          const { data: adminRow, error: readError } =
            await supabase
              .from("admin_users")
              .select("id, password")
              .or(
                `custom_id.eq.${account.workId},username.eq.${account.workId}`,
              )
              .limit(1)
              .maybeSingle();

          if (readError) {
            throw new Error(readError.message);
          }

          if (!adminRow) {
            throw new Error(
              "Your administrator account could not be found.",
            );
          }

          const storedPassword =
            cleanText(adminRow.password);

          if (
            storedPassword !==
              currentSaltedHash &&
            storedPassword !==
              currentUnsaltedHash
          ) {
            throw new Error(
              "Current password is incorrect.",
            );
          }

          const { error: updateError } =
            await supabase
              .from("admin_users")
              .update({
                password: newHash,
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", adminRow.id);

          if (updateError) {
            throw new Error(
              updateError.message,
            );
          }
        } else {
          const {
            data: staffRow,
            error: readError,
          } = await supabase
            .from("staff_users")
            .select("id, password")
            .eq("user_id", account.workId)
            .maybeSingle();

          if (readError) {
            throw new Error(readError.message);
          }

          if (!staffRow) {
            throw new Error(
              "Your staff account could not be found.",
            );
          }

          const storedPassword =
            cleanText(staffRow.password);

          if (
            storedPassword !==
              currentSaltedHash &&
            storedPassword !==
              currentUnsaltedHash
          ) {
            throw new Error(
              "Current password is incorrect.",
            );
          }

          const { error: updateError } =
            await supabase
              .from("staff_users")
              .update({
                password: newHash,
              })
              .eq("id", staffRow.id);

          if (updateError) {
            throw new Error(
              updateError.message,
            );
          }
        }
      } else if (
        account?.accountType === "user" &&
        account.email &&
        account.email !== "—"
      ) {
        const {
          data: registration,
          error: readError,
        } = await supabase
          .from("pending_registrations")
          .select("id, password")
          .eq("email", account.email)
          .maybeSingle();

        if (readError) {
          throw new Error(readError.message);
        }

        if (!registration) {
          throw new Error(
            "Your resident account could not be found.",
          );
        }

        const storedPassword =
          cleanText(registration.password);

        if (
          storedPassword !==
            currentSaltedHash &&
          storedPassword !==
            currentUnsaltedHash
        ) {
          throw new Error(
            "Current password is incorrect.",
          );
        }

        const { error: updateError } =
          await supabase
            .from("pending_registrations")
            .update({
              password: newHash,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", registration.id);

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }
      } else {
        throw new Error(
          "Sign in before changing your password.",
        );
      }

      setShowPasswordModal(false);

      setPwForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      notify(
        "success",
        "Password updated",
        "Use your new password the next time you sign in.",
      );
    } catch (passwordError) {
      setPwError(
        passwordError?.message ||
          "Could not change your password.",
      );
    } finally {
      setPwBusy(false);
    }
  };

  /* ------------------------------------------------------------
     EXPORT USER DATA
  ------------------------------------------------------------ */

  const handleExportData = useCallback(async () => {
    if (exporting) {
      return;
    }

    if (
      !account ||
      account.accountType === "guest"
    ) {
      notify(
        "error",
        "Sign in required",
        "Sign in before exporting your data.",
      );

      return;
    }

    setExporting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const identities = new Set(
        [
          ...(account.ids || []),
          user?.id,
          account.workId,
        ]
          .filter(Boolean)
          .map(String),
      );

      if (identities.size === 0) {
        throw new Error(
          "No signed-in identity was found.",
        );
      }

      const myEmail = cleanText(
        account.email,
      ).toLowerCase();

      const myPhone = phoneDigits(
        account.mobile,
      );

      const myName = cleanText(
        account.displayName,
      ).toLowerCase();

      const matchesIdentity = (row) => {
        const idFields = [
          "userId",
          "user_id",
          "user_id_from_auth",
          "staffId",
          "staff_id",
        ];

        for (const field of idFields) {
          const value = row[field];

          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            identities.has(String(value))
          ) {
            return true;
          }
        }

        if (myEmail) {
          const emailFields = [
            "email",
            "reporter_contact",
            "reporterContact",
            "contactNum",
            "contactDetails",
          ];

          for (const field of emailFields) {
            if (
              cleanText(row[field])
                .toLowerCase() === myEmail
            ) {
              return true;
            }
          }
        }

        if (myPhone.length >= 10) {
          const phoneFields = [
            "mobile_number",
            "reporter_contact",
            "reporterContact",
            "contactNum",
            "contactDetails",
          ];

          for (const field of phoneFields) {
            const value =
              phoneDigits(row[field]);

            if (
              value.length >= 10 &&
              value.slice(-10) ===
                myPhone.slice(-10)
            ) {
              return true;
            }
          }
        }

        if (myName) {
          const nameFields = [
            "requestedBy",
            "reporter_name",
            "fullName",
          ];

          for (const field of nameFields) {
            if (
              cleanText(row[field])
                .toLowerCase() === myName
            ) {
              return true;
            }
          }
        }

        return false;
      };

      const sources = [
        {
          key: "appointments",
          table: "appointments",
        },
        {
          key: "incident_reports",
          table: "reportIncident",
        },
        {
          key: "vehicle_requests",
          table: "borrow-vehicle",
        },
        {
          key: "checkups",
          table: "outPatientCheckUp",
        },
        {
          key: "hazard_reports",
          table: "hazard_reports",
        },
      ];

      const results =
        await Promise.all(
          sources.map((source) =>
            supabase
              .from(source.table)
              .select("*")
              .limit(2000),
          ),
        );

      const sourceStatus = {};

      const bundle = {
        exported_at:
          new Date().toISOString(),

        system:
          "SafeResponse / E-MDRRMO Naic",

        account: {
          name: account.displayName,
          email: account.email,
          role: account.role,
          account_type:
            account.accountType,
        },

        note:
          "This export contains records linked to your current account. Some sections may be empty because of row-level security or because no matching records were returned.",

        source_status: sourceStatus,
      };

      results.forEach(
        (result, index) => {
          const source = sources[index];

          sourceStatus[source.key] = {
            status: result.error
              ? "unavailable"
              : "loaded",
            message:
              result.error?.message ||
              null,
          };

          const rows = result.data || [];

          const mine = rows
            .filter(matchesIdentity)
            .map((row) => {
              if (
                source.key !==
                "hazard_reports"
              ) {
                return row;
              }

              const {
                hazard_photos,
                ...rest
              } = row;

              return {
                ...rest,
                photo_count:
                  Array.isArray(hazard_photos)
                    ? hazard_photos.length
                    : 0,
              };
            });

          bundle[source.key] = mine;
        },
      );

      const total = Object.keys(sources).reduce(
        (sum, key) =>
          sum +
          (Array.isArray(bundle[key])
            ? bundle[key].length
            : 0),
        0,
      );

      const blob = new Blob(
        [JSON.stringify(bundle, null, 2)],
        {
          type: "application/json",
        },
      );

      const url = URL.createObjectURL(blob);
      const anchor =
        document.createElement("a");

      const today =
        new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download =
        `mdrrmo-data-export-${today}.json`;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      notify(
        "success",
        "Data export prepared",
        total > 0
          ? `${total} linked record(s) were included in the JSON file.`
          : "The export was downloaded, but no linked records were returned. Check the source status section in the file.",
      );
    } catch (exportError) {
      console.error(
        "Data export failed:",
        exportError,
      );

      notify(
        "error",
        "Data export failed",
        exportError?.message ||
          "Could not build your data export.",
      );
    } finally {
      setExporting(false);
    }
  }, [account, exporting, notify]);

  /* ------------------------------------------------------------
     DERIVED ACCOUNT VALUES
  ------------------------------------------------------------ */

  const initials = useMemo(() => {
    return (
      account?.displayName ||
      account?.email ||
      "U"
    )
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  }, [account]);

  const roleLabel =
    account?.role === "admin"
      ? "Administrator"
      : account?.role === "staff"
        ? "Staff Member"
        : account?.role === "moderator"
          ? "Moderator"
          : account?.accountType === "guest"
            ? "Guest"
            : "Resident";

  const profilePath =
    account?.role === "admin"
      ? "/admin/profile"
      : account?.accountType === "staff"
        ? "/staff/profile"
        : "/profile";

  const manageProfilePath =
    account?.accountType === "user"
      ? "/edit-profile"
      : profilePath;

  const manageProfileLabel =
    account?.accountType === "user"
      ? "Edit Profile"
      : "View Profile";

  const deletionSubject = encodeURIComponent(
    "Data Deletion Request — RA 10173",
  );

  const deletionBody = encodeURIComponent(
    [
      `Name: ${account?.displayName || ""}`,
      `Email: ${account?.email || ""}`,
      `Account ID: ${account?.workId || ""}`,
      "",
      "I request the deletion of my personal data held by the MDRRMO SafeResponse system.",
      "",
      "Please confirm receipt and advise on the retention period for any records that must be kept.",
    ].join("\n"),
  );

  /* ------------------------------------------------------------
     LOADING
  ------------------------------------------------------------ */

  if (loading && !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div
            className={`${GRADIENT_CLASS} mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl`}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <h1 className="mt-5 text-lg font-black text-slate-800 dark:text-white">
            Loading your settings
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Checking your account and preferences...
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 dark:bg-slate-950">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-32 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-20 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
      />

      <div className="mx-auto max-w-5xl">
        {/* =================================================
            TOAST
        ================================================= */}

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={[
              "fixed right-4 top-20 z-[2000] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl px-4 py-4 text-white shadow-2xl",
              toast.type === "error"
                ? "bg-gradient-to-r from-red-600 to-rose-700"
                : `${GRADIENT_CLASS}`,
            ].join(" ")}
          >
            {toast.type === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">
                {toast.title}
              </p>

              {toast.detail && (
                <p className="mt-1 text-xs leading-5 text-white/80">
                  {toast.detail}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =================================================
            HERO
        ================================================= */}

        <section
          className={`${GRADIENT_CLASS} relative overflow-hidden rounded-[2rem] px-5 py-7 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                <SettingsIcon className="h-8 w-8 text-white" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  SafeResponse Preferences
                </p>

                <div className="mt-1 flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white sm:text-3xl lg:text-4xl">
                    Settings
                  </h1>

                  {saving && (
                    <Loader2
                      className="h-5 w-5 animate-spin text-blue-100"
                      aria-label="Saving"
                    />
                  )}
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/85">
                  Manage your profile, notifications, appearance, location access, and data privacy.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                Secure Settings
              </div>

              <div className="rounded-full bg-white px-4 py-2 text-center shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                  Sync Status
                </p>

                <p className="text-sm font-black text-slate-900">
                  {authUid
                    ? "Cloud Synced"
                    : "This Device"}
                </p>
              </div>
            </div>
          </div>

          {/* Account card */}
          <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 font-black text-white ring-1 ring-white/20">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {account?.displayName}
              </p>

              <p className="mt-0.5 truncate text-xs text-blue-50/80">
                {account?.email}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/15">
              {roleLabel}
            </span>
          </div>
        </section>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="relative z-10 -mt-5 sm:-mt-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
            <div
              className={`h-1.5 ${GRADIENT_CLASS}`}
              aria-hidden="true"
            />

            <div className="space-y-5 p-4 sm:p-6 lg:p-8">
              {/* Sync messages */}
              {!authUid && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-black">
                      Local account mode
                    </p>

                    <p className="mt-1 text-xs leading-6">
                      Preferences are stored on this device. Sign in using a Supabase Auth account to synchronize settings across devices.
                    </p>
                  </div>
                </div>
              )}

              {syncError && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="font-semibold leading-6">
                    {syncError}
                  </p>
                </div>
              )}

              {/* Profile */}
              <SettingsSection
                icon={User}
                title="Profile & Account"
                description="Review your identity and manage your profile information."
                tone="blue"
              >
                <div className="mb-5 flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
                  <div
                    className={`${GRADIENT_CLASS} flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg`}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                      {account?.displayName}
                    </h3>

                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                      {account?.email}
                    </p>

                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                      {roleLabel}
                      {account?.workId
                        ? ` · ${account.workId}`
                        : ""}{" "}
                      · Naic, Cavite
                    </p>
                  </div>
                </div>

                <SettingRow
                  icon={User}
                  title={manageProfileLabel}
                  description="Review or update your personal information."
                >
                  <Link
                    to={manageProfilePath}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                  >
                    Manage
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </SettingRow>

                <SettingRow
                  icon={KeyRound}
                  title="Password & Security"
                  description="Change the password used to access your account."
                >
                  <ActionButton
                    onClick={openPasswordModal}
                  >
                    Change
                  </ActionButton>
                </SettingRow>
              </SettingsSection>

              {/* Notifications */}
              <SettingsSection
                icon={Bell}
                title="Notification Preferences"
                description="Choose which community advisories you want to receive."
                tone="purple"
              >
                <SettingRow
                  icon={CloudRain}
                  title="Critical Weather Alerts"
                  description="Typhoon, flood, and severe weather warnings."
                >
                  <Toggle
                    checked={prefs.weather_alerts}
                    onChange={(value) =>
                      commit(
                        (current) => ({
                          ...current,
                          weather_alerts: value,
                        }),
                        {
                          title: "Weather alerts updated",
                        },
                      )
                    }
                    label="Critical weather alerts"
                  />
                </SettingRow>

                <SettingRow
                  icon={Megaphone}
                  title="Local Advisory Bulletins"
                  description="Municipal announcements and community advisories."
                >
                  <Toggle
                    checked={prefs.local_advisories}
                    onChange={(value) =>
                      commit(
                        (current) => ({
                          ...current,
                          local_advisories: value,
                        }),
                        {
                          title: "Advisory preferences updated",
                        },
                      )
                    }
                    label="Local advisory bulletins"
                  />
                </SettingRow>

                <SettingRow
                  icon={Siren}
                  title="Scheduled Drill Reminders"
                  description="Community preparedness and evacuation drill reminders."
                >
                  <Toggle
                    checked={prefs.drill_reminders}
                    onChange={(value) =>
                      commit(
                        (current) => ({
                          ...current,
                          drill_reminders: value,
                        }),
                        {
                          title: "Drill reminders updated",
                        },
                      )
                    }
                    label="Scheduled drill reminders"
                  />
                </SettingRow>

                <SettingRow
                  icon={Shield}
                  title="Emergency Alerts"
                  description="Critical life-safety alerts cannot be disabled."
                >
                  <Toggle
                    checked
                    disabled
                    onChange={() => {}}
                    label="Emergency alerts always enabled"
                  />
                </SettingRow>
              </SettingsSection>

              {/* Appearance */}
              <SettingsSection
                icon={SettingsIcon}
                title="Appearance"
                description="Personalize how SafeResponse looks on this device."
                tone="green"
              >
             

                <SettingRow
                  icon={
                    prefs.dark_mode
                      ? Moon
                      : Sun
                  }
                  title="Dark Mode"
                  description={`Currently ${
                    prefs.dark_mode ? "on" : "off"
                  }.`}
                >
                  <Toggle
                    checked={prefs.dark_mode}
                    onChange={(value) =>
                      commit(
                        (current) => ({
                          ...current,
                          dark_mode: value,
                        }),
                        {
                          title: value
                            ? "Dark mode enabled"
                            : "Light mode enabled",
                        },
                      )
                    }
                    label="Dark mode"
                  />
                </SettingRow>
              </SettingsSection>

              {/* Data and privacy */}
              <SettingsSection
                icon={ShieldCheck}
                title="Data & Privacy"
                description="Control location access and manage your personal data."
                tone="amber"
              >
                <SettingRow
                  icon={MapPin}
                  title="Location Access"
                  description="Allow GPS when reports and services require your location."
                >
                  <Toggle
                    checked={prefs.location_access}
                    onChange={
                      handleLocationToggle
                    }
                    label="Location access"
                  />
                </SettingRow>

                <SettingRow
                  icon={UserCheck}
                  title="Show My Name on Public Reports"
                  description="When enabled, your name may appear on public hazard report information."
                >
                  <Toggle
                    checked={prefs.public_name}
                    onChange={(value) =>
                      commit(
                        (current) => ({
                          ...current,
                          public_name: value,
                        }),
                        {
                          title: value
                            ? "Public name display enabled"
                            : "Reports will be anonymous",
                          detail: value
                            ? "Your name may appear on public report information."
                            : "New hazard reports will be submitted as Anonymous.",
                        },
                      )
                    }
                    label="Show my name on public reports"
                  />
                </SettingRow>

                <SettingRow
                  icon={Database}
                  title="Download My Data"
                  description="Export linked appointments, incidents, vehicle requests, check-ups, and hazards as JSON."
                >
                  <ActionButton
                    onClick={handleExportData}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}

                    {exporting
                      ? "Preparing..."
                      : "Export"}
                  </ActionButton>
                </SettingRow>

                <SettingRow
                  icon={Mail}
                  title="Request Data Deletion"
                  description="Send a formal privacy request to the MDRRMO data officer."
                >
                  <ActionButton
                    href={`mailto:${DATA_OFFICE_EMAIL}?subject=${deletionSubject}&body=${deletionBody}`}
                    danger
                  >
                    Request
                  </ActionButton>
                </SettingRow>
              </SettingsSection>

              {/* Account sync */}
              <SettingsSection
                icon={Cloud}
                title="Device & Cloud Sync"
                description="Check how your preferences are currently stored."
                tone="blue"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <Smartphone className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                          This device
                        </p>

                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                          Always saves locally
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "rounded-2xl border p-4",
                      authUid
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/40"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                          authUid
                            ? GRADIENT_CLASS
                            : "bg-slate-400"
                        }`}
                      >
                        <Cloud className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          Cloud sync
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {authUid
                            ? "Connected to Supabase"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsSection>

              {/* Danger zone */}
              <SettingsSection
                icon={Shield}
                title="Account Actions"
                description="Sign out or restore all settings to their defaults."
                tone="red"
              >
                <SettingRow
                  icon={LogOut}
                  title="Sign Out"
                  description="Ends your resident and personnel sessions on this device."
                  danger
                >
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={saving}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}

                    Sign Out
                  </button>
                </SettingRow>

                <SettingRow
                  icon={RotateCcw}
                  title="Reset All Preferences"
                  description="Restores every setting to its default. Your account and requests are not deleted."
                  danger
                >
                  <ActionButton
                    onClick={handleReset}
                    disabled={saving}
                    danger
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset
                  </ActionButton>
                </SettingRow>
              </SettingsSection>

              <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-center sm:flex-row sm:text-left dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SafeResponse · Preferences save automatically
                </p>

                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {authUid
                    ? "Synchronized across your devices"
                    : "Stored on this device"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* =================================================
          PASSWORD MODAL
      ================================================= */}

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={closePasswordModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className="my-6 w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div
              className={`${GRADIENT_CLASS} relative overflow-hidden px-6 py-5 text-white`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl"
              />

              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <KeyRound className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="password-modal-title"
                    className="text-lg font-black"
                  >
                    Change Password
                  </h2>

                  <p className="mt-0.5 text-xs text-blue-50/80">
                    Protect your SafeResponse account
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={pwBusy}
                  aria-label="Close password dialog"
                  className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleChangePassword}
              className="space-y-5 p-5 sm:p-6"
            >
              {pwError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="font-semibold leading-6">
                    {pwError}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200"
                >
                  Current Password
                </label>

                <div className="relative">
                  <input
                    id="current-password"
                    type={
                      showPw ? "text" : "password"
                    }
                    value={pwForm.currentPassword}
                    onChange={(event) =>
                      setPwForm((current) => ({
                        ...current,
                        currentPassword:
                          event.target.value,
                      }))
                    }
                    autoComplete="current-password"
                    required
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPw((visible) => !visible)
                    }
                    aria-label={
                      showPw
                        ? "Hide passwords"
                        : "Show passwords"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {showPw ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200"
                >
                  New Password
                </label>

                <div className="relative">
                  <input
                    id="new-password"
                    type={
                      showPw ? "text" : "password"
                    }
                    value={pwForm.newPassword}
                    onChange={(event) =>
                      setPwForm((current) => ({
                        ...current,
                        newPassword:
                          event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPw((visible) => !visible)
                    }
                    aria-label={
                      showPw
                        ? "Hide passwords"
                        : "Show passwords"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {showPw ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mt-2 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />

                  Use at least 6 characters and avoid shared passwords.
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirm-password"
                  type={
                    showPw ? "text" : "password"
                  }
                  value={pwForm.confirmPassword}
                  onChange={(event) =>
                    setPwForm((current) => ({
                      ...current,
                      confirmPassword:
                        event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                />

                {pwForm.confirmPassword &&
                  pwForm.newPassword !==
                    pwForm.confirmPassword && (
                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
                      New passwords do not match.
                    </p>
                  )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={pwBusy}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    pwBusy ||
                    (Boolean(
                      pwForm.confirmPassword,
                    ) &&
                      pwForm.newPassword !==
                        pwForm.confirmPassword)
                  }
                  className={`${GRADIENT_CLASS} inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0`}
                >
                  {pwBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
