"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../createClient";

/* =============================================================
 * CONFIG
 * ============================================================= */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const PROFILE_BUCKET = "images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/* =============================================================
 * HELPERS
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
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const getSafeFileExtension = (file) => {
  const nameExtension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (nameExtension) {
    return nameExtension;
  }

  const typeExtensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return typeExtensions[file.type] || "jpg";
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

const getStoredPicturePath = (url) => {
  const value = cleanText(url);

  if (!value) {
    return null;
  }

  const publicPath =
    `/storage/v1/object/public/${PROFILE_BUCKET}/`;

  const pathIndex = value.indexOf(publicPath);

  if (pathIndex < 0) {
    return null;
  }

  const path = value
    .slice(pathIndex + publicPath.length)
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
    return { error: null, skipped: true };
  }

  try {
    const { error } = await supabase.storage
      .from(PROFILE_BUCKET)
      .remove([path]);

    return {
      error: error || null,
      skipped: false,
    };
  } catch (error) {
    return {
      error,
      skipped: false,
    };
  }
};

const findResidentProfile = async ({
  authUser,
  localUser,
}) => {
  let profile = null;
  let registration = null;

  const authId = cleanText(authUser?.id);
  const localId = cleanText(localUser?.id);
  const localUserId = cleanText(
    localUser?.user_id,
  );

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

  if (!profile && isUuid(localId)) {
    profile = await maybeSingle(
      supabase
        .from("profiles")
        .select("*")
        .eq("id", localId)
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

  if (email) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq("email", email)
        .maybeSingle(),
    );
  }

  if (
    !registration &&
    (authId || localUserId)
  ) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq(
          "user_id",
          authId || localUserId,
        )
        .maybeSingle(),
    );
  }

  if (
    !registration &&
    isUuid(localId)
  ) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq("id", localId)
        .maybeSingle(),
    );
  }

  if (
    !registration &&
    authId
  ) {
    registration = await maybeSingle(
      supabase
        .from("pending_registrations")
        .select("*")
        .eq("id", authId)
        .maybeSingle(),
    );
  }

  return {
    profile,
    registration,
  };
};

/* =============================================================
 * DATABASE UPDATE HELPERS
 * ============================================================= */

const buildAccountTargets = ({
  profile,
  registration,
  currentUser,
  authUser,
}) => {
  const targets = [];
  const added = new Set();

  const addTarget = ({
    table,
    column,
    value,
    primary = false,
    includeUpdatedAt = false,
  }) => {
    if (
      value === null ||
      value === undefined
    ) {
      return;
    }

    const normalizedValue = String(value);

    if (!cleanText(normalizedValue)) {
      return;
    }

    const key = [
      table,
      column,
      normalizedValue,
    ].join(":");

    if (added.has(key)) {
      return;
    }

    added.add(key);

    targets.push({
      key,
      table,
      column,
      value: normalizedValue,
      primary,
      includeUpdatedAt,
    });
  };

  const email = cleanText(
    profile?.email ||
      registration?.email ||
      currentUser?.email ||
      authUser?.email,
  );

  if (profile?.id) {
    addTarget({
      table: "profiles",
      column: "id",
      value: profile.id,
      primary: true,
    });
  }

  if (
    !profile?.id &&
    authUser?.id
  ) {
    addTarget({
      table: "profiles",
      column: "id",
      value: authUser.id,
      primary: true,
    });
  }

  if (
    !profile?.id &&
    isUuid(currentUser?.id)
  ) {
    addTarget({
      table: "profiles",
      column: "id",
      value: currentUser.id,
      primary: true,
    });
  }

  if (email) {
    addTarget({
      table: "profiles",
      column: "email",
      value: email,
      primary: true,
    });
  }

  if (registration?.id) {
    addTarget({
      table: "pending_registrations",
      column: "id",
      value: registration.id,
      primary: true,
      includeUpdatedAt: true,
    });
  }

  const registrationUserId = cleanText(
    registration?.user_id ||
      currentUser?.user_id ||
      authUser?.id,
  );

  if (registrationUserId) {
    addTarget({
      table: "pending_registrations",
      column: "user_id",
      value: registrationUserId,
      primary: true,
      includeUpdatedAt: true,
    });
  }

  if (email) {
    addTarget({
      table: "pending_registrations",
      column: "email",
      value: email,
      primary: true,
      includeUpdatedAt: true,
    });
  }

  return targets;
};

const updateAccountTarget = async ({
  target,
  commonPayload,
}) => {
  const payload = {
    ...commonPayload,
  };

  if (target.includeUpdatedAt) {
    payload.updated_at =
      new Date().toISOString();
  }

  let query = supabase
    .from(target.table)
    .update(payload);

  query =
    target.column === "email"
      ? query.eq(
          "email",
          target.value,
        )
      : query.eq(
          target.column,
          target.value,
        );

  const { data, error } = await query
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error,
      target,
    };
  }

  if (!data) {
    return {
      success: false,
      error: new Error(
        `No ${target.table} row matched ${target.column}.`,
      ),
      target,
    };
  }

  return {
    success: true,
    data,
    target,
  };
};

const syncAccountChanges = async ({
  profile,
  registration,
  currentUser,
  authUser,
  payload,
}) => {
  const targets = buildAccountTargets({
    profile,
    registration,
    currentUser,
    authUser,
  });

  if (targets.length === 0) {
    throw new Error(
      "Your profile record could not be identified.",
    );
  }

  const results = [];
  const updatedRows = [];

  for (const target of targets) {
    try {
      const result =
        await updateAccountTarget({
          target,
          commonPayload: payload,
        });

      results.push(result);

      if (result.success) {
        updatedRows.push(result.data);
      }
    } catch (error) {
      results.push({
        success: false,
        error,
        target,
      });
    }
  }

  const primaryTarget = targets.find(
    (target) => target.primary,
  );

  const primaryResult = results.find(
    (result) =>
      result.target.key ===
      primaryTarget?.key,
  );

  const anySuccess = results.some(
    (result) => result.success,
  );

  if (!anySuccess) {
    const firstError =
      results.find(
        (result) => !result.success,
      )?.error;

    throw new Error(
      firstError?.message ||
        "Your profile could not be updated in the database.",
    );
  }

  if (
    primaryTarget &&
    !primaryResult?.success
  ) {
    const firstError =
      results.find(
        (result) => !result.success,
      )?.error;

    throw new Error(
      firstError?.message ||
        "Your primary profile record could not be updated.",
    );
  }

  const errors = results
    .filter((result) => !result.success)
    .map((result) =>
      result.error?.message ||
      `Could not update ${result.target.table}.`,
    );

  return {
    updatedRows,
    warnings: errors,
  };
};

/* =============================================================
 * PROFILE PICTURE UPLOAD
 * ============================================================= */

const uploadProfilePicture = async ({
  file,
  currentUser,
  authUser,
}) => {
  const ownerKey = cleanText(
    authUser?.id ||
      currentUser?.user_id ||
      currentUser?.id ||
      currentUser?.email ||
      "user",
  )
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_");

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 12);

  const extension =
    getSafeFileExtension(file);

  const filePath =
    `profile_pictures/${ownerKey}/profile-${Date.now()}-${randomPart}.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from(PROFILE_BUCKET)
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        },
      );

  if (uploadError) {
    throw new Error(
      `Profile picture upload failed: ${uploadError.message}`,
    );
  }

  const {
    data: publicData,
    error: publicUrlError,
  } = await supabase.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(filePath);

  if (publicUrlError) {
    await supabase.storage
      .from(PROFILE_BUCKET)
      .remove([filePath])
      .catch(() => null);

    throw new Error(
      `Could not create the profile picture URL: ${publicUrlError.message}`,
    );
  }

  const publicUrl =
    publicData?.publicUrl || null;

  if (!publicUrl) {
    await supabase.storage
      .from(PROFILE_BUCKET)
      .remove([filePath])
      .catch(() => null);

    throw new Error(
      "The uploaded profile picture did not receive a public URL.",
    );
  }

  return {
    filePath,
    publicUrl,
  };
};

/* =============================================================
 * COMPONENT
 * ============================================================= */

export default function EditProfile() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const successTimerRef = useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [warning, setWarning] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authUser, setAuthUser] =
    useState(null);

  const [profileRecord, setProfileRecord] =
    useState(null);

  const [registrationRecord, setRegistrationRecord] =
    useState(null);

  const [form, setForm] = useState({
    mobile_number: "",
    address: "",
  });

  const [initialForm, setInitialForm] =
    useState({
      mobile_number: "",
      address: "",
    });

  const [selectedPicture, setSelectedPicture] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [existingPicture, setExistingPicture] =
    useState(null);

  const [removeExistingPicture, setRemoveExistingPicture] =
    useState(false);

  const [imageFailed, setImageFailed] =
    useState(false);

  /* ===========================================================
     CLEAN UP TEMPORARY RESOURCES
  =========================================================== */

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        );
      }

      if (successTimerRef.current) {
        window.clearTimeout(
          successTimerRef.current,
        );
      }
    };
  }, []);

  /* ===========================================================
     LOAD PROFILE
  =========================================================== */

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setWarning("");

      const storedStaff =
        readLocalSession("currentStaff");

      if (storedStaff) {
        setError(
          "Personnel accounts should update their profile from staff settings.",
        );

        setLoading(false);

        return;
      }

      const localUser =
        readLocalSession("currentUser");

      let currentAuthUser = null;

      try {
        const { data } =
          await supabase.auth.getUser();

        currentAuthUser = data?.user || null;
      } catch {
        currentAuthUser = null;
      }

      if (!localUser && !currentAuthUser) {
        setLoading(false);

        navigate("/login", {
          replace: true,
          state: {
            error:
              "Please log in before editing your profile.",
          },
        });

        return;
      }

      const {
        profile,
        registration,
      } = await findResidentProfile({
        authUser: currentAuthUser,
        localUser,
      });

      const resolvedUser = {
        ...(localUser || {}),
        ...(currentAuthUser || {}),
        id:
          profile?.id ||
          registration?.id ||
          localUser?.id ||
          currentAuthUser?.id ||
          "",
        user_id:
          profile?.user_id ||
          registration?.user_id ||
          localUser?.user_id ||
          currentAuthUser?.id ||
          "",
        email:
          profile?.email ||
          registration?.email ||
          localUser?.email ||
          currentAuthUser?.email ||
          "",
        full_name:
          profile?.full_name ||
          registration?.full_name ||
          localUser?.full_name ||
          currentAuthUser?.user_metadata?.full_name ||
          currentAuthUser?.user_metadata?.name ||
          cleanName(
            profile?.first_name,
            profile?.middle_name,
            profile?.last_name,
          ) ||
          "Resident",
      };

      const nextForm = {
        mobile_number:
          profile?.mobile_number ??
          registration?.mobile_number ??
          localUser?.mobile_number ??
          "",

        address:
          profile?.address ??
          registration?.address ??
          localUser?.address ??
          "",
      };

      const currentPicture =
        profile?.profile_picture ||
        registration?.profile_picture ||
        localUser?.profile_picture ||
        localUser?.avatar_url ||
        null;

      setCurrentUser(resolvedUser);
      setAuthUser(currentAuthUser);
      setProfileRecord(profile);
      setRegistrationRecord(registration);

      setForm(nextForm);
      setInitialForm(nextForm);

      setExistingPicture(
        currentPicture,
      );

      setRemoveExistingPicture(false);
      setImageFailed(false);
    } catch (loadError) {
      console.error(
        "Error loading profile:",
        loadError,
      );

      setError(
        loadError?.message ||
          "Failed to load your profile information.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* ===========================================================
     DERIVED VALUES
  =========================================================== */

  const fullName =
    profileRecord?.full_name ||
    registrationRecord?.full_name ||
    currentUser?.full_name ||
    cleanName(
      profileRecord?.first_name,
      profileRecord?.middle_name,
      profileRecord?.last_name,
    ) ||
    "Resident";

  const email =
    profileRecord?.email ||
    registrationRecord?.email ||
    currentUser?.email ||
    "Not available";

  const verificationIdUrl =
    profileRecord?.id_image_url ||
    registrationRecord?.id_image_url ||
    currentUser?.id_image_url ||
    null;

  const displayedPicture =
    removeExistingPicture
      ? null
      : previewUrl || existingPicture;

  const initials = useMemo(
    () => getInitials(fullName),
    [fullName],
  );

  const formChanged = useMemo(() => {
    return (
      form.mobile_number.trim() !==
        initialForm.mobile_number.trim() ||
      form.address.trim() !==
        initialForm.address.trim()
    );
  }, [form, initialForm]);

  const pictureChanged =
    Boolean(selectedPicture) ||
    removeExistingPicture;

  const hasUnsavedChanges =
    formChanged || pictureChanged;

  /* ===========================================================
     FORM HANDLERS
  =========================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
    setWarning("");
  };

  const openPicturePicker = () => {
    if (saving) {
      return;
    }

    setError("");
    setSuccess("");
    setWarning("");

    fileInputRef.current?.click();
  };

  const handlePictureChange = (event) => {
    const file =
      event.target.files?.[0];

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
    setWarning("");

    if (
      !ACCEPTED_IMAGE_TYPES.has(file.type)
    ) {
      setError(
        "Please select a JPG, PNG, or WEBP image.",
      );

      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        "The profile picture must be smaller than 8 MB.",
      );

      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      );
    }

    const objectUrl = URL.createObjectURL(
      file,
    );

    previewUrlRef.current = objectUrl;

    setSelectedPicture(file);
    setPreviewUrl(objectUrl);
    setRemoveExistingPicture(false);
    setImageFailed(false);
  };

  const handleRemovePicture = () => {
    if (saving) {
      return;
    }

    const confirmed = window.confirm(
      "Remove your profile picture when this form is saved?",
    );

    if (!confirmed) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      );

      previewUrlRef.current = null;
    }

    setSelectedPicture(null);
    setPreviewUrl(null);
    setExistingPicture(null);
    setRemoveExistingPicture(true);
    setImageFailed(false);

    setError("");
    setSuccess("");
    setWarning("");
  };

  const handleReset = () => {
    if (saving) {
      return;
    }

    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Discard all unsaved changes on this page?",
      )
    ) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      );

      previewUrlRef.current = null;
    }

    setForm(initialForm);
    setSelectedPicture(null);
    setPreviewUrl(null);
    setRemoveExistingPicture(false);
    setImageFailed(false);

    setError("");
    setSuccess("");
    setWarning("");
  };

  /* ===========================================================
     SAVE PROFILE
  =========================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading) {
      return;
    }

    setError("");
    setSuccess("");
    setWarning("");

    if (!currentUser) {
      setError(
        "Your account session could not be verified. Please log in again.",
      );

      return;
    }

    const mobileNumber =
      form.mobile_number.trim();

    const address = form.address.trim();

    if (
      mobileNumber &&
      mobileNumber.replace(/\D/g, "").length <
        7
    ) {
      setError(
        "Enter a valid mobile number or leave the field blank.",
      );

      return;
    }

    setSaving(true);

    const oldPicture = existingPicture;

    let uploadedFilePath = null;
    let updatedPicture = oldPicture;

    try {
      if (selectedPicture) {
        const uploadResult =
          await uploadProfilePicture({
            file: selectedPicture,
            currentUser,
            authUser,
          });

        uploadedFilePath =
          uploadResult.filePath;

        updatedPicture =
          uploadResult.publicUrl;
      } else if (removeExistingPicture) {
        updatedPicture = null;
      }

      const updatePayload = {
        mobile_number: mobileNumber,
        address,
        profile_picture: updatedPicture,
      };

      const syncResult =
        await syncAccountChanges({
          profile: profileRecord,
          registration:
            registrationRecord,
          currentUser,
          authUser,
          payload: updatePayload,
        });

      /*
       * Update the local session only after at least the
       * primary account record has been updated.
       */
      const updatedLocalUser = {
        ...currentUser,
        ...updatePayload,
        avatar_url: updatedPicture,
      };

      window.localStorage.setItem(
        "currentUser",
        JSON.stringify(updatedLocalUser),
      );

      setCurrentUser(updatedLocalUser);

      /*
       * Remove the previous profile picture only after
       * the new account record was successfully saved.
       */
      if (
        oldPicture &&
        oldPicture !== updatedPicture
      ) {
        const cleanupResult =
          await removeStoredPicture(
            oldPicture,
          );

        if (cleanupResult.error) {
          console.warn(
            "Old profile picture cleanup failed:",
            cleanupResult.error,
          );
        }
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        );

        previewUrlRef.current = null;
      }

      const normalizedForm = {
        mobile_number: mobileNumber,
        address,
      };

      setForm(normalizedForm);
      setInitialForm(normalizedForm);

      setSelectedPicture(null);
      setPreviewUrl(null);
      setExistingPicture(updatedPicture);
      setRemoveExistingPicture(false);
      setImageFailed(false);

      if (syncResult.warnings.length > 0) {
        setWarning(
          `Your primary profile was updated, but one or more secondary records could not be synchronized: ${syncResult.warnings.join(" ")}`,
        );
      }

      setSuccess(
        "Your profile has been updated successfully.",
      );

      if (successTimerRef.current) {
        window.clearTimeout(
          successTimerRef.current,
        );
      }

      successTimerRef.current =
        window.setTimeout(() => {
          navigate("/profile", {
            replace: true,
          });
        }, 1800);
    } catch (saveError) {
      console.error(
        "Profile update failed:",
        saveError,
      );

      /*
       * If the database update failed after a new upload,
       * remove the newly uploaded object to prevent an
       * orphaned file.
       */
      if (uploadedFilePath) {
        await supabase.storage
          .from(PROFILE_BUCKET)
          .remove([uploadedFilePath])
          .catch(() => null);
      }

      setError(
        saveError?.message ||
          "Failed to update your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
     LOADING STATE
  =========================================================== */

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
            Loading profile editor
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Checking your account information...
          </p>
        </div>
      </main>
    );
  }

  /* ===========================================================
     PAGE
  =========================================================== */

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

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl"
      >
        {/* Back button */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              navigate("/profile")
            }
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Profile
          </button>

          {hasUnsavedChanges && !saving && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock3 className="h-3.5 w-3.5" />

              Unsaved Changes
            </span>
          )}
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          {/* Gradient header */}
          <section
            className={`${GRADIENT_CLASS} relative overflow-hidden px-5 py-8 text-white sm:px-8 sm:py-9`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl"
            />

            <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="flex flex-col items-center sm:flex-row sm:gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
                  <Camera className="h-8 w-8" />
                </div>

                <div className="mt-4 sm:mt-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                    SafeResponse Account
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    Edit Profile
                  </h1>

                  <p className="mt-2 text-sm text-blue-50/85">
                    Update your contact information and profile picture.
                  </p>
                </div>
              </div>

              {saving && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm sm:mt-0">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Saving Changes
                </div>
              )}
            </div>
          </section>

          {/* Form body */}
          <div className="space-y-7 p-5 sm:p-8 lg:p-10">
            {/* Messages */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <p className="text-sm font-semibold leading-6">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="text-sm font-black">
                    {success}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                    Returning to your profile page...
                  </p>
                </div>
              </div>
            )}

            {warning && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <Info className="mt-0.5 h-5 w-5 shrink-0" />

                <p className="text-sm font-semibold leading-6">
                  {warning}
                </p>
              </div>
            )}

            {/* Profile picture */}
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                  <Camera className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">
                    Profile Picture
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Upload a clear JPG, PNG, or WEBP image. Maximum file size is 8 MB.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/50 sm:p-6">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700">
                      {displayedPicture &&
                      !imageFailed ? (
                        <img
                          src={displayedPicture}
                          alt={`${fullName} profile picture`}
                          className="h-full w-full object-cover"
                          onError={() =>
                            setImageFailed(true)
                          }
                        />
                      ) : (
                        <span className="text-4xl font-black text-white">
                          {initials}
                        </span>
                      )}

                      {saving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
                          <Loader2 className="h-7 w-7 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {(displayedPicture ||
                      selectedPicture) &&
                      !saving && (
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        aria-label="Remove profile picture"
                        title="Remove profile picture"
                        className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {fullName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {email}
                    </p>

                    <div className="mt-4 flex flex-col justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={openPicturePicker}
                        disabled={saving}
                        className={`${GRADIENT_CLASS} inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}

                        {displayedPicture
                          ? "Change Picture"
                          : "Upload Picture"}
                      </button>

                      {selectedPicture && (
                        <p className="max-w-full truncate text-xs text-slate-500 dark:text-slate-400">
                          Selected: {selectedPicture.name}
                        </p>
                      )}

                      {removeExistingPicture && (
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                          The current picture will be removed when you save.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePictureChange}
                  disabled={saving}
                  className="hidden"
                  aria-label="Choose profile picture"
                />
              </div>
            </section>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Read-only identity */}
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">
                    Account Information
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Your name and email are managed through account verification.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        Account Email
                      </p>

                      <p className="mt-1 break-all text-sm font-black text-blue-950 dark:text-blue-100">
                        {email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/70 dark:bg-violet-950/40">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                        Full Name
                      </p>

                      <p className="mt-1 break-words text-sm font-black text-violet-950 dark:text-violet-100">
                        {fullName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Editable information */}
            <section>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                  <Phone className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">
                    Contact Details
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Keep your mobile number and address current for emergency coordination.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="mobile_number"
                    className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200"
                  >
                    Mobile Number
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="mobile_number"
                      name="mobile_number"
                      type="tel"
                      value={form.mobile_number}
                      onChange={handleChange}
                      placeholder="e.g. 09171234567"
                      autoComplete="tel"
                      disabled={saving}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-indigo-800 dark:focus:bg-slate-950"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    This number may be used by authorized MDRRMO personnel when coordinating your requests.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200"
                  >
                    Complete Address
                  </label>

                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />

                    <textarea
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={4}
                      placeholder="House number, street, barangay, city, province"
                      autoComplete="street-address"
                      disabled={saving}
                      className="min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-indigo-800 dark:focus:bg-slate-950"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Verification ID */}
            {verificationIdUrl && (
              <>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <section>
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                      <ImageIcon className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-black text-slate-800 dark:text-white">
                        Verification ID
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Your submitted identification remains separate from your profile picture.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                    <img
                      src={verificationIdUrl}
                      alt="Submitted verification identification"
                      className="mx-auto max-h-80 w-full rounded-xl object-contain shadow-sm"
                    />
                  </div>
                </section>
              </>
            )}

            {/* Actions */}
            <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={
                    saving ||
                    !hasUnsavedChanges
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
                >
                  <X className="h-4 w-4" />

                  Discard Changes
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/profile")
                  }
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />

                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    !hasUnsavedChanges
                  }
                  className={`${GRADIENT_CLASS} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />

                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </section>

            <p className="text-center text-xs leading-5 text-slate-400 dark:text-slate-500">
              SafeResponse · Your information is used for emergency coordination and service delivery.
            </p>
          </div>
        </div>
      </form>
    </main>
  );
}
