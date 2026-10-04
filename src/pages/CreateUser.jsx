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
  ChevronDown,
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
const MAX_CAPTURE_DIMENSION = 1920;

const USERNAME_PATTERN = /^[a-z0-9._-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ID_TYPE_OPTIONS = [
  {
    value: "philippine-passport",
    label: "Philippine Passport",
  },
  {
    value: "drivers-license",
    label: "Driver's License / LTO ID",
  },
  {
    value: "philsys-id",
    label: "PhilSys ID",
  },
  {
    value: "umid",
    label: "UMID",
  },
  {
    value: "barangay-id",
    label: "Barangay ID",
  },
  {
    value: "voter-id",
    label: "Voter ID",
  },
  {
    value: "philhealth-id",
    label: "PhilHealth ID",
  },
  {
    value: "postal-id",
    label: "Postal ID",
  },
  {
    value: "tin",
    label: "Tax Identification Number (TIN)",
  },
  {
    value: "school-id",
    label: "School ID",
  },
  {
    value: "other-valid-id",
    label: "Other Valid ID",
  },
];

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  middleName: "",
  lastName: "",
  age: "",
  address: "",
  mobileNumber: "",
  birthdate: "",
  idType: "",
  idNumber: "",
};

const INITIAL_ID_FILES = {
  front: null,
  back: null,
  holder: null,
};

const INITIAL_ID_PREVIEWS = {
  front: null,
  back: null,
  holder: null,
};

const ID_UPLOAD_FIELDS = [
  {
    key: "front",
    inputId: "id-front-input",
    label: "Front Side of ID",
    description:
      "Upload a clear and complete image of the front side of your valid ID.",
    icon: IdCard,
    cameraOnly: false,
  },
  {
    key: "back",
    inputId: "id-back-input",
    label: "Back Side of ID",
    description:
      "Upload a clear and complete image of the back side of your valid ID.",
    icon: IdCard,
    cameraOnly: false,
  },
  {
    key: "holder",
    inputId: null,
    label: "Person Holding ID Photo",
    description:
      "Capture a clear photo of yourself while holding your valid ID. Your face and the ID must both be visible.",
    icon: UserRound,
    cameraOnly: true,
  },
];

const FILE_UPLOAD_FIELDS =
  ID_UPLOAD_FIELDS.filter(
    ({ cameraOnly }) => !cameraOnly,
  );

/* =============================================================
 * HELPERS
 * ============================================================= */

const clean = (value) =>
  String(value ?? "").trim();

const normalizeUsername = (value) =>
  clean(value).toLowerCase();

const getFieldByKey = (key) =>
  ID_UPLOAD_FIELDS.find(
    (field) => field.key === key,
  );

const getSafeFileExtension = (file) => {
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
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const createUuid = () => {
  if (
    typeof globalThis.crypto?.randomUUID === "function"
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

const createRandomPart = () => {
  if (
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID().slice(0, 8);
  }

  return Math.random()
    .toString(36)
    .slice(2, 10);
};

const getPhoneDigits = (value) =>
  String(value ?? "").replace(/\D/g, "");

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) {
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

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

/**
 * Uploads all three identity-verification images.
 *
 * If one upload fails, previously uploaded images
 * are automatically removed.
 */
const uploadIdImages = async ({
  files,
  registrationId,
}) => {
  const uploadedImages = {};
  const uploadedPaths = [];

  try {
    for (const field of ID_UPLOAD_FIELDS) {
      const file = files[field.key];

      if (!file) {
        throw new Error(
          `${field.label} is required.`,
        );
      }

      if (
        !ACCEPTED_IMAGE_TYPES.has(file.type)
      ) {
        throw new Error(
          `${field.label} must be a JPG, PNG, or WEBP image.`,
        );
      }

      if (file.size > MAX_ID_FILE_BYTES) {
        throw new Error(
          `${field.label} must be smaller than 8 MB.`,
        );
      }

      const extension =
        getSafeFileExtension(file);

      const randomPart =
        createRandomPart();

      const filePath =
        `registrations/${registrationId}/${field.key}/${Date.now()}-${randomPart}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from(ID_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) {
        throw new Error(
          `${field.label} upload failed: ${uploadError.message}`,
        );
      }

      uploadedPaths.push(filePath);

      const {
        data: publicData,
        error: publicUrlError,
      } =
        await supabase.storage
          .from(ID_BUCKET)
          .getPublicUrl(filePath);

      if (publicUrlError) {
        throw new Error(
          `${field.label} could not be processed: ${publicUrlError.message}`,
        );
      }

      const publicUrl =
        publicData?.publicUrl || null;

      if (!publicUrl) {
        throw new Error(
          `${field.label} did not receive a valid URL.`,
        );
      }

      uploadedImages[field.key] = {
        filePath,
        publicUrl,
      };
    }

    return uploadedImages;
  } catch (uploadError) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } =
        await supabase.storage
          .from(ID_BUCKET)
          .remove(uploadedPaths);

      if (cleanupError) {
        console.warn(
          "Unable to clean up incomplete ID uploads:",
          cleanupError,
        );
      }
    }

    throw uploadError;
  }
};

/* =============================================================
 * FORM COMPONENTS
 * ============================================================= */

function FieldError({ children }) {
  if (!children) {
    return null;
  }

  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
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
  disabled,
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
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : undefined
          }
          className={`min-h-12 w-full rounded-2xl border bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200 ${
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-300 focus:border-purple-500"
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={
            show
              ? `Hide ${label}`
              : `Show ${label}`
          }
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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

function IdImageUploadField({
  id,
  label,
  description,
  icon: IconComponent,
  file,
  preview,
  inputRef,
  error,
  disabled,
  onChange,
  onRemove,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"
      >
        <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-300" />

        <span>{label}</span>

        <span className="text-rose-500">*</span>
      </label>

      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
        {preview ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-blue-100 shadow-md">
              <img
                src={preview}
                alt={`${label} preview`}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="truncate text-sm font-black text-slate-800 dark:text-white">
                {file?.name}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Image selected successfully.
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label
                  htmlFor={id}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                >
                  <Upload className="h-4 w-4" />

                  Change image
                </label>

                <button
                  type="button"
                  onClick={onRemove}
                  disabled={disabled}
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
            htmlFor={id}
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl p-5 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <Camera className="h-7 w-7" />
            </div>

            <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
              Upload {label.toLowerCase()}
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>

            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              JPG, PNG, or WEBP · Maximum 8 MB
            </p>
          </label>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      <FieldError>{error}</FieldError>
    </div>
  );
}

/* =============================================================
 * CAMERA CAPTURE MODAL
 * ============================================================= */

function CameraCaptureModal({
  onClose,
  onCapture,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] =
    useState("starting");

  const [cameraError, setCameraError] =
    useState("");

  /*
   * Request access to the front-facing camera.
   */
  useEffect(() => {
    let isActive = true;

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      streamRef.current = null;
    };

    const startCamera = async () => {
      try {
        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error(
            "Camera access is not supported by this browser.",
          );
        }

        if (!window.isSecureContext) {
          throw new Error(
            "Camera access requires HTTPS or localhost.",
          );
        }

        const mediaStream =
          await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: {
                ideal: "user",
              },
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
            },
          });

        if (!isActive) {
          mediaStream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        streamRef.current = mediaStream;

        if (!videoRef.current) {
          throw new Error(
            "The camera preview could not be displayed.",
          );
        }

        videoRef.current.srcObject =
          mediaStream;

        await videoRef.current.play();

        if (isActive) {
          setCameraStatus("ready");
        }
      } catch (cameraException) {
        if (!isActive) {
          return;
        }

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => track.stop());

          streamRef.current = null;
        }

        let errorMessage =
          "Unable to open the camera. Please check your device and browser permissions.";

        if (
          cameraException.name === "NotAllowedError"
        ) {
          errorMessage =
            "Camera permission was denied. Allow camera access in your browser settings and try again.";
        }

        if (
          cameraException.name === "NotFoundError"
        ) {
          errorMessage =
            "No available camera was found on this device.";
        }

        if (
          cameraException.name === "NotReadableError"
        ) {
          errorMessage =
            "The camera may already be in use by another application.";
        }

        if (
          cameraException.name === "SecurityError"
        ) {
          errorMessage =
            "Camera access was blocked. Make sure the website is running on HTTPS or localhost.";
        }

        setCameraError(errorMessage);
        setCameraStatus("error");
      }
    };

    startCamera();

    return () => {
      isActive = false;
      stopCamera();

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  /*
   * Prevent background scrolling while the camera is open.
   */
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  /*
   * Allow Escape to close the camera.
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [onClose]);

  const capturePhoto = async () => {
    const video = videoRef.current;

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError(
        "The camera is not ready yet. Please wait a moment and try again.",
      );

      return;
    }

    setCameraStatus("capturing");
    setCameraError("");

    try {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      /*
       * Limit the captured dimensions so the resulting
       * file does not become unnecessarily large.
       */
      const scale = Math.min(
        1,
        MAX_CAPTURE_DIMENSION /
          Math.max(sourceWidth, sourceHeight),
      );

      const canvas =
        document.createElement("canvas");

      canvas.width = Math.round(
        sourceWidth * scale,
      );

      canvas.height = Math.round(
        sourceHeight * scale,
      );

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Unable to process the captured photo.",
        );
      }

      /*
       * Save the original camera orientation so text
       * on the ID is not reversed.
       */
      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.9,
          );
        },
      );

      if (!blob) {
        throw new Error(
          "The photo could not be captured. Please try again.",
        );
      }

      const capturedFile = new File(
        [blob],
        `person-holding-id-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        },
      );

      onCapture(capturedFile);
    } catch (captureException) {
      setCameraError(
        captureException?.message ||
          "The photo could not be captured. Please try again.",
      );

      setCameraStatus("ready");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-capture-title"
        className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/15 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Camera className="h-5 w-5" />
            </div>

            <div>
              <h3
                id="camera-capture-title"
                className="text-base font-black text-slate-900"
              >
                Capture Person Holding ID
              </h3>

              <p className="text-xs text-slate-500">
                Your face and ID must be clearly visible.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera preview */}
        <div className="p-5">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
              className="h-full w-full scale-x-[-1] object-cover"
            />

            {/* Loading state */}
            {cameraStatus === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-center text-white">
                <Loader2 className="h-9 w-9 animate-spin" />

                <p className="mt-3 text-sm font-black">
                  Starting camera...
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-300">
                  Allow camera access when your browser
                  asks for permission.
                </p>
              </div>
            )}

            {/* Error state */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
                <AlertCircle className="h-10 w-10 text-rose-400" />

                <p className="mt-3 max-w-md text-sm font-bold leading-6 text-white">
                  {cameraError}
                </p>

                <p className="mt-2 max-w-md text-xs leading-5 text-slate-300">
                  Camera access works on HTTPS websites
                  and localhost. You may also need to
                  reload the page after changing browser
                  permissions.
                </p>
              </div>
            )}

            {/* Capture guide */}
            {!cameraError &&
              cameraStatus === "ready" && (
                <div className="pointer-events-none absolute inset-5 rounded-3xl border-2 border-white/70 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]">
                  <span className="absolute -top-7 left-0 rounded bg-slate-950/60 px-2 py-1 text-xs font-bold text-white">
                    Keep your face and ID inside the frame
                  </span>
                </div>
              )}

            {/* Processing state */}
            {cameraStatus === "capturing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-950/80 px-5 py-3 text-sm font-bold text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />

                  Processing photo...
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs leading-5 text-blue-800">
              Hold your government-issued ID beside your
              face. Make sure your full face, ID number,
              ID picture, and other important details are
              clear and not covered.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={capturePhoto}
            disabled={
              cameraStatus !== "ready" ||
              Boolean(cameraError)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cameraStatus === "capturing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />

                Processing...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />

                Capture Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
 * CAMERA-ONLY ID HOLDER FIELD
 * ============================================================= */

function IdHolderCameraField({
  file,
  preview,
  error,
  disabled,
  onCapture,
  onRemove,
}) {
  const [cameraOpen, setCameraOpen] =
    useState(false);

  const openCamera = () => {
    if (!disabled) {
      setCameraOpen(true);
    }
  };

  return (
    <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <UserRound className="h-4 w-4 text-blue-600 dark:text-blue-300" />

          <span>Person Holding ID Photo</span>

          <span className="text-rose-500">*</span>
        </div>

        {preview ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <img
                src={preview}
                alt="Person holding ID preview"
                className="h-80 w-full object-contain"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-800">
                  {file?.name}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />

                  Photo captured successfully
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={disabled}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />

                  Retake Photo
                </button>

                <button
                  type="button"
                  onClick={onRemove}
                  disabled={disabled}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />

                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openCamera}
            disabled={disabled}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-md">
              <Camera className="h-8 w-8" />
            </div>

            <p className="mt-4 text-sm font-black text-slate-800">
              Capture Photo with Camera
            </p>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              Open your device camera and take a clear
              photo of yourself while holding your valid
              government-issued ID.
            </p>

            <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-blue-600/20">
              <Camera className="h-4 w-4" />

              Open Camera
            </span>
          </button>
        )}

        <FieldError>{error}</FieldError>
      </div>

      {cameraOpen && (
        <CameraCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={(capturedFile) => {
            onCapture(capturedFile);
            setCameraOpen(false);
          }}
        />
      )}
    </>
  );
}

/* =============================================================
 * CREATE USER PAGE
 * ============================================================= */

export default function CreateUser() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const successTimerRef = useRef(null);

  const fileInputRefs = useRef({
    front: null,
    back: null,
    holder: null,
  });

  const previewUrlsRef = useRef({
    front: null,
    back: null,
    holder: null,
  });

  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
  });

  const [idFiles, setIdFiles] = useState({
    ...INITIAL_ID_FILES,
  });

  const [idPreviews, setIdPreviews] = useState({
    ...INITIAL_ID_PREVIEWS,
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  /* ===========================================================
     CLEAN UP IMAGE PREVIEWS AND TIMER
  =========================================================== */

  useEffect(() => {
    return () => {
      Object.values(
        previewUrlsRef.current,
      ).forEach((previewUrl) => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      });

      if (successTimerRef.current) {
        window.clearTimeout(
          successTimerRef.current,
        );
      }
    };
  }, []);

  /* ===========================================================
     HANDLE FIELD CHANGES
  =========================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      let nextValue = value;

      if (name === "username") {
        nextValue = value
          .toLowerCase()
          .replace(/\s+/g, "");
      }

      if (name === "email") {
        nextValue = value
          .trim()
          .toLowerCase();
      }

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
     SET AND VALIDATE A SELECTED ID IMAGE
  =========================================================== */

  const setSelectedIdImage = (
    file,
    imageType,
  ) => {
    const field = getFieldByKey(imageType);
    const errorKey = `${imageType}IdFile`;
    const fieldLabel =
      field?.label || "Identity image";

    if (!(file instanceof Blob)) {
      return;
    }

    if (
      !ACCEPTED_IMAGE_TYPES.has(file.type)
    ) {
      setFieldErrors((previous) => ({
        ...previous,
        [errorKey]:
          "Please select a JPG, PNG, or WEBP image.",
      }));

      setError("");
      return;
    }

    if (file.size > MAX_ID_FILE_BYTES) {
      setFieldErrors((previous) => ({
        ...previous,
        [errorKey]:
          `${fieldLabel} must be smaller than 8 MB.`,
      }));

      setError("");
      return;
    }

    const oldPreview =
      previewUrlsRef.current[imageType];

    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    previewUrlsRef.current[imageType] =
      previewUrl;

    setIdFiles((previous) => ({
      ...previous,
      [imageType]: file,
    }));

    setIdPreviews((previous) => ({
      ...previous,
      [imageType]: previewUrl,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [errorKey]: "",
    }));

    setError("");
    setSuccess("");
  };

  /* ===========================================================
     HANDLE FRONT AND BACK ID FILE INPUTS
  =========================================================== */

  const handleIdFileChange = (
    event,
    imageType,
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

    setSelectedIdImage(file, imageType);
  };

  /* ===========================================================
     HANDLE CAMERA CAPTURE
  =========================================================== */

  const handleHolderCapture = (
    capturedFile,
  ) => {
    setSelectedIdImage(
      capturedFile,
      "holder",
    );
  };

  /* ===========================================================
     REMOVE IMAGE
  =========================================================== */

  const clearIdFile = (imageType) => {
    const previewUrl =
      previewUrlsRef.current[imageType];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    previewUrlsRef.current[imageType] = null;

    const inputRef =
      fileInputRefs.current[imageType];

    if (inputRef) {
      inputRef.value = "";
    }

    setIdFiles((previous) => ({
      ...previous,
      [imageType]: null,
    }));

    setIdPreviews((previous) => ({
      ...previous,
      [imageType]: null,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [`${imageType}IdFile`]: "",
    }));
  };

  const clearAllIdFiles = () => {
    Object.keys(INITIAL_ID_FILES).forEach(
      (imageType) => {
        const previewUrl =
          previewUrlsRef.current[imageType];

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        previewUrlsRef.current[imageType] =
          null;

        const inputRef =
          fileInputRefs.current[imageType];

        if (inputRef) {
          inputRef.value = "";
        }
      },
    );

    setIdFiles({
      ...INITIAL_ID_FILES,
    });

    setIdPreviews({
      ...INITIAL_ID_PREVIEWS,
    });
  };

  /* ===========================================================
     VALIDATION
  =========================================================== */

  const validateForm = () => {
    const errors = {};

    const username =
      normalizeUsername(formData.username);

    const email =
      clean(formData.email).toLowerCase();

    const firstName =
      clean(formData.firstName);

    const lastName =
      clean(formData.lastName);

    const mobileNumber =
      clean(formData.mobileNumber);

    const phoneDigits =
      getPhoneDigits(mobileNumber);

    const address = clean(formData.address);
    const idType = clean(formData.idType);
    const idNumber = clean(formData.idNumber);
    const age = Number(formData.age);
    const birthdate = formData.birthdate;

    if (!USERNAME_PATTERN.test(username)) {
      errors.username =
        "Use 3–50 letters, numbers, dots, underscores, or hyphens.";
    }

    if (username.length < 3) {
      errors.username =
        "Username must be at least 3 characters.";
    }

    if (!email) {
      errors.email =
        "Email address is required.";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email =
        "Enter a valid email address.";
    } else if (email.length > 254) {
      errors.email =
        "Email address is too long.";
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
        Number.isNaN(selectedDate.getTime())
      ) {
        errors.birthdate =
          "Enter a valid birthdate.";
      } else if (
        selectedDate.getTime() > Date.now()
      ) {
        errors.birthdate =
          "Birthdate cannot be in the future.";
      }
    }

    if (!idType) {
      errors.idType =
        "Please select the type of ID.";
    } else if (
      !ID_TYPE_OPTIONS.some(
        (option) => option.value === idType,
      )
    ) {
      errors.idType =
        "Please select a valid ID type.";
    }

    if (!idNumber) {
      errors.idNumber =
        "Valid ID number is required.";
    }

    if (!idFiles.front) {
      errors.frontIdFile =
        "Please upload the front side of your valid ID.";
    }

    if (!idFiles.back) {
      errors.backIdFile =
        "Please upload the back side of your valid ID.";
    }

    if (!idFiles.holder) {
      errors.holderIdFile =
        "Please capture a photo of yourself holding your valid ID.";
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

  const handleRegister = async (event) => {
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

    const email =
      clean(formData.email).toLowerCase();

    const idType =
      clean(formData.idType);

    const registrationId =
      createUuid();

    let uploadedPaths = [];

    try {
      /*
       * Check username before uploading images.
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

      /*
       * Check email before uploading images.
       */
      const {
        data: existingEmail,
        error: emailLookupError,
      } = await supabase
        .from("pending_registrations")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (emailLookupError) {
        console.warn(
          "Email lookup could not be completed:",
          emailLookupError,
        );
      }

      if (existingEmail) {
        throw new Error(
          "An account with this email already exists.",
        );
      }

      /*
       * Upload:
       * 1. Front side of ID
       * 2. Back side of ID
       * 3. Camera-captured person holding ID
       */
      const uploadedImages =
        await uploadIdImages({
          files: idFiles,
          registrationId,
        });

      uploadedPaths =
        Object.values(uploadedImages).map(
          (image) => image.filePath,
        );

      const hashedPassword =
        await hashPassword(formData.password);

      const registration = {
        id: registrationId,
        user_id: registrationId,

        username,
        email,
        password: hashedPassword,

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

        birthdate:
          formData.birthdate,

        id_type: idType,

        id_number:
          clean(formData.idNumber),

        /*
         * Keep id_image_url for compatibility with
         * the existing administrator approval page.
         */
        id_image_url:
          uploadedImages.front.publicUrl,

        id_front_image_url:
          uploadedImages.front.publicUrl,

        id_back_image_url:
          uploadedImages.back.publicUrl,

        id_holder_image_url:
          uploadedImages.holder.publicUrl,

        status: "pending",
        role: "user",
      };

      const { error: dbError } =
        await supabase
          .from("pending_registrations")
          .insert([registration]);

      if (dbError) {
        const message =
          String(dbError.message || "");

        const errorDetails =
          String(dbError.details || "");

        const lowerMessage =
          `${message} ${errorDetails}`.toLowerCase();

        if (
          lowerMessage.includes("username") ||
          lowerMessage.includes(
            "pending_registrations_username",
          )
        ) {
          throw new Error(
            "That username is already taken. Please choose another username.",
          );
        }

        if (
          lowerMessage.includes("email") ||
          lowerMessage.includes(
            "pending_registrations_email",
          )
        ) {
          throw new Error(
            "An account with this email already exists.",
          );
        }

        if (dbError.code === "23505") {
          throw new Error(
            "That username or email is already registered.",
          );
        }

        if (
          lowerMessage.includes(
            "row-level security",
          ) ||
          dbError.code === "42501"
        ) {
          throw new Error(
            "Registration could not be submitted because the database registration policy is not enabled. Please contact the administrator.",
          );
        }

        throw new Error(
          message || "Unable to create your account.",
        );
      }

      /*
       * Database insert succeeded, so the uploaded
       * images are no longer orphaned.
       */
      uploadedPaths = [];

      setSuccess(
        "Your account request was submitted successfully. Wait for administrator approval before signing in.",
      );

      setFormData({
        ...INITIAL_FORM,
      });

      clearAllIdFiles();
      setFieldErrors({});

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
       * Remove uploaded images when registration
       * fails after the upload was completed.
       */
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } =
          await supabase.storage
            .from(ID_BUCKET)
            .remove(uploadedPaths);

        if (cleanupError) {
          console.warn(
            "Unable to remove uploaded ID images:",
            cleanupError,
          );
        }
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
     PASSWORD STATUS
  =========================================================== */

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
    <main
      className={`${GRADIENT_CLASS} relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8`}
    >
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
                    className="h-12 w-12 object-contain"
                  />
                </div>

                <div>
                  <p className="text-xl font-black">
                    SafeResponse
                  </p>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                    OMDRRMO - NAIC, CAVITE
                  </p>
                </div>
              </div>

              <div className="mt-12 lg:mt-20">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/25 bg-blue-300/10 px-3 py-1.5 text-xs font-bold text-blue-50">
                  Resident Registration
                </span>

                <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Join your safer
                  community.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/80 sm:text-base">
                  Create your account to request emergency
                  assistance, submit reports, and track your
                  services through SafeResponse.
                </p>
              </div>

              <div className="mt-10 space-y-3 lg:mt-auto">
                {[
                  "Submit emergency and hazard reports",
                  "Request community safety services",
                  "Track requests and notifications",
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

              <div className="mt-8 flex items-start gap-2 border-t border-white/15 pt-5 text-xs leading-5 text-blue-100/75">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                Your account and identity documents will
                be reviewed by an administrator before
                access is activated.
              </div>
            </div>
          </section>

          {/* =================================================
              FORM PANEL
          ================================================= */}

          <section className="max-h-[calc(100vh-7rem)] overflow-y-auto p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-2xl">
              {/* Heading */}
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20">
                  <UserPlus className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Create User Account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fill in your details below. Fields marked
                  with an asterisk are required.
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
                      aria-invalid={Boolean(
                        fieldErrors.username,
                      )}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

                {/* Email */}
                <FormField
                  id="email"
                  label="Email Address"
                  icon={Mail}
                  required
                  hint="Use an active email address for account verification and communication."
                  error={fieldErrors.email}
                >
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      disabled={loading}
                      aria-invalid={Boolean(
                        fieldErrors.email,
                      )}
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                    />
                  </div>
                </FormField>

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
                      setShowPassword(
                        (visible) => !visible,
                      )
                    }
                    onChange={handleChange}
                    error={fieldErrors.password}
                    disabled={loading}
                  />

                  <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={
                      formData.confirmPassword
                    }
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(
                        (visible) => !visible,
                      )
                    }
                    onChange={handleChange}
                    error={
                      fieldErrors.confirmPassword
                    }
                    disabled={loading}
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

                {/* ID type and ID number */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <FormField
                    id="idType"
                    label="Type of ID"
                    icon={IdCard}
                    required
                    error={fieldErrors.idType}
                  >
                    <div className="relative">
                      <IdCard className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <select
                        id="idType"
                        name="idType"
                        value={formData.idType}
                        onChange={handleChange}
                        disabled={loading}
                        required
                        aria-invalid={Boolean(
                          fieldErrors.idType,
                        )}
                        className={`min-h-12 w-full appearance-none rounded-2xl border bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200 ${
                          fieldErrors.idType
                            ? "border-rose-300 focus:border-rose-500"
                            : "border-slate-300 focus:border-purple-500"
                        }`}
                      >
                        <option value="" disabled>
                          Select ID type
                        </option>

                        {ID_TYPE_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </FormField>

                  <FormField
                    id="idNumber"
                    label="ID Number"
                    icon={IdCard}
                    required
                    hint="Enter the number exactly as shown on your ID."
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
                        placeholder="Enter your ID number"
                        autoComplete="off"
                        maxLength={100}
                        disabled={loading}
                        aria-invalid={Boolean(
                          fieldErrors.idNumber,
                        )}
                        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200"
                      />
                    </div>
                  </FormField>
                </div>

                {/* Identity verification uploads */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                    <Camera className="h-4 w-4 text-blue-600 dark:text-blue-300" />

                    <span>
                      Identity Verification Images
                    </span>

                    <span className="text-rose-500">
                      *
                    </span>
                  </div>

                  <p className="mb-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Upload clear front and back images of
                    the selected ID, then use your camera
                    to capture a photo of yourself holding
                    the ID.
                  </p>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* Front and back ID uploads */}
                    {FILE_UPLOAD_FIELDS.map(
                      ({
                        key,
                        inputId,
                        label,
                        description,
                        icon,
                      }) => (
                        <IdImageUploadField
                          key={key}
                          id={inputId}
                          label={label}
                          description={description}
                          icon={icon}
                          file={idFiles[key]}
                          preview={idPreviews[key]}
                          inputRef={(element) => {
                            fileInputRefs.current[
                              key
                            ] = element;
                          }}
                          error={
                            fieldErrors[
                              `${key}IdFile`
                            ]
                          }
                          disabled={loading}
                          onChange={(event) =>
                            handleIdFileChange(
                              event,
                              key,
                            )
                          }
                          onRemove={() =>
                            clearIdFile(key)
                          }
                        />
                      ),
                    )}

                    {/* Camera-only ID holder upload */}
                    <div className="md:col-span-2">
                      <IdHolderCameraField
                        file={idFiles.holder}
                        preview={
                          idPreviews.holder
                        }
                        error={
                          fieldErrors.holderIdFile
                        }
                        disabled={loading}
                        onCapture={
                          handleHolderCapture
                        }
                        onRemove={() =>
                          clearIdFile("holder")
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                    <p className="text-xs leading-5 text-amber-800">
                      Make sure the selected ID belongs
                      to you and every image is clear,
                      complete, and readable. Blurred,
                      cropped, or covered details may
                      delay approval.
                    </p>
                  </div>
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
                      inputMode="tel"
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
                    After you submit this form, an
                    administrator must review and approve
                    your account before you can sign in.
                    Emergency requests should be submitted
                    through official MDRRMO channels while
                    your account is pending.
                  </p>
                </div>

                {/* Submit */}
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
                    onClick={() =>
                      navigate("/login")
                    }
                    disabled={loading}
                    className="font-black text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
