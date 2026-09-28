"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  AlertCircle,
  Camera,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  LogIn,
  MapPin,
  Navigation,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";


import reportImg from "../Images/photo-icon.png";
import { supabase } from "../createClient";
import { useSettings } from "./SettingsContext";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const HAZARD_BUCKET = "hazard-photos";

function localDateKey() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const PhotoPreview = ({
  file,
  index,
}) => {
  const [url, setUrl] =
    useState(null);

  useEffect(() => {
    const objectUrl =
      URL.createObjectURL(file);

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!url) {
    return (
      <div className="h-20 w-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
    );
  }

  return (
    <div className="relative h-20 w-20 overflow-visible">
      <img
        src={url}
        alt={`Photo preview ${index + 1}`}
        className="h-full w-full rounded-xl border-2 border-white object-cover shadow-md dark:border-slate-600"
      />

      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-[10px] font-black text-white shadow-md ring-2 ring-white dark:ring-slate-900">
        {index + 1}
      </span>
    </div>
  );
};

const initialForm = {
  reporterName: "",
  department: "",
  address: "",
  landMark: "",
  reporterContact: "",
  dateObserved: "",
  timeObserved: "",
  hazardCategory: "",
  riskLevel: "",
  hazardPhotos: [],
  hazardDescription: "",
  recommendedAction: "",
  latitude: null,
  longitude: null,
};

export default function HazardReport() {
  const { prefs, setPref } = useSettings();

  const [realName, setRealName] =
    useState("");

  const [identity, setIdentity] =
    useState("resident");

  const [resolving, setResolving] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  const [geoError, setGeoError] =
    useState(null);

  const [geoLoading, setGeoLoading] =
    useState(true);

  const [form, setForm] =
    useState(initialForm);

  const [submittedPhotoCount, setSubmittedPhotoCount] =
    useState(0);

  const [uploadWarning, setUploadWarning] =
    useState("");

  const nameIsMasked =
    prefs.public_name === false;

  const locationEnabled =
    prefs.location_access !== false;

  const todayStr = localDateKey();

  useEffect(() => {
    let cancelled = false;

    const resolveIdentity = async () => {
      let resolved = false;

      try {
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        if (supabaseUser && !cancelled) {
          const { data: profile } =
            await supabase
              .from("profiles")
              .select(
                "full_name, first_name, last_name",
              )
              .eq("id", supabaseUser.id)
              .maybeSingle();

          if (!cancelled) {
            setRealName(
              profile?.full_name ||
                [
                  profile?.first_name,
                  profile?.last_name,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                supabaseUser.email ||
                "User",
            );

            setIdentity("resident");
            resolved = true;
          }
        }
      } catch {
        // Fall through to local sessions.
      }

      if (resolved || cancelled) {
        setResolving(false);
        return;
      }

      const rawUser =
        localStorage.getItem(
          "currentUser",
        );

      if (rawUser) {
        try {
          const parsed =
            JSON.parse(rawUser);

          if (!cancelled) {
            setRealName(
              parsed.full_name ||
                [
                  parsed.first_name,
                  parsed.last_name,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                parsed.email ||
                "User",
            );

            setIdentity("resident");
            resolved = true;
          }
        } catch {
          // Try staff next.
        }
      }

      if (resolved || cancelled) {
        setResolving(false);
        return;
      }

      const rawStaff =
        localStorage.getItem(
          "currentStaff",
        );

      if (rawStaff) {
        try {
          const staff =
            JSON.parse(rawStaff);

          if (!cancelled) {
            setRealName(
              staff.full_name ||
                staff.username ||
                staff.user_id ||
                "Staff Member",
            );

            setIdentity("staff");
            resolved = true;
          }
        } catch {
          // Fall through.
        }
      }

      if (resolved || cancelled) {
        setResolving(false);
        return;
      }

      if (!cancelled) {
        setIdentity("none");
        setResolving(false);
      }
    };

    resolveIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      reporterName: nameIsMasked
        ? "Anonymous"
        : realName,
    }));
  }, [nameIsMasked, realName]);

  const fetchLocation =
    useCallback(() => {
      return new Promise((resolve) => {
        setGeoLoading(true);
        setGeoError(null);

        if (!navigator.geolocation) {
          setGeoLoading(false);

          setGeoError(
            "Geolocation is not supported by this browser.",
          );

          resolve(false);

          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setForm((previous) => ({
              ...previous,
              latitude:
                position.coords.latitude,
              longitude:
                position.coords.longitude,
            }));

            setGeoLoading(false);
            resolve(true);
          },
          (locationError) => {
            setGeoLoading(false);

            if (
              locationError.code ===
              locationError.PERMISSION_DENIED
            ) {
              setGeoError(
                "Location permission was denied. Enable location for this site, then tap Retry.",
              );

              setPref(
                "location_access",
                false,
              );
            } else {
              setGeoError(
                "Unable to retrieve GPS location. Check your connection and tap Retry.",
              );
            }

            resolve(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      });
    }, [setPref]);

  useEffect(() => {
    if (!locationEnabled) {
      setGeoLoading(false);
      setGeoError(null);

      setForm((previous) => ({
        ...previous,
        latitude: null,
        longitude: null,
      }));

      return;
    }

    fetchLocation();
  }, [locationEnabled, fetchLocation]);

  const handleEnableLocation =
    useCallback(() => {
      setPref(
        "location_access",
        true,
      );
    }, [setPref]);

  const uploadPhotos = async (
    files,
  ) => {
    const uploadedPaths = [];
    const failures = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        failures.push(
          `${file.name} is larger than 8 MB`,
        );

        continue;
      }

      if (!file.type.startsWith("image/")) {
        failures.push(
          `${file.name} is not an image`,
        );

        continue;
      }

      const fileExt =
        (
          file.name
            .split(".")
            .pop() || "jpg"
        ).toLowerCase();

      const filePath =
        `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}.${fileExt}`;

      const { error: uploadError } =
        await supabase.storage
          .from(HAZARD_BUCKET)
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
            },
          );

      if (uploadError) {
        console.error(
          "Upload error:",
          uploadError,
        );

        failures.push(
          `${file.name}: ${uploadError.message}`,
        );

        continue;
      }

      uploadedPaths.push(filePath);
    }

    return {
      uploadedPaths,
      failures,
    };
  };

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      files,
    } = event.target;

    if (type === "file") {
      setForm((previous) => ({
        ...previous,
        hazardPhotos:
          Array.from(files)
            .slice(0, MAX_PHOTOS),
      }));

      return;
    }

    if (
      name === "reporterName" &&
      nameIsMasked
    ) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleResetForm = () => {
    setError("");

    setForm({
      ...initialForm,
      reporterName: nameIsMasked
        ? "Anonymous"
        : realName,
      department: form.department,
      latitude: form.latitude,
      longitude: form.longitude,
    });
  };

  const handleResetForAnother = () => {
    setSuccess(false);
    setError("");
    setUploadWarning("");
    setSubmittedPhotoCount(0);

    setForm({
      ...initialForm,
      reporterName: nameIsMasked
        ? "Anonymous"
        : realName,
      department: form.department,
      latitude: form.latitude,
      longitude: form.longitude,
    });
  };

  const createHazardReport =
    async (event) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      setSubmitting(true);
      setError("");
      setUploadWarning("");

      try {
        let photoPaths = [];

        if (form.hazardPhotos.length > 0) {
          const {
            uploadedPaths,
            failures,
          } = await uploadPhotos(
            form.hazardPhotos,
          );

          photoPaths = uploadedPaths;

          if (uploadedPaths.length === 0) {
            throw new Error(
              `None of the selected photos could be uploaded. ${
                failures.join("; ") ||
                "Please try again."
              }`,
            );
          }

          if (failures.length > 0) {
            setUploadWarning(
              `${failures.length} photo(s) were skipped: ${failures.join("; ")}. The successfully uploaded photos were attached.`,
            );
          }
        }

        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        const hasValidUser =
          typeof supabaseUser?.id ===
            "string" &&
          supabaseUser.id.length > 10;

        const reportData = {
          reporter_name:
            nameIsMasked
              ? "Anonymous"
              : form.reporterName ||
                "Anonymous",

          reporter_contact:
            form.reporterContact || "",

          address: form.address,
          landmark: form.landMark || "",

          date_observed:
            form.dateObserved,

          time_observed:
            form.timeObserved,

          hazard_category:
            form.hazardCategory,

          risk_level: form.riskLevel,

          hazard_description:
            form.hazardDescription,

          recommended_action:
            form.recommendedAction || "",

          hazard_photos: photoPaths,

          latitude:
            locationEnabled
              ? form.latitude
              : null,

          longitude:
            locationEnabled
              ? form.longitude
              : null,

          status: "pending",
          report_status: "pending",
          show_on_heatmap: false,
        };

        if (hasValidUser) {
          reportData.user_id =
            supabaseUser.id;
        }

        const { error: insertError } =
          await supabase
            .from("hazard_reports")
            .insert([reportData]);

        if (insertError) {
          throw insertError;
        }

        setSubmittedPhotoCount(
          photoPaths.length,
        );

        setSuccess(true);

        window.dispatchEvent(
          new Event(
            "mdrrmo:notif-refresh",
          ),
        );
      } catch (submitError) {
        console.error(
          "Hazard report submit error:",
          submitError,
        );

        setError(
          submitError?.message
            ? `Failed to submit report: ${submitError.message}`
            : "Failed to submit the hazard report. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    };

  if (resolving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Verifying your reporting account...
          </p>
        </div>
      </div>
    );
  }

  if (identity === "none") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600" />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <TriangleAlert className="h-8 w-8 text-amber-600" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Sign in required
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              You need an approved account before filing a hazard report.
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h1 className="mt-5 text-2xl font-black">
              Hazard Report Submitted
            </h1>

            <p className="mt-2 text-sm leading-6 text-blue-50/85">
              Your report has been received and will appear on the public map after administrator approval.
            </p>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
              <Camera className="mt-0.5 h-5 w-5 shrink-0" />

              <p>
                {submittedPhotoCount} photo{submittedPhotoCount === 1 ? "" : "s"} attached as evidence.
              </p>
            </div>

            {uploadWarning && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <p>{uploadWarning}</p>
              </div>
            )}

            {nameIsMasked && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Filed as <strong>Anonymous</strong> according to your privacy setting.
              </p>
            )}

            {!locationEnabled && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                No GPS coordinates were attached because location access is off.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleResetForAnother
                }
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
              >
                Submit Another
              </button>

              <Link
                to="/home"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bannerName =
    realName || "User";

  const bannerInitial =
    bannerName.charAt(0).toUpperCase();

  const hasCoords =
    form.latitude != null &&
    form.longitude != null;

  return (
    <RequestFormShell
      icon={TriangleAlert}
      eyebrow="Community Safety"
      title="Hazard & Risk Report"
      description="Report a dangerous condition, incident risk, or safety concern in your community."
      account={{
        name: bannerName,
        detail: nameIsMasked
          ? "Your public report will be submitted as Anonymous"
          : "Your verified account will be attached to this report",
        badge: identity === "staff"
          ? "Staff"
          : "Resident",
      }}
      onSubmit={createHazardReport}
      onReset={handleResetForm}
      error={error}
      submitting={submitting}
      submitLabel="Submit Hazard Report"
      submitIcon={TriangleAlert}
      resetLabel="Clear Form"
      footerNote="Hazard reports are reviewed before public publication. Only approved reports that are enabled for the public heatmap appear on the public map."
    >
      {nameIsMasked && (
        <div className="mb-7 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

          <p className="text-xs leading-6">
            Your name will be submitted as <strong>Anonymous</strong>. You can change this preference in Settings.
          </p>
        </div>
      )}

      <section>
        <FormSectionHeading
          icon={UserRound}
          step="01"
          title="Reporter Information"
          description="Provide the reporter's name and optional contact information."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="reporterName"
            label="Reporter Name"
            required
            hint={
              nameIsMasked
                ? 'Anonymity is enabled, so this field is locked to "Anonymous".'
                : ""
            }
          >
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="reporterName"
                name="reporterName"
                value={form.reporterName}
                onChange={handleChange}
                readOnly={nameIsMasked}
                className={`${FORM_INPUT_CLASS} pl-11 ${
                  nameIsMasked
                    ? "cursor-not-allowed bg-slate-200 dark:bg-slate-800"
                    : ""
                }`}
                autoComplete="name"
                required
              />
            </div>
          </FormField>

          <FormField
            id="reporterContact"
            label="Contact Details"
            hint={
              nameIsMasked
                ? "Consider leaving this blank because a contact number may identify you."
                : "Optional phone number or email address"
            }
          >
            <input
              id="reporterContact"
              name="reporterContact"
              type="text"
              value={form.reporterContact}
              onChange={handleChange}
              placeholder="Phone number or email"
              autoComplete="tel"
              className={FORM_INPUT_CLASS}
            />
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={TriangleAlert}
          step="02"
          title="Hazard Classification"
          description="Classify the hazard and its assessed risk level."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="hazardCategory"
            label="Hazard Category"
            required
          >
            <select
              id="hazardCategory"
              name="hazardCategory"
              value={form.hazardCategory}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
            >
              <option value="">
                Select a category
              </option>

              <option value="physical">
                Physical
              </option>

              <option value="chemical/biological">
                Chemical / Biological
              </option>

              <option value="electrical">
                Electrical
              </option>

              <option value="procedural/safety practices">
                Procedural / Safety Practices
              </option>

              <option value="natural disaster">
                Natural Disaster
              </option>
            </select>
          </FormField>

          <FormField
            id="riskLevel"
            label="Risk Level"
            required
          >
            <select
              id="riskLevel"
              name="riskLevel"
              value={form.riskLevel}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
            >
              <option value="">
                Select a risk level
              </option>

              <option value="low">
                Low Risk
              </option>

              <option value="medium">
                Medium Risk
              </option>

              <option value="high">
                High Risk
              </option>

              <option value="critical">
                Critical Risk
              </option>
            </select>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={MapPin}
          step="03"
          title="Location & Observation"
          description="Describe where and when the hazard was observed."
        />

        <div className="grid gap-5">
          <FormField
            id="address"
            label="Location / Address"
            required
          >
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="House number, street, barangay"
                autoComplete="street-address"
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              id="landMark"
              label="Nearby Landmark"
            >
              <input
                id="landMark"
                name="landMark"
                value={form.landMark}
                onChange={handleChange}
                placeholder="Optional landmark"
                className={FORM_INPUT_CLASS}
              />
            </FormField>

            <FormField
              id="department"
              label="Department"
              hint="Optional and not stored in the hazard_reports table."
            >
              <input
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="Optional department"
                className={FORM_INPUT_CLASS}
              />
            </FormField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              id="dateObserved"
              label="Date Observed"
              required
            >
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="dateObserved"
                  name="dateObserved"
                  type="date"
                  value={form.dateObserved}
                  onChange={handleChange}
                  max={todayStr}
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                />
              </div>
            </FormField>

            <FormField
              id="timeObserved"
              label="Time Observed"
              required
            >
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="timeObserved"
                  name="timeObserved"
                  type="time"
                  value={form.timeObserved}
                  onChange={handleChange}
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                />
              </div>
            </FormField>
          </div>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={FileText}
          step="04"
          title="Hazard Details"
          description="Describe the danger and any action you recommend."
        />

        <div className="grid gap-5">
          <FormField
            id="hazardDescription"
            label="Hazard Description"
            required
          >
            <textarea
              id="hazardDescription"
              name="hazardDescription"
              value={form.hazardDescription}
              onChange={handleChange}
              placeholder="Describe the hazard in detail..."
              className={`${FORM_INPUT_CLASS} min-h-32 resize-y`}
              required
            />
          </FormField>

          <FormField
            id="recommendedAction"
            label="Recommended Action"
          >
            <textarea
              id="recommendedAction"
              name="recommendedAction"
              value={form.recommendedAction}
              onChange={handleChange}
              placeholder="What action do you recommend to address this hazard?"
              className={`${FORM_INPUT_CLASS} min-h-28 resize-y`}
            />
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={Camera}
          step="05"
          title="Photo Evidence"
          description={`Upload up to ${MAX_PHOTOS} images. Each image must be smaller than 8 MB.`}
        />

        <FormField
          id="hazardPhotos"
          label="Hazard Photos"
          required
        >
          <label
            htmlFor="hazardPhotos"
            className="group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center transition hover:border-purple-400 hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-purple-500/10 dark:border-indigo-800 dark:bg-indigo-950/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900">
              <img
                src={reportImg}
                alt=""
                className="h-8 w-8"
              />
            </div>

            <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
              {form.hazardPhotos.length > 0
                ? `${form.hazardPhotos.length} image(s) selected`
                : "Tap to take a photo or select files"}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              PNG, JPG, or other supported image formats
            </p>

            <input
              id="hazardPhotos"
              name="hazardPhotos"
              type="file"
              multiple
              accept="image/*"
              onChange={handleChange}
              className="sr-only"
              required
            />
          </label>
        </FormField>

        {form.hazardPhotos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {form.hazardPhotos.map(
              (file, index) => (
                <PhotoPreview
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  index={index}
                />
              ),
            )}
          </div>
        )}
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={Navigation}
          step="06"
          title="GPS Location"
          description="GPS coordinates help administrators verify the exact hazard location."
        />

        <div
          role="status"
          aria-live="polite"
          className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm ${
            !locationEnabled
              ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              : hasCoords
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          {!locationEnabled ? (
            <>
              <MapPin className="h-5 w-5 shrink-0" />

              <p className="flex-1 text-xs leading-5">
                Location access is off. This report will be submitted without GPS coordinates.
              </p>

              <button
                type="button"
                onClick={
                  handleEnableLocation
                }
                className="rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm"
              >
                Enable Location
              </button>
            </>
          ) : hasCoords ? (
            <>
              <CheckCircle2 className="h-5 w-5 shrink-0" />

              <p className="flex-1 text-xs leading-5">
                GPS acquired:{" "}
                <strong>
                  {Number(form.latitude).toFixed(5)},{" "}
                  {Number(form.longitude).toFixed(5)}
                </strong>
              </p>

              <button
                type="button"
                onClick={fetchLocation}
                disabled={geoLoading}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Refresh
              </button>
            </>
          ) : geoLoading ? (
            <>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />

              <p className="flex-1 text-xs leading-5">
                Acquiring your GPS location. Please allow location access when prompted.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 shrink-0" />

              <p className="flex-1 text-xs leading-5">
                {geoError ||
                  "GPS location is unavailable."}
              </p>

              <button
                type="button"
                onClick={fetchLocation}
                disabled={geoLoading}
                className="rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <label
        htmlFor="termsAgree"
        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
      >
        <input
          id="termsAgree"
          type="checkbox"
          required
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-purple-600"
        />

        <span>
          I confirm that the information provided is accurate. I agree to the{" "}
          <Link
            to="/about"
            className="font-bold text-blue-700 underline dark:text-blue-300"
          >
            Terms and Conditions
          </Link>{" "}
          {locationEnabled
            ? " and authorize the use of my GPS coordinates for report verification."
            : " and understand that GPS coordinates will not be attached because location access is disabled."}
        </span>
      </label>
    </RequestFormShell>
  );
}
