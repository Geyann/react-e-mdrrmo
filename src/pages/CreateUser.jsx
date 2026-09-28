"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import Icon from "../Images/logo.png";
import { supabase } from "../createClient";

/* =============================================================
 * CONFIG
 * ============================================================= */

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const PASSWORD_SALT = "hackerai-salt-2024";
const ID_BUCKET = "pending_ids";
const MAX_ID_FILE_BYTES = 8 * 1024 * 1024;

const USERNAME_PATTERN =
  /^[a-z0-9._-]{3,50}$/;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const INITIAL_FORM = {
  username: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  middleName: "",
  lastName: "",
  age: "",
  address: "",
  mobileNumber: "",
  birthdate: "",
  idNumber: "",
};

/* =============================================================
 * HELPERS
 * ============================================================= */

const clean = (value) =>
  String(value ?? "").trim();

const normalizeUsername = (value) =>
  clean(value).toLowerCase();

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => clean(part))
    .filter(Boolean)
    .join(" ")
    .trim();

const getSafeFileExtension = (file) => {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension) {
    return extension;
  }

  const typeExtensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return typeExtensions[file.type] || "jpg";
};

const getTodayKey = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const createUuid = () => {
  if (
    globalThis.crypto?.randomUUID
  ) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random =
        Math.floor(Math.random() * 16);

      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    },
  );
};

const getPhoneDigits = (value) =>
  String(value ?? "")
    .replace(/\D/g, "");

async function hashPassword(password) {
  if (
    !globalThis.crypto?.subtle
  ) {
    throw new Error(
      "Secure password encryption is not available in this browser.",
    );
  }

  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${password}${PASSWORD_SALT}`,
  );

  const hashBuffer =
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      data,
    );

  return Array.from(
    new Uint8Array(hashBuffer),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

const uploadIdImage = async ({
  file,
  registrationId,
}) => {
  if (!file) {
    return null;
  }

  const safeFileName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);

  const extension =
    getSafeFileExtension(file);

  const filePath =
    `registrations/${registrationId}/${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from(ID_BUCKET)
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
      `ID image upload failed: ${uploadError.message}`,
    );
  }

  const { data: publicData } =
    await supabase.storage
      .from(ID_BUCKET)
      .getPublicUrl(filePath);

  const publicUrl =
    publicData?.publicUrl || null;

  if (!publicUrl) {
    await supabase.storage
      .from(ID_BUCKET)
      .remove([filePath])
      .catch(() => null);

    throw new Error(
      "The uploaded ID image did not receive a public URL.",
    );
  }

  return {
    filePath,
    publicUrl,
  };
};

/* =============================================================
 * REUSABLE UI
 * ============================================================= */

function FieldError({ children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function FormField({
  id,
  label,
  icon: IconComponent,
  required = false,
  hint,
  error,
  className = "",
  children,
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"
      >
        {IconComponent && (
          <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        )}

        <span>{label}</span>

        {required && (
          <span className="text-rose-500">*</span>
        )}
      </label>

      {children}

      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  show,
  onToggle,
  onChange,
  error,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"
      >
        <LockKeyhole className="h-4 w-4 text-blue-600 dark:text-blue-300" />

        <span>{label}</span>

        <span className="text-rose-500">*</span>
      </label>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          aria-describedby={
            error ? `${id}-error` : undefined
          }
          className={`min-h-12 w-full rounded-2xl border bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10 ${
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-300 focus:border-purple-500"
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show
              ? `Hide ${label}`
              : `Show ${label}`
          }
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          {show ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/* =============================================================
 * CREATE USER PAGE
 * ============================================================= */

export default function CreateUser() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const successTimerRef = useRef(null);

  const [formData, setFormData] =
    useState({
      ...INITIAL_FORM,
    });

  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] =
    useState(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState({});

  /* ===========================================================
     CLEAN UP TEMPORARY PREVIEW AND TIMER
  =========================================================== */

  useEffect(() => {
    return () => {
      if (idPreview) {
        URL.revokeObjectURL(idPreview);
      }

      if (successTimerRef.current) {
        window.clearTimeout(
          successTimerRef.current,
        );
      }
    };
  }, [idPreview]);

  /* ===========================================================
     HANDLE FIELD CHANGES
  =========================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const nextValue =
        name === "username"
          ? value
              .toLowerCase()
              .replace(/\s+/g, "")
          : value;

      return {
        ...previous,
        [name]: nextValue,
      };
    });

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setError("");
    setSuccess("");
  };

  /* ===========================================================
     HANDLE ID FILE
  =========================================================== */

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    /*
     * Reset the input so selecting the same file again
     * still triggers a change event.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !ACCEPTED_IMAGE_TYPES.has(file.type)
    ) {
      setFieldErrors((previous) => ({
        ...previous,
        idFile:
          "Please select a JPG, PNG, or WEBP image.",
      }));

      setError("");
      return;
    }

    if (file.size > MAX_ID_FILE_BYTES) {
      setFieldErrors((previous) => ({
        ...previous,
        idFile:
          "The ID image must be smaller than 8 MB.",
      }));

      setError("");
      return;
    }

    if (idPreview) {
      URL.revokeObjectURL(idPreview);
    }

    setIdFile(file);
    setIdPreview(
      URL.createObjectURL(file),
    );

    setFieldErrors((previous) => ({
      ...previous,
      idFile: "",
    }));

    setError("");
    setSuccess("");
  };

  const clearIdFile = () => {
    if (idPreview) {
      URL.revokeObjectURL(idPreview);
    }

    setIdFile(null);
    setIdPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFieldErrors((previous) => ({
      ...previous,
      idFile: "",
    }));
  };

  /* ===========================================================
     VALIDATION
  =========================================================== */

  const validateForm = () => {
    const errors = {};

    const username =
      normalizeUsername(formData.username);

    const firstName =
      clean(formData.firstName);

    const lastName =
      clean(formData.lastName);

    const mobileNumber =
      clean(formData.mobileNumber);

    const phoneDigits =
      getPhoneDigits(mobileNumber);

    const address = clean(formData.address);
    const idNumber = clean(formData.idNumber);
    const age = Number(formData.age);
    const birthdate = formData.birthdate;

    if (
      !USERNAME_PATTERN.test(username)
    ) {
      errors.username =
        "Use 3–50 letters, numbers, dots, underscores, or hyphens.";
    }

    if (username.length < 3) {
      errors.username =
        "Username must be at least 3 characters.";
    }

    if (!firstName) {
      errors.firstName =
        "First name is required.";
    }

    if (!lastName) {
      errors.lastName =
        "Last name is required.";
    }

    if (
      !formData.password ||
      formData.password.length < 6
    ) {
      errors.password =
        "Password must be at least 6 characters.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      errors.confirmPassword =
        "Passwords do not match.";
    }

    if (
      !Number.isInteger(age) ||
      age < 1 ||
      age > 150
    ) {
      errors.age =
        "Enter a valid age between 1 and 150.";
    }

    if (!birthdate) {
      errors.birthdate =
        "Birthdate is required.";
    } else {
      const selectedDate =
        new Date(`${birthdate}T00:00:00`);

      if (
        Number.isNaN(
          selectedDate.getTime(),
        )
      ) {
        errors.birthdate =
          "Enter a valid birthdate.";
      } else if (
        selectedDate.getTime() >
        Date.now()
      ) {
        errors.birthdate =
          "Birthdate cannot be in the future.";
      }
    }

    if (!idNumber) {
      errors.idNumber =
        "Valid ID number is required.";
    }

    if (!idFile) {
      errors.idFile =
        "Please upload a photo of your valid ID.";
    }

    if (!mobileNumber) {
      errors.mobileNumber =
        "Mobile number is required.";
    } else if (
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      errors.mobileNumber =
        "Enter a valid mobile number.";
    }

    if (!address) {
      errors.address =
        "Complete address is required.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /* ===========================================================
     REGISTER
  =========================================================== */

  const handleRegister = async (
    event,
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const username =
      normalizeUsername(formData.username);

    const generatedEmail =
      `${username}@local.user`;

    const registrationId = createUuid();

    let uploadedPath = null;

    try {
      /*
       * Check the username before uploading a file.
       *
       * Some Supabase projects do not allow public reads
       * from pending_registrations. If the lookup is
       * blocked, the insert below remains the final
       * source of truth.
       */
      const {
        data: existingUsername,
        error: usernameLookupError,
      } = await supabase
        .from("pending_registrations")
        .select("id, username")
        .eq("username", username)
        .maybeSingle();

      if (usernameLookupError) {
        console.warn(
          "Username lookup could not be completed:",
          usernameLookupError,
        );
      }

      if (existingUsername) {
        throw new Error(
          "That username is already taken. Please choose another username.",
        );
      }

      const {
        data: existingEmail,
        error: emailLookupError,
      } = await supabase
        .from("pending_registrations")
        .select("id, email")
        .eq("email", generatedEmail)
        .maybeSingle();

      if (emailLookupError) {
        console.warn(
          "Email lookup could not be completed:",
          emailLookupError,
        );
      }

      if (existingEmail) {
        throw new Error(
          "An account already exists for this username.",
        );
      }

      const uploaded =
        await uploadIdImage({
          file: idFile,
          registrationId,
        });

      if (uploaded) {
        uploadedPath = uploaded.filePath;
      }

      const hashedPassword =
        await hashPassword(
          formData.password,
        );

      const registration = {
        id: registrationId,
        user_id: registrationId,

        username,
        password: hashedPassword,
        email: generatedEmail,

        first_name:
          clean(formData.firstName),

        middle_name:
          clean(formData.middleName),

        last_name:
          clean(formData.lastName),

        age: Number(formData.age),

        address:
          clean(formData.address),

        mobile_number:
          clean(formData.mobileNumber),

        birthdate: formData.birthdate,

        id_number:
          clean(formData.idNumber),

        id_image_url:
          uploaded?.publicUrl || null,

        status: "pending",
        role: "user",
      };

      const { error: dbError } =
        await supabase
          .from("pending_registrations")
          .insert([registration]);

      if (dbError) {
        const message =
          dbError.message || "";

        if (
          message.includes("username") ||
          dbError.code === "23505"
        ) {
          throw new Error(
            "That username is already taken. Please choose another username.",
          );
        }

        if (
          message.includes("email") ||
          dbError.code === "23505"
        ) {
          throw new Error(
            "An account already exists for this username.",
          );
        }

        if (
          message.toLowerCase().includes(
            "row-level security",
          ) ||
          dbError.code === "42501"
        ) {
          throw new Error(
            "Registration could not be submitted because the database registration policy is not enabled for this account. Please contact the administrator.",
          );
        }

        throw new Error(
          message ||
            "Unable to create your account.",
        );
      }

      setSuccess(
        "Your account request was submitted successfully. Wait for administrator approval before signing in.",
      );

      setFormData({
        ...INITIAL_FORM,
      });

      setIdFile(null);
      setIdPreview(null);
      setFieldErrors({});

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (formRef.current) {
        formRef.current.reset();
      }

      if (successTimerRef.current) {
        window.clearTimeout(
          successTimerRef.current,
        );
      }

      successTimerRef.current =
        window.setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              message:
                "Your account is pending administrator approval. You can sign in after approval.",
            },
          });
        }, 2200);
    } catch (registrationError) {
      console.error(
        "Registration failed:",
        registrationError,
      );

      /*
       * If a new image was uploaded but the
       * database insert failed, remove the
       * orphaned image.
       */
      if (uploadedPath) {
        await supabase.storage
          .from(ID_BUCKET)
          .remove([uploadedPath])
          .catch(() => null);
      }

      setError(
        registrationError?.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===========================================================
     GENERATED VALUES
  =========================================================== */

  const normalizedUsername =
    normalizeUsername(formData.username);

  const generatedEmail =
    normalizedUsername
      ? `${normalizedUsername}@local.user`
      : "username@local.user";

  const passwordMatches =
    Boolean(formData.confirmPassword) &&
    formData.password ===
      formData.confirmPassword;

  const passwordLengthValid =
    formData.password.length >= 6;

  /* ===========================================================
     RENDER
  =========================================================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-blue-6 to-purple-700 px-4 py-6 sm:px-6 lg:px-8">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-purple-400/35 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 sm:left-7 sm:top-7"
      >
        <ArrowLeft className="h-4 w-4" />

        Back to Home
      </button>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center py-16">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl shadow-blue-950/30 lg:grid-cols-[0.95fr_1.05fr]">
          {/* =================================================
              BRAND PANEL
          ================================================= */}

          <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 p-8 text-white sm:p-10 lg:p-12">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            />

            <div
              aria-hidden="true"
              className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-purple-400/20 blur-2xl"
            />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-md">
                  <img
                    src={Icon}
                    alt="SafeResponse Logo"
                    className="h-8 w-8 object-contain"
                  />
                </div>

                <div>
                  <p className="text-xl font-black">
                    SafeResponse
                  </p>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                    Naic Community Portal
                  </p>
                </div>
              </div>

              <div className="mt-12 lg:mt-20">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-50">
                  <CheckCircle2 className="h-4 w-4" />

                  Resident registration
                </span>

                <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Join your safer
                  community.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/80 sm:text-base">
                  Create your resident account to request emergency assistance, submit reports, and track your services through SafeResponse.
                </p>
              </div>

              <div className="mt-10 space-y-3 lg:mt-auto">
                {[
                  "Submit emergency and hazard reports",
                  "Request appointments and check-ups",
                  "Monitor your submitted requests",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-sm text-blue-50/90"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 border-t border-white/15 pt-5 text-xs text-blue-100/75">
                <ShieldCheck className="h-4 w-4" />

                Your account will be reviewed by an administrator before access is activated.
              </div>
            </div>
          </section>

          {/* =================================================
              FORM PANEL
          ================================================= */}

          <section className="max-h-[calc(100vh-7rem)] overflow-y-auto p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-2xl">
              {/* Form heading */}
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20">
                  <UserPlus className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Create resident account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fill in your details below. Fields marked with an asterisk are required.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <p className="text-sm font-semibold leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <p className="text-sm font-semibold leading-5 text-emerald-700">
                    {success}
                  </p>
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={handleRegister}
                noValidate
                className="space-y-5"
              >
                {/* Username */}
                <FormField
                  id="username"
                  label="Username"
                  icon={UserRound}
                  required
                  hint="Use 3–50 letters, numbers, dots, underscores, or hyphens."
                  error={fieldErrors.username}
                >
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choose a unique username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={50}
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

                {/* Generated login email */}
                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div className="min-w-0">
                    <p className="text-sm font-black text-blue-900">
                      Reserved login email
                    </p>

                    <p className="mt-1 break-all text-xs font-semibold text-blue-700">
                      {generatedEmail}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-blue-600">
                      This account uses your username for local login. An administrator can update the email record if needed.
                    </p>
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <FormField
                    id="firstName"
                    label="First Name"
                    icon={UserRound}
                    required
                    error={fieldErrors.firstName}
                  >
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      autoComplete="given-name"
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </FormField>

                  <FormField
                    id="middleName"
                    label="Middle Name"
                    icon={UserRound}
                  >
                    <input
                      id="middleName"
                      name="middleName"
                      type="text"
                      value={formData.middleName}
                      onChange={handleChange}
                      placeholder="Middle name"
                      autoComplete="additional-name"
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </FormField>

                  <FormField
                    id="lastName"
                    label="Last Name"
                    icon={UserRound}
                    required
                    error={fieldErrors.lastName}
                  >
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      autoComplete="family-name"
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </FormField>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PasswordField
                    id="password"
                    label="Password"
                    value={formData.password}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword((visible) => !visible)
                    }
                    onChange={handleChange}
                    error={fieldErrors.password}
                  />

                  <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={formData.confirmPassword}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(
                        (visible) => !visible,
                      )
                    }
                    onChange={handleChange}
                    error={fieldErrors.confirmPassword}
                  />
                </div>

                {/* Password checklist */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      passwordLengthValid
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {passwordLengthValid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}

                    At least 6 characters
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      passwordMatches
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {passwordMatches ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}

                    Passwords match
                  </span>
                </div>

                {/* Age and birthdate */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    id="age"
                    label="Age"
                    icon={CalendarDays}
                    required
                    error={fieldErrors.age}
                  >
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="age"
                        name="age"
                        type="number"
                        min="1"
                        max="150"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="Enter your age"
                        disabled={loading}
                        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                      />
                    </div>
                  </FormField>

                  <FormField
                    id="birthdate"
                    label="Birthdate"
                    icon={CalendarDays}
                    required
                    error={fieldErrors.birthdate}
                  >
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="birthdate"
                        name="birthdate"
                        type="date"
                        max={getTodayKey()}
                        value={formData.birthdate}
                        onChange={handleChange}
                        disabled={loading}
                        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                      />
                    </div>
                  </FormField>
                </div>

                {/* ID number */}
                <FormField
                  id="idNumber"
                  label="Valid ID Number"
                  icon={IdCard}
                  required
                  hint="Enter the ID number exactly as shown on your government-issued ID."
                  error={fieldErrors.idNumber}
                >
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="idNumber"
                      name="idNumber"
                      type="text"
                      value={formData.idNumber}
                      onChange={handleChange}
                      placeholder="e.g. Passport or Driver's License No."
                      autoComplete="off"
                      maxLength={100}
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

                {/* ID picture */}
                <div>
                  <label
                    htmlFor="id-picture-input"
                    className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"
                  >
                    <Camera className="h-4 w-4 text-blue-600 dark:text-blue-300" />

                    <span>ID Picture</span>

                    <span className="text-rose-500">*</span>
                  </label>

                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    {idPreview ? (
                      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-blue-100 shadow-md">
                          <img
                            src={idPreview}
                            alt="Selected ID preview"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <p className="truncate text-sm font-black text-slate-800 dark:text-white">
                            {idFile?.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Image selected successfully.
                          </p>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <label
                              htmlFor="id-picture-input"
                              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                            >
                              <Upload className="h-4 w-4" />

                              Change image
                            </label>

                            <button
                              type="button"
                              onClick={clearIdFile}
                              disabled={loading}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />

                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="id-picture-input"
                        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl p-5 text-center"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                          <Camera className="h-7 w-7" />
                        </div>

                        <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
                          Upload your valid ID
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Take a photo or choose a JPG, PNG, or WEBP file.
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          Maximum file size: 8 MB
                        </p>
                      </label>
                    )}

                    <input
                      ref={fileInputRef}
                      id="id-picture-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      disabled={loading}
                      className="hidden"
                    />
                  </div>

                  <FieldError>
                    {fieldErrors.idFile}
                  </FieldError>
                </div>

                {/* Mobile number */}
                <FormField
                  id="mobileNumber"
                  label="Mobile Number"
                  icon={Phone}
                  required
                  hint="Use an active number that MDRRMO personnel may contact during emergencies."
                  error={fieldErrors.mobileNumber}
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      placeholder="e.g. 09171234567"
                      autoComplete="tel"
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

                {/* Address */}
                <FormField
                  id="address"
                  label="Complete Address"
                  icon={MapPin}
                  required
                  hint="Include your house number, street, barangay, city, and province."
                  error={fieldErrors.address}
                >
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />

                    <textarea
                      id="address"
                      name="address"
                      rows={4}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="House number, street, barangay, city, province"
                      autoComplete="street-address"
                      disabled={loading}
                      className="min-h-32 w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

                {/* Notice */}
                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                  <p className="text-xs leading-5 text-blue-800">
                    After you submit this form, an administrator must review and approve your account before you can sign in. Emergency requests should be submitted through the official MDRRMO channels while your account is pending.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                

                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex min-h-12 flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />

                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />

                        Create Account

                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    disabled={loading}
                    className="font-black text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Login here
                  </button>
                </p>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  SafeResponse · Naic Community Portal
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
