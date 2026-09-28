"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

import { supabase } from "../createClient";

/* =============================================================
 * THEME
 * ============================================================= */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const PROFILE_BUCKET = "images";
const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/* =============================================================
 * GENERAL HELPERS
 * ============================================================= */

const cleanText = (value) =>
  String(value ?? "").trim();

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => cleanText(part))
    .filter(Boolean)
    .join(" ")
    .trim();

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    cleanText(value),
  );

const getInitials = (value) => {
  const text = cleanText(value);

  if (!text) {
    return "U";
  }

  return (
    text
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const formatDate = (value) => {
  const text = cleanText(value);

  if (!text) {
    return "Not available";
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const normalizeRole = (value) => {
  const role = cleanText(value).toLowerCase();

  if (role === "admin") {
    return "admin";
  }

  if (
    role === "staff" ||
    role === "moderator"
  ) {
    return "staff";
  }

  return "user";
};

const normalizeStatus = (value) => {
  if (value === true) {
    return "approved";
  }

  if (value === false) {
    return "inactive";
  }

  return cleanText(value).toLowerCase();
};

const getStatusInfo = (profile) => {
  const value =
    profile?.is_active !== undefined
      ? profile.is_active
      : profile?.status;

  const status = normalizeStatus(value);

  if (
    status === "approved" ||
    status === "active" ||
    status === "enabled" ||
    status === "true"
  ) {
    return {
      label: "Active",
      icon: CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (
    status === "pending" ||
    status === "pending approval" ||
    status === "for approval"
  ) {
    return {
      label: "Pending",
      icon: Clock3,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  if (
    status === "rejected" ||
    status === "inactive" ||
    status === "disabled" ||
    status === "false"
  ) {
    return {
      label: "Inactive",
      icon: XCircle,
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }

  return {
    label: "Unknown",
    icon: AlertCircle,
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
};

const readLocalSession = (key) => {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const maybeSingle = async (query) => {
  try {
    const { data, error } = await query;

    if (error) {
      console.warn(
        "Profile lookup warning:",
        error,
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.warn(
      "Profile lookup failed:",
      error,
    );

    return null;
  }
};

/* =============================================================
 * PROFILE PICTURE DATABASE HELPERS
 * ============================================================= */

const getPictureTargets = (profile) => {
  const targets = [];

  const accountType = cleanText(
    profile?.accountType ||
      profile?.type ||
      profile?.role ||
      "",
  ).toLowerCase();

  const source = cleanText(
    profile?.source ||
      (accountType === "admin"
        ? "admin_users"
        : accountType === "staff"
          ? "staff_users"
          : "profiles"),
  ).toLowerCase();

  const addTarget = ({
    table,
    column,
    value,
    primary = false,
  }) => {
    if (value === null || value === undefined) {
      return;
    }

    const normalizedValue = String(value);

    if (!normalizedValue.trim()) {
      return;
    }

    const key = [
      table,
      column,
      normalizedValue,
    ].join(":");

    if (
      targets.some(
        (target) => target.key === key,
      )
    ) {
      return;
    }

    targets.push({
      key,
      table,
      column,
      value: normalizedValue,
      primary,
    });
  };

  if (accountType === "admin") {
    addTarget({
      table: "admin_users",
      column: "id",
      value: profile?.id,
      primary: true,
    });
  } else if (accountType === "staff") {
    addTarget({
      table: "staff_users",
      column: "id",
      value: profile?.id,
      primary: true,
    });
  } else if (source === "pending_registrations") {
    addTarget({
      table: "pending_registrations",
      column: "email",
      value: profile?.email,
      primary: true,
    });
  } else {
    addTarget({
      table: "profiles",
      column: "id",
      value: profile?.id,
      primary: true,
    });

    /*
     * Keep the legacy registration record synchronized
     * when possible.
     */
    addTarget({
      table: "pending_registrations",
      column: "email",
      value: profile?.email,
      primary: false,
    });
  }

  return targets;
};

const updateAccountPicture = async (
  profile,
  pictureUrl,
) => {
  const targets = getPictureTargets(profile);

  if (targets.length === 0) {
    throw new Error(
      "Your account record could not be identified.",
    );
  }

  let primaryUpdated = false;
  let anyUpdated = false;
  let lastError = null;

  for (const target of targets) {
    try {
      let query = supabase
        .from(target.table)
        .update({
          profile_picture: pictureUrl,
        });

      query =
        target.column === "email"
          ? query.eq(
              "email",
              target.value,
            )
          : query.eq(
              "id",
              target.value,
            );

      const { data, error } =
        await query
          .select("id")
          .maybeSingle();

      if (error) {
        lastError = error;
        continue;
      }

      if (data) {
        anyUpdated = true;

        if (target.primary) {
          primaryUpdated = true;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!anyUpdated || !primaryUpdated) {
    throw new Error(
      lastError?.message ||
        "The profile picture could not be saved. Check your account permissions.",
    );
  }
};

const getStoredPicturePath = (url) => {
  const value = cleanText(url);

  if (!value) {
    return null;
  }

  const publicPath = `/storage/v1/object/public/${PROFILE_BUCKET}/`;
  const index = value.indexOf(publicPath);

  if (index < 0) {
    return null;
  }

  const path = value
    .slice(index + publicPath.length)
    .split("?")[0];

  if (
    !path.startsWith("profile_pictures/")
  ) {
    return null;
  }

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const removeStoredPicture = async (url) => {
  const path = getStoredPicturePath(url);

  if (!path) {
    return;
  }

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .remove([path]);

  if (error) {
    console.warn(
      "Old profile picture cleanup failed:",
      error,
    );
  }
};

const getSafeFileExtension = (file) => {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension) {
    return extension;
  }

  const contentTypeExtensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return contentTypeExtensions[file.type] || "jpg";
};

/* =============================================================
 * PROFILE PICTURE EDITOR
 * ============================================================= */

function ProfilePictureEditor({
  profile,
  onUpdated,
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] =
    useState(false);

  const [removing, setRemoving] =
    useState(false);

  const [imageFailed, setImageFailed] =
    useState(false);

  const [feedback, setFeedback] =
    useState(null);

  const pictureUrl =
    profile?.profile_picture ||
    profile?.avatar_url ||
    null;

  const displayName =
    profile?.full_name ||
    cleanName(
      profile?.first_name,
      profile?.middle_name,
      profile?.last_name,
    ) ||
    profile?.email ||
    "User";

  const initials = getInitials(displayName);
  const busy = uploading || removing;

  useEffect(() => {
    setImageFailed(false);
    setFeedback(null);
  }, [pictureUrl]);

  const openFilePicker = () => {
    if (busy) {
      return;
    }

    setFeedback(null);
    inputRef.current?.click();
  };

  const handlePictureSelected = async (
    event,
  ) => {
    const file = event.target.files?.[0];

    /*
     * Reset the input so selecting the same file
     * again still triggers a change event.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    setFeedback(null);

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setFeedback({
        type: "error",
        message:
          "Please select a JPG, PNG, or WEBP image.",
      });

      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setFeedback({
        type: "error",
        message:
          "The profile picture must be smaller than 8 MB.",
      });

      return;
    }

    setUploading(true);
    setImageFailed(false);

    let uploadedPath = null;

    try {
      let authUser = null;

      try {
        const { data } =
          await supabase.auth.getUser();

        authUser = data?.user || null;
      } catch {
        authUser = null;
      }

      const ownerKey = cleanText(
        authUser?.id ||
          profile?.user_id ||
          profile?.id ||
          profile?.email ||
          "user",
      )
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_");

      const randomPart =
        Math.random()
          .toString(36)
          .slice(2, 10);

      const extension =
        getSafeFileExtension(file);

      uploadedPath =
        `profile_pictures/${ownerKey}/profile-${Date.now()}-${randomPart}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from(PROFILE_BUCKET)
          .upload(
            uploadedPath,
            file,
            {
              cacheControl: "3600",
              contentType: file.type,
              upsert: false,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData, error: urlError } =
        await supabase.storage
          .from(PROFILE_BUCKET)
          .getPublicUrl(uploadedPath);

      if (urlError) {
        throw urlError;
      }

      const publicUrl =
        publicData?.publicUrl || null;

      if (!publicUrl) {
        throw new Error(
          "The uploaded image did not receive a public URL.",
        );
      }

      await updateAccountPicture(
        profile,
        publicUrl,
      );

      const oldPictureUrl = pictureUrl;

      onUpdated?.({
        ...profile,
        profile_picture: publicUrl,
        avatar_url: publicUrl,
      });

      if (
        oldPictureUrl &&
        oldPictureUrl !== publicUrl
      ) {
        void removeStoredPicture(
          oldPictureUrl,
        );
      }

      setFeedback({
        type: "success",
        message:
          "Profile picture updated successfully.",
      });
    } catch (error) {
      console.error(
        "Profile picture upload failed:",
        error,
      );

      if (uploadedPath) {
        await supabase.storage
          .from(PROFILE_BUCKET)
          .remove([uploadedPath])
          .catch(() => null);
      }

      setFeedback({
        type: "error",
        message:
          error?.message ||
          "The profile picture could not be uploaded.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (busy || !pictureUrl) {
      return;
    }

    const confirmed = window.confirm(
      "Remove your profile picture?",
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setFeedback(null);
    setImageFailed(false);

    try {
      await updateAccountPicture(
        profile,
        null,
      );

      onUpdated?.({
        ...profile,
        profile_picture: null,
        avatar_url: null,
      });

      await removeStoredPicture(
        pictureUrl,
      );

      setFeedback({
        type: "success",
        message:
          "Profile picture removed successfully.",
      });
    } catch (error) {
      console.error(
        "Profile picture removal failed:",
        error,
      );

      setFeedback({
        type: "error",
        message:
          error?.message ||
          "The profile picture could not be removed.",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/30 bg-white/15 shadow-xl ring-1 ring-white/20 backdrop-blur-sm sm:h-28 sm:w-28">
        {pictureUrl && !imageFailed ? (
          <img
            src={pictureUrl}
            alt={`${displayName} profile picture`}
            className="h-full w-full object-cover"
            onError={() =>
              setImageFailed(true)
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-3xl font-black text-white sm:text-4xl">
              {initials}
            </span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Add or replace picture */}
      <button
        type="button"
        onClick={openFilePicker}
        disabled={busy}
        aria-label={
          pictureUrl
            ? "Change profile picture"
            : "Add profile picture"
        }
        title={
          pictureUrl
            ? "Change profile picture"
            : "Add profile picture"
        }
        className="absolute -bottom-2 -left-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 text-white shadow-lg transition hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>

      {/* Remove picture */}
      {pictureUrl && !busy && (
        <button
          type="button"
          onClick={handleRemovePicture}
          aria-label="Remove profile picture"
          title="Remove profile picture"
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePictureSelected}
        className="hidden"
        aria-label="Choose profile picture"
      />

      {feedback && (
        <div
          role={
            feedback.type === "error"
              ? "alert"
              : "status"
          }
          aria-live="polite"
          className={`absolute left-0 top-full z-40 mt-3 w-72 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold shadow-xl backdrop-blur ${
            feedback.type === "error"
              ? "border-rose-200 bg-rose-50/95 text-rose-800"
              : "border-emerald-200 bg-emerald-50/95 text-emerald-800"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}

/* =============================================================
 * SMALL PROFILE COMPONENTS
 * ============================================================= */

function ProfileDetailCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
          {value || "Not available"}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
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
  );
}

/* =============================================================
 * DATABASE ACCOUNT LOOKUPS
 * ============================================================= */

const findAdminAccount = async (session) => {
  let account = null;

  if (session.id && isUuid(session.id)) {
    account = await maybeSingle(
      supabase
        .from("admin_users")
        .select("*")
        .eq("id", session.id)
        .maybeSingle(),
    );
  }

  if (!account && session.user_id) {
    account = await maybeSingle(
      supabase
        .from("admin_users")
        .select("*")
        .eq("custom_id", session.user_id)
        .maybeSingle(),
    );
  }

  if (!account && session.username) {
    account = await maybeSingle(
      supabase
        .from("admin_users")
        .select("*")
        .eq("username", session.username)
        .maybeSingle(),
    );
  }

  if (!account && session.email) {
    account = await maybeSingle(
      supabase
        .from("admin_users")
        .select("*")
        .eq("email", session.email)
        .maybeSingle(),
    );
  }

  return account;
};

const findStaffAccount = async (session) => {
  let account = null;

  if (session.user_id) {
    account = await maybeSingle(
      supabase
        .from("staff_users")
        .select("*")
        .eq("user_id", session.user_id)
        .maybeSingle(),
    );
  }

  if (!account && session.username) {
    account = await maybeSingle(
      supabase
        .from("staff_users")
        .select("*")
        .eq("username", session.username)
        .maybeSingle(),
    );
  }

  if (!account && session.email) {
    account = await maybeSingle(
      supabase
        .from("staff_users")
        .select("*")
        .eq("email", session.email)
        .maybeSingle(),
    );
  }

  if (!account && session.id) {
    account = await maybeSingle(
      supabase
        .from("staff_users")
        .select("*")
        .eq("id", session.id)
        .maybeSingle(),
    );
  }

  return account;
};

const findResidentAccount = async ({
  authUser,
  localUser,
}) => {
  let profile = null;
  let registration = null;

  const authId = cleanText(authUser?.id);
  const email = cleanText(
    localUser?.email || authUser?.email,
  );

  if (authId) {
    profile = await maybeSingle(
      supabase
        .from("profiles")
        .select("*")
        .eq("id", authId)
        .maybeSingle(),
    );
  }

  if (!profile && localUser?.user_id) {
    profile = await maybeSingle(
      supabase
        .from("profiles")
        .select("*")
        .eq(
          "user_id",
          localUser.user_id,
        )
        .maybeSingle(),
    );
  }

  if (!profile && email) {
    profile = await maybeSingle(
      supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle(),
    );
  }

  const registrationUserId =
    authId || localUser?.user_id;

  if (registrationUserId) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq(
          "user_id",
          registrationUserId,
        )
        .maybeSingle(),
    );
  }

  if (!registration && authId) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq("id", authId)
        .maybeSingle(),
    );
  }

  if (!registration && email) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq("email", email)
        .maybeSingle(),
    );
  }

  return {
    profile,
    registration,
  };
};

/* =============================================================
 * PROFILE RESOLUTION
 * ============================================================= */

const resolveProfile = async () => {
  /* ---------------------------------------------------------
     STAFF OR ADMIN SESSION
  --------------------------------------------------------- */

  const staffSession = readLocalSession(
    "currentStaff",
  );

  if (staffSession) {
    const role = normalizeRole(
      staffSession.role,
    );

    const source =
      staffSession.source === "admin_users" ||
      role === "admin"
        ? "admin_users"
        : "staff_users";

    const accountRow =
      source === "admin_users"
        ? await findAdminAccount(staffSession)
        : await findStaffAccount(staffSession);

    const inactive =
      staffSession.is_active === false ||
      accountRow?.is_active === false;

    if (inactive) {
      return {
        kind: "error",
        message:
          "This account is inactive. Please contact your administrator.",
      };
    }

    const displayName =
      accountRow?.full_name ||
      staffSession.full_name ||
      staffSession.username ||
      staffSession.user_id ||
      "Staff Member";

    return {
      kind: "success",
      userType: role,
      profile: {
        accountType:
          role === "admin"
            ? "admin"
            : "staff",
        source,
        profile_picture:
          accountRow?.profile_picture ||
          accountRow?.avatar_url ||
          null,
        id:
          accountRow?.id ||
          staffSession.id ||
          "",
        user_id:
          accountRow?.user_id ||
          accountRow?.custom_id ||
          staffSession.user_id ||
          "",
        username:
          accountRow?.username ||
          staffSession.username ||
          "",
        email:
          accountRow?.email ||
          staffSession.email ||
          "—",
        full_name: displayName,
        first_name: "",
        middle_name: "",
        last_name: "",
        mobile_number:
          accountRow?.mobile_number ||
          staffSession.mobile_number ||
          "",
        address: "",
        birthdate: "",
        age: "",
        id_number: "",
        id_image_url: "",
        role:
          accountRow?.role ||
          staffSession.role ||
          "staff",
        department:
          accountRow?.department ||
          staffSession.department ||
          "",
        is_active: true,
        status:
          accountRow?.status ||
          "approved",
        created_at:
          accountRow?.created_at ||
          staffSession.created_at ||
          null,
      },
    };
  }

  /* ---------------------------------------------------------
     RESIDENT SESSION
  --------------------------------------------------------- */

  const localUser = readLocalSession(
    "currentUser",
  );

  let authUser = null;

  try {
    const { data } =
      await supabase.auth.getUser();

    authUser = data?.user || null;
  } catch {
    authUser = null;
  }

  if (!localUser && !authUser) {
    return {
      kind: "none",
    };
  }

  const { profile, registration } =
    await findResidentAccount({
      authUser,
      localUser,
    });

  if (
    !localUser &&
    !profile &&
    !registration
  ) {
    return {
      kind: "error",
      message:
        "Your resident profile could not be found. Complete your registration or contact the administrator.",
    };
  }

  const sourceProfile =
    profile || registration || {};

  const displayName =
    sourceProfile.full_name ||
    cleanName(
      sourceProfile.first_name ||
        localUser?.first_name,
      sourceProfile.middle_name ||
        localUser?.middle_name,
      sourceProfile.last_name ||
        localUser?.last_name,
    ) ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    localUser?.email ||
    authUser?.email ||
    "Resident";

  const accountStatus = normalizeStatus(
    sourceProfile.status ||
      localUser?.status ||
      "approved",
  );

  return {
    kind: "success",
    userType: "user",
    profile: {
      accountType: "user",
      source: profile
        ? "profiles"
        : registration
          ? "pending_registrations"
          : "local",
      profile_picture:
        sourceProfile.profile_picture ||
        sourceProfile.avatar_url ||
        null,
      id:
        profile?.id ||
        registration?.id ||
        localUser?.id ||
        authUser?.id ||
        "",
      user_id:
        profile?.user_id ||
        registration?.user_id ||
        localUser?.user_id ||
        authUser?.id ||
        "",
      username:
        sourceProfile.username ||
        localUser?.username ||
        "",
      email:
        sourceProfile.email ||
        localUser?.email ||
        authUser?.email ||
        "—",
      full_name: displayName,
      first_name:
        sourceProfile.first_name ||
        localUser?.first_name ||
        "",
      middle_name:
        sourceProfile.middle_name ||
        localUser?.middle_name ||
        "",
      last_name:
        sourceProfile.last_name ||
        localUser?.last_name ||
        "",
      mobile_number:
        sourceProfile.mobile_number ||
        localUser?.mobile_number ||
        "",
      address:
        sourceProfile.address ||
        localUser?.address ||
        "",
      birthdate:
        sourceProfile.birthdate ||
        localUser?.birthdate ||
        "",
      age:
        sourceProfile.age ??
        localUser?.age ??
        "",
      id_number:
        sourceProfile.id_number || "",
      id_image_url:
        sourceProfile.id_image_url ||
        localUser?.id_image_url ||
        "",
      role:
        sourceProfile.role ||
        localUser?.role ||
        "user",
      department: "",
      is_active:
        sourceProfile.is_active !== false &&
        accountStatus !== "rejected" &&
        accountStatus !== "inactive",
      status: accountStatus || "approved",
      created_at:
        sourceProfile.created_at ||
        localUser?.created_at ||
        authUser?.created_at ||
        null,
    },
  };
};

/* =============================================================
 * MAIN PROFILE COMPONENT
 * ============================================================= */

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState(null);

  const [userType, setUserType] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [loggingOut, setLoggingOut] =
    useState(false);

  /* ---------------------------------------------------------
     LOAD PROFILE
  --------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await resolveProfile();

        if (cancelled) {
          return;
        }

        if (result.kind === "none") {
          setLoading(false);

          navigate("/login", {
            replace: true,
            state: {
              error:
                "Please log in to view your profile.",
            },
          });

          return;
        }

        if (result.kind === "error") {
          setError(
            result.message ||
              "Unable to load your profile.",
          );

          setLoading(false);

          return;
        }

        setProfile(result.profile);
        setUserType(result.userType);
        setLoading(false);
      } catch (loadError) {
        console.error(
          "Profile loading error:",
          loadError,
        );

        if (!cancelled) {
          setError(
            loadError?.message ||
              "Failed to load your profile. Please try again.",
          );

          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Sign out of SafeResponse on this device?",
    );

    if (!confirmed) {
      return;
    }

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
    } catch {
      // Manual staff accounts may not have a Supabase session.
    }

    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentStaff");
    } catch {
      // Ignore local storage errors.
    }

    const destination =
      userType === "admin" ||
      userType === "staff"
        ? "/admin"
        : "/login";

    navigate(destination, {
      replace: true,
    });
  };

  /* ---------------------------------------------------------
     DERIVED VALUES
  --------------------------------------------------------- */

  const isPersonnel =
    userType === "staff" ||
    userType === "admin";

  const isResident = userType === "user";

  const statusInfo = useMemo(
    () => getStatusInfo(profile),
    [profile],
  );

  const StatusIcon = statusInfo.icon;

  const roleLabel =
    userType === "admin"
      ? "Administrator"
      : userType === "staff"
        ? "Staff Member"
        : "Resident";

  const displayName =
    profile?.full_name ||
    cleanName(
      profile?.first_name,
      profile?.middle_name,
      profile?.last_name,
    ) ||
    "Resident";

  const accountId =
    profile?.user_id ||
    profile?.id ||
    "Not available";

  const backPath =
    userType === "admin"
      ? "/admin/dashboard"
      : userType === "staff"
        ? "/staff/dashboard"
        : "/home";

  /* ---------------------------------------------------------
     LOADING SCREEN
  --------------------------------------------------------- */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div
            className={`${GRADIENT_CLASS} mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl`}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <h1 className="mt-5 text-lg font-black text-slate-800 dark:text-white">
            Loading your profile
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Checking your account information...
          </p>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------
     ERROR SCREEN
  --------------------------------------------------------- */

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div
            className={`h-2 ${GRADIENT_CLASS}`}
            aria-hidden="true"
          />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50">
              <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Profile unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "We could not load your profile information."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to Login
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className={`${GRADIENT_CLASS} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105`}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------
     PROFILE PAGE
  --------------------------------------------------------- */

  return (
    <main className="relative isolate min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10 dark:bg-slate-950">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-32 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-20 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
      />

      <div className="mx-auto max-w-6xl">
        {/* ============================================
            GRADIENT PROFILE HEADER
        ============================================ */}

        <section
          className={`${GRADIENT_CLASS} relative overflow-visible rounded-[2rem] px-5 py-7 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8`}
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
            <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-6">
              <div className="relative">
                <ProfilePictureEditor
                  profile={profile}
                  onUpdated={setProfile}
                />

                {isPersonnel && (
                  <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-yellow-400 shadow-lg">
                    <BadgeCheck className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  SafeResponse Account
                </p>

                <h1 className="mt-1 break-words text-2xl font-black text-white sm:text-3xl lg:text-4xl">
                  {displayName}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    {isPersonnel ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <UserRound className="h-3.5 w-3.5" />
                    )}

                    {roleLabel}
                  </span>

                  {profile.department && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      <Building2 className="h-3.5 w-3.5" />

                      {profile.department}
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />

                    {statusInfo.label}
                  </span>
                </div>

                <p className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-blue-50/75">
                  <Mail className="h-3.5 w-3.5 shrink-0" />

                  <span className="truncate">
                    {profile.email}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                type="button"
                onClick={() =>
                  navigate(backPath)
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                <ArrowLeft className="h-4 w-4" />

                Back to Dashboard
              </button>

              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100">
                Naic, Cavite
              </span>
            </div>
          </div>
        </section>

        {/* ============================================
            PROFILE DETAILS
        ============================================ */}

        <section className="relative z-10 -mt-5 sm:-mt-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
            <div
              className={`h-1.5 ${GRADIENT_CLASS}`}
              aria-hidden="true"
            />

            <div className="space-y-7 p-4 sm:p-6 lg:p-8">
              {/* Inactive account warning */}
              {profile.is_active === false && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="font-semibold leading-6">
                    This account is currently inactive. Please contact the MDRRMO administrator if you believe this is a mistake.
                  </p>
                </div>
              )}

              {/* Profile picture help */}
              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-black text-blue-900 dark:text-blue-100">
                    Profile picture
                  </p>

                  <p className="mt-1 text-xs leading-6 text-blue-800 dark:text-blue-200">
                    Use the camera button beneath your picture to add or replace it. Use the delete button to remove it. JPG, PNG, and WEBP files up to 8 MB are supported.
                  </p>
                </div>
              </div>

              {/* Summary cards */}
              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                    Account Status
                  </p>

                  <p className="mt-2 text-lg font-black text-blue-900 dark:text-blue-100">
                    {statusInfo.label}
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/70 dark:bg-violet-950/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                    Account Type
                  </p>

                  <p className="mt-2 text-lg font-black text-violet-900 dark:text-violet-100">
                    {roleLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                    Member Since
                  </p>

                  <p className="mt-2 text-sm font-black text-emerald-900 dark:text-emerald-100">
                    {formatDate(profile.created_at)}
                  </p>
                </div>
              </section>

              {/* Personnel information */}
              {isPersonnel && (
                <section>
                  <SectionHeading
                    icon={ShieldCheck}
                    title="Personnel Information"
                    description="Your role and department within the MDRRMO operations."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/70 dark:bg-violet-950/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                          <BadgeCheck className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                            Role
                          </p>

                          <p className="mt-1 break-words font-black capitalize text-violet-950 dark:text-violet-100">
                            {profile.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {profile.department && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <Building2 className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                              Department
                            </p>

                            <p className="mt-1 break-words font-black text-blue-950 dark:text-blue-100">
                              {profile.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Account ID */}
              <section>
                <SectionHeading
                  icon={IdCard}
                  title={
                    isPersonnel
                      ? "Personnel Identification"
                      : "Account Identification"
                  }
                  description="This identifier associates your account with submitted requests."
                />

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                      <IdCard className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {isPersonnel
                          ? "Work ID"
                          : "User ID"}
                      </p>

                      <p className="mt-1 break-all font-mono text-sm font-black text-slate-800 dark:text-slate-100">
                        {accountId}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    Verified Record
                  </span>
                </div>
              </section>

              {/* General account information */}
              <section>
                <SectionHeading
                  icon={UserRound}
                  title={
                    isPersonnel
                      ? "Staff Information"
                      : "Personal Information"
                  }
                  description="Your current account and contact information."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileDetailCard
                    icon={Mail}
                    label="Email Address"
                    value={profile.email}
                  />

                  <ProfileDetailCard
                    icon={UserRound}
                    label="Full Name"
                    value={displayName}
                  />

                  {profile.username && (
                    <ProfileDetailCard
                      icon={UserRound}
                      label="Username"
                      value={`@${profile.username}`}
                    />
                  )}

                  {profile.mobile_number && (
                    <ProfileDetailCard
                      icon={Phone}
                      label="Mobile Number"
                      value={profile.mobile_number}
                    />
                  )}

                  {profile.address && (
                    <ProfileDetailCard
                      icon={MapPin}
                      label="Address"
                      value={profile.address}
                    />
                  )}

                  {!isPersonnel &&
                    profile.age !== "" &&
                    profile.age !== null &&
                    profile.age !== undefined && (
                      <ProfileDetailCard
                        icon={CalendarDays}
                        label="Age"
                        value={`${profile.age} years old`}
                      />
                    )}

                  {!isPersonnel &&
                    profile.birthdate && (
                      <ProfileDetailCard
                        icon={CalendarDays}
                        label="Birthdate"
                        value={formatDate(
                          profile.birthdate,
                        )}
                      />
                    )}

                  {!isPersonnel &&
                    profile.id_number && (
                      <ProfileDetailCard
                        icon={IdCard}
                        label="Valid ID Number"
                        value={profile.id_number}
                      />
                    )}

                  <ProfileDetailCard
                    icon={ShieldCheck}
                    label="Account Type"
                    value={roleLabel}
                  />

                  <ProfileDetailCard
                    icon={CalendarDays}
                    label="Member Since"
                    value={formatDate(
                      profile.created_at,
                    )}
                  />
                </div>
              </section>

              {/* Submitted ID */}
              {!isPersonnel &&
                profile.id_image_url && (
                  <section>
                    <SectionHeading
                      icon={IdCard}
                      title="Submitted Identification"
                      description="This image was submitted during account verification."
                    />

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                      <img
                        src={profile.id_image_url}
                        alt="Submitted resident identification"
                        className="mx-auto max-h-96 w-full rounded-xl object-contain shadow-sm"
                      />
                    </div>
                  </section>
                )}

              {/* Profile actions */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <SectionHeading
                  icon={Pencil}
                  title="Profile Actions"
                  description="Manage your account or return to your portal dashboard."
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  {isResident && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/edit-profile")
                      }
                      className={`${GRADIENT_CLASS} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:brightness-105`}
                    >
                      <Pencil className="h-4 w-4" />

                      Edit Profile
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(backPath)
                    }
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    Back to Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}

                    {loggingOut
                      ? "Signing out..."
                      : "Sign out"}
                  </button>
                </div>
              </section>

              {/* Footer */}
              <p className="text-center text-xs leading-5 text-slate-400 dark:text-slate-500">
                SafeResponse · Municipal Disaster Risk Reduction and Management Office
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
