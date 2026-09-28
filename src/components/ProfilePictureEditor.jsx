"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";

import { supabase } from "../createClient";

const BUCKET_NAME = "images";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const cleanText = (value) =>
  String(value ?? "").trim();

const getInitials = (value) => {
  const text = cleanText(value);

  if (!text) {
    return "U";
  }

  return (
    text
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const getSafeExtension = (file) => {
  const fromName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  if (fromName) {
    return fromName;
  }

  const contentTypeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return contentTypeMap[file.type] || "jpg";
};

const getStoredPathFromUrl = (url) => {
  const value = cleanText(url);

  if (!value) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/images/";

  const markerIndex = value.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  const path = value
    .slice(markerIndex + marker.length)
    .split("?")[0];

  if (!path.startsWith("profiles/")) {
    return null;
  }

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const getAccountContext = (profile) => {
  const suppliedType = cleanText(
    profile?.accountType ||
      profile?.type ||
      profile?.role ||
      "",
  ).toLowerCase();

  const accountType =
    suppliedType === "admin" ||
    suppliedType === "staff"
      ? suppliedType
      : "user";

  const source = cleanText(
    profile?.source ||
      (accountType === "admin"
        ? "admin_users"
        : accountType === "staff"
          ? "staff_users"
          : "profiles"),
  ).toLowerCase();

  const email = cleanText(profile?.email);

  const targets = [];

  const addTarget = (
    table,
    column,
    value,
  ) => {
    if (!value) {
      return;
    }

    const key = `${table}:${column}:${value}`;

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
      value,
    });
  };

  if (accountType === "admin") {
    addTarget(
      "admin_users",
      "id",
      profile?.id,
    );
  } else if (accountType === "staff") {
    addTarget(
      "staff_users",
      "id",
      profile?.id,
    );
  } else {
    if (
      source === "pending_registrations" &&
      email
    ) {
      addTarget(
        "pending_registrations",
        "email",
        email,
      );
    } else {
      addTarget(
        "profiles",
        "id",
        profile?.id,
      );

      /*
       * Keep the legacy pending-registration row
       * synchronized when possible.
       */
      if (email) {
        addTarget(
          "pending_registrations",
          "email",
          email,
        );
      }
    }
  }

  return {
    accountType,
    targets,
  };
};

const updateAccountPicture = async (
  profile,
  pictureUrl,
) => {
  const { targets } = getAccountContext(profile);

  if (targets.length === 0) {
    throw new Error(
      "Your account record could not be identified.",
    );
  }

  let successCount = 0;
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
        successCount += 1;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (successCount === 0) {
    throw new Error(
      lastError?.message ||
        "The profile picture could not be saved. Check your account permissions.",
    );
  }
};

const removeStoredPicture = async (url) => {
  const path = getStoredPathFromUrl(url);

  if (!path) {
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.warn(
      "Old profile picture cleanup failed:",
      error,
    );
  }
};

export default function ProfilePictureEditor({
  profile,
  onUpdated,
  size = "lg",
  className = "",
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] =
    useState(false);

  const [removing, setRemoving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const hasExplicitPicture =
    Object.prototype.hasOwnProperty.call(
      profile || {},
      "profile_picture",
    );

  const pictureUrl = hasExplicitPicture
    ? profile?.profile_picture || null
    : profile?.avatar_url ||
      profile?.id_image_url ||
      null;

  const displayName =
    profile?.full_name ||
    [
      profile?.first_name,
      profile?.middle_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    profile?.email ||
    "User";

  const initials = getInitials(displayName);

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [profile?.profile_picture]);

  const sizeClasses =
    size === "sm"
      ? "h-20 w-20 rounded-2xl"
      : size === "xl"
        ? "h-32 w-32 rounded-3xl"
        : "h-24 w-24 rounded-3xl sm:h-28 sm:w-28";

  const openFilePicker = () => {
    if (uploading || removing) {
      return;
    }

    setError("");
    setSuccess("");

    inputRef.current?.click();
  };

  const handleFileSelected = async (
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

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file.",
      );

      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError(
        "The profile picture must be smaller than 8 MB.",
      );

      return;
    }

    setUploading(true);

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

      const extension =
        getSafeExtension(file);

      const randomPart =
        Math.random()
          .toString(36)
          .slice(2, 10);

      uploadedPath =
        `profiles/${ownerKey}/avatar-${Date.now()}-${randomPart}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET_NAME)
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

      const { data: publicData } =
        await supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(uploadedPath);

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

      setSuccess(
        "Profile picture updated.",
      );
    } catch (uploadError) {
      console.error(
        "Profile picture upload failed:",
        uploadError,
      );

      if (uploadedPath) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([uploadedPath])
          .catch(() => null);
      }

      setError(
        uploadError?.message ||
          "The profile picture could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (removing || !pictureUrl) {
      return;
    }

    const confirmed = window.confirm(
      "Remove your profile picture?",
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setError("");
    setSuccess("");

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

      setSuccess(
        "Profile picture removed.",
      );
    } catch (removeError) {
      console.error(
        "Profile picture removal failed:",
        removeError,
      );

      setError(
        removeError?.message ||
          "The profile picture could not be removed.",
      );
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing;

  return (
    <div
      className={`relative shrink-0 ${className}`}
    >
      {/* Picture */}
      <div
        className={`relative flex overflow-hidden border-2 border-white/30 bg-white/15 shadow-xl ring-1 ring-white/20 backdrop-blur-sm ${sizeClasses}`}
      >
        {pictureUrl ? (
          <img
            src={pictureUrl}
            alt={`${displayName} profile`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-3xl font-black text-white sm:text-4xl">
              {initials}
            </span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Upload / replace button */}
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
            ? "Change picture"
            : "Add picture"
        }
        className="absolute -bottom-2 -left-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 text-white shadow-lg transition hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>

      {/* Remove button */}
      {pictureUrl && !busy && (
        <button
          type="button"
          onClick={handleRemovePicture}
          aria-label="Remove profile picture"
          title="Remove picture"
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
        aria-label="Choose profile picture"
      />

      {/* Feedback */}
      {(error || success) && (
        <div
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`absolute left-0 top-full z-30 mt-3 w-72 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold shadow-xl backdrop-blur ${
            error
              ? "border-rose-200 bg-rose-50/95 text-rose-800"
              : "border-emerald-200 bg-emerald-50/95 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {error ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <p className="leading-5">
              {error || success}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
