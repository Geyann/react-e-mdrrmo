"use client";

import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  Clock3,
  FileText,
  Image as ImageIcon,
  Loader2,
  LogIn,
  MapPin,
  Siren,
  UserRound,
  X,
} from "lucide-react";

import reportImg from "../Images/photo-icon.png";
import { supabase } from "../createClient";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function readLocalSession(key) {
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
}

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

const EMPTY_REPORT = {
  patientName: "",
  address: "",
  landMark: "",
  reporterContact: "",
  date: "",
  time: "",
  incidentType: "",
  priorityLevel: "",
  pictureOfIncident: null,
  specialNeeds: "",
  requiredTools: "",
};

export default function Report() {
  const navigate = useNavigate();

  const [report, setReport] =
    useState(EMPTY_REPORT);

  const [reporter, setReporter] =
    useState(null);

  const [loadingReporter, setLoadingReporter] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadReporter = async () => {
      try {
        /*
         * Staff and administrator sessions are checked first.
         */
        const storedStaff =
          readLocalSession(
            "currentStaff",
          );

        if (storedStaff) {
          const workId =
            storedStaff.user_id ||
            storedStaff.id;

          if (!workId) {
            throw new Error(
              "Your staff session is missing its work ID.",
            );
          }

          const [
            { data: staffRow, error: staffError },
            { data: profile, error: profileError },
          ] = await Promise.all([
            supabase
              .from("staff_users")
              .select(
                "id, full_name, mobile_number, email, role, department",
              )
              .eq("user_id", workId)
              .maybeSingle(),

            supabase
              .from("profiles")
              .select(
                "id, full_name, mobile_number, email",
              )
              .eq("user_id", workId)
              .maybeSingle(),
          ]);

          if (staffError) {
            throw staffError;
          }

          if (profileError) {
            throw profileError;
          }

          if (!profile?.id) {
            throw new Error(
              "Your staff account is not linked to a resident profile. Ask an administrator to add the required profile row.",
            );
          }

          const contact =
            profile.mobile_number ||
            staffRow?.mobile_number ||
            storedStaff.mobile_number ||
            profile.email ||
            staffRow?.email ||
            "";

          const fullName =
            profile.full_name ||
            staffRow?.full_name ||
            storedStaff.full_name ||
            storedStaff.role ||
            "Staff Member";

          if (active) {
            setReporter({
              userId: profile.id,
              fullName,
              contact,
              isStaff: true,
              role:
                staffRow?.role ||
                storedStaff.role ||
                "staff",
              department:
                staffRow?.department ||
                storedStaff.department ||
                "",
            });

            setReport((previous) => ({
              ...previous,
              reporterContact: contact,
            }));
          }

          return;
        }

        /*
         * Resident session
         */
        const storedUser =
          readLocalSession(
            "currentUser",
          );

        if (storedUser) {
          const [
            {
              data: profileData,
              error: profileError,
            },
            { data: pendingData },
          ] = await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .eq(
                "email",
                storedUser.email,
              )
              .maybeSingle(),

            supabase
              .from(
                "pending_registrations",
              )
              .select("*")
              .eq(
                "email",
                storedUser.email,
              )
              .maybeSingle(),
          ]);

          if (profileError) {
            throw profileError;
          }

          if (!profileData?.id) {
            throw new Error(
              "Your account is not yet approved in profiles. Ask an administrator to approve your registration.",
            );
          }

          const mobile =
            profileData.mobile_number ||
            pendingData?.mobile_number ||
            "";

          const contact =
            mobile ||
            profileData.email ||
            storedUser.email ||
            "";

          const fullName =
            profileData.full_name ||
            storedUser.full_name ||
            [
              storedUser.first_name,
              storedUser.middle_name,
              storedUser.last_name,
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

          if (active) {
            setReporter({
              userId: profileData.id,
              fullName,
              contact,
              isStaff: false,
              role:
                profileData.role || "user",
              department: "",
            });

            setReport((previous) => ({
              ...previous,
              reporterContact: contact,
            }));
          }

          return;
        }

        if (active) {
          setError(
            "Please log in before reporting an incident.",
          );

          navigate("/login", {
            replace: true,
            state: {
              error:
                "Please log in before reporting an incident.",
            },
          });
        }
      } catch (loadError) {
        console.error(
          "Error loading reporter:",
          loadError,
        );

        if (active) {
          setError(
            loadError?.message ||
              "Failed to load your account. Please log in again.",
          );
        }
      } finally {
        if (active) {
          setLoadingReporter(false);
        }
      }
    };

    loadReporter();

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      files,
    } = event.target;

    if (type === "file") {
      const file = files?.[0] || null;

      setError("");

      if (file) {
        if (!file.type.startsWith("image/")) {
          setError(
            "Please select a valid image file.",
          );

          return;
        }

        if (file.size > MAX_FILE_BYTES) {
          setError(
            "The selected image must be smaller than 8 MB.",
          );

          return;
        }
      }

      setReport((previous) => ({
        ...previous,
        [name]: file,
      }));

      return;
    }

    setReport((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const removePicture = () => {
    setReport((previous) => ({
      ...previous,
      pictureOfIncident: null,
    }));

    const fileInput =
      document.getElementById(
        "pictureOfIncident",
      );

    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleReset = () => {
    setReport({
      ...EMPTY_REPORT,
      reporterContact:
        reporter?.contact || "",
    });

    setError("");
    setSuccess("");

    const fileInput =
      document.getElementById(
        "pictureOfIncident",
      );

    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    let uploadedPath = null;

    try {
      if (!reporter?.userId) {
        throw new Error(
          "No authenticated account was found. Please log in.",
        );
      }

      let pictureUrl = null;

      if (report.pictureOfIncident) {
        const file =
          report.pictureOfIncident;

        if (!file.type.startsWith("image/")) {
          throw new Error(
            "The selected evidence file is not a valid image.",
          );
        }

        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            "The selected image must be smaller than 8 MB.",
          );
        }

        const extension =
          (
            file.name
              .split(".")
              .pop() || "jpg"
          )
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        const safeExtension =
          extension || "jpg";

        uploadedPath =
          `incidents/${Date.now()}-${reporter.userId}.${safeExtension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("incident-photos")
            .upload(
              uploadedPath,
              file,
              {
                cacheControl: "3600",
                upsert: false,
              },
            );

        if (uploadError) {
          throw new Error(
            `Photo upload failed: ${uploadError.message}`,
          );
        }

        const {
          data: publicData,
        } = supabase.storage
          .from("incident-photos")
          .getPublicUrl(uploadedPath);

        pictureUrl =
          publicData?.publicUrl || null;
      }

      const { error: insertError } =
        await supabase
          .from("reportIncident")
          .insert({
            patientName:
              report.patientName.trim(),

            address:
              report.address.trim(),

            landMark:
              report.landMark.trim(),

            reporterContact:
              reporter.contact,

            date: report.date,
            time: report.time,

            incidentType:
              report.incidentType,

            priorityLevel:
              report.priorityLevel,

            pictureOfIncident:
              pictureUrl,

            specialNeeds:
              report.specialNeeds.trim(),

            requiredTools:
              report.requiredTools.trim(),

            userId: reporter.userId,
            status: "Pending",
          });

      if (insertError) {
        /*
         * Remove an uploaded orphan if the database
         * insert fails.
         */
        if (uploadedPath) {
          await supabase.storage
            .from("incident-photos")
            .remove([uploadedPath])
            .catch(() => null);
        }

        throw new Error(
          insertError.message,
        );
      }

      setSuccess(
        "Incident report submitted successfully. It is now pending administrator review.",
      );

      setReport({
        ...EMPTY_REPORT,
        reporterContact:
          reporter.contact || "",
      });

      const fileInput =
        document.getElementById(
          "pictureOfIncident",
        );

      if (fileInput) {
        fileInput.value = "";
      }

      window.dispatchEvent(
        new Event(
          "mdrrmo:notif-refresh",
        ),
      );
    } catch (submitError) {
      console.error(
        "Incident report submit error:",
        submitError,
      );

      setError(
        submitError?.message ||
          "Failed to submit the incident report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingReporter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Verifying your reporter account...
          </p>
        </div>
      </div>
    );
  }

  if (!reporter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600" />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50">
              <Siren className="h-8 w-8 text-rose-600" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Account required
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "You must be logged in before reporting an incident."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RequestFormShell
      icon={Siren}
      eyebrow="Emergency Incident"
      title="Report an Incident"
      description="Provide accurate incident details and upload photographic evidence for administrator review."
      account={{
        name: reporter.fullName,
        detail:
          reporter.contact ||
          "No contact number available",
        badge: reporter.isStaff
          ? reporter.role || "Staff"
          : "Resident",
      }}
      onSubmit={handleSubmit}
      onReset={handleReset}
      error={error}
      success={success}
      submitting={submitting}
      submitLabel="Submit Incident Report"
      submitIcon={Siren}
      footerNote="Your identity is taken from your verified account. Incident reports are reviewed by authorized MDRRMO personnel before their status is updated."
    >
      <section>
        <FormSectionHeading
          icon={UserRound}
          step="01"
          title="Patient & Incident Location"
          description="Identify the person involved and the exact incident location."
        />

        <div className="grid gap-5">
          <FormField
            id="patientName"
            label="Patient / Affected Person"
            required
          >
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="patientName"
                name="patientName"
                type="text"
                value={report.patientName}
                onChange={handleChange}
                placeholder="Enter the patient's full name"
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
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
                  type="text"
                  value={report.address}
                  onChange={handleChange}
                  placeholder="Enter the incident address"
                  autoComplete="street-address"
                  className={`${FORM_INPUT_CLASS} pl-11`}
                  required
                />
              </div>
            </FormField>

            <FormField
              id="landMark"
              label="Nearby Landmark"
              required
            >
              <input
                id="landMark"
                name="landMark"
                type="text"
                value={report.landMark}
                onChange={handleChange}
                placeholder="Enter a nearby landmark"
                className={FORM_INPUT_CLASS}
                required
              />
            </FormField>
          </div>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={CalendarDays}
          step="02"
          title="Incident Date & Time"
          description="Enter when the incident occurred."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="date"
            label="Incident Date"
            required
          >
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="date"
                name="date"
                type="date"
                value={report.date}
                onChange={handleChange}
                max={localDateKey()}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="time"
            label="Incident Time"
            required
          >
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="time"
                name="time"
                type="time"
                value={report.time}
                onChange={handleChange}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={Siren}
          step="03"
          title="Incident Classification"
          description="Choose the incident category and urgency level."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="incidentType"
            label="Incident Type"
            required
          >
            <select
              id="incidentType"
              name="incidentType"
              value={report.incidentType}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
            >
              <option value="">
                Select an incident type
              </option>

              <option value="Medical Emergency">
                Medical Emergency
              </option>

              <option value="Fire">
                Fire
              </option>

              <option value="Accident">
                Accident
              </option>
            </select>
          </FormField>

          <FormField
            id="priorityLevel"
            label="Priority Level"
            required
          >
            <select
              id="priorityLevel"
              name="priorityLevel"
              value={report.priorityLevel}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
            >
              <option value="">
                Select a priority
              </option>

              <option value="Low">
                Low Priority
              </option>

              <option value="High">
                High Priority
              </option>
            </select>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={FileText}
          step="04"
          title="Response Requirements"
          description="Describe any patient needs and equipment required by responders."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="specialNeeds"
            label="Special Needs"
            required
          >
            <input
              id="specialNeeds"
              name="specialNeeds"
              type="text"
              value={report.specialNeeds}
              onChange={handleChange}
              placeholder="e.g. Wheelchair, oxygen, or None"
              className={FORM_INPUT_CLASS}
              required
            />
          </FormField>

          <FormField
            id="requiredTools"
            label="Required Tools / Equipment"
            required
          >
            <input
              id="requiredTools"
              name="requiredTools"
              type="text"
              value={report.requiredTools}
              onChange={handleChange}
              placeholder="e.g. Stretcher, fire extinguisher"
              className={FORM_INPUT_CLASS}
              required
            />
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={ImageIcon}
          step="05"
          title="Photographic Evidence"
          description="Upload one clear image of the incident. The file must be smaller than 8 MB."
        />

        <FormField
          id="pictureOfIncident"
          label="Incident Picture"
          required
        >
          <label
            htmlFor="pictureOfIncident"
            className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center transition hover:border-purple-400 hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-purple-500/10 dark:border-indigo-800 dark:bg-indigo-950/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
              <img
                src={reportImg}
                alt=""
                className="h-8 w-8"
              />
            </div>

            <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
              {report.pictureOfIncident
                ? report.pictureOfIncident.name
                : "Tap to upload a photo"}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              PNG, JPG, or another supported image format
            </p>

            <input
              id="pictureOfIncident"
              name="pictureOfIncident"
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="sr-only"
              required
            />
          </label>
        </FormField>

        {report.pictureOfIncident && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <ImageIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-emerald-800 dark:text-emerald-200">
                {report.pictureOfIncident.name}
              </p>

              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                {(
                  report.pictureOfIncident.size /
                  (1024 * 1024)
                ).toFixed(2)}{" "}
                MB selected
              </p>
            </div>

            <button
              type="button"
              onClick={removePicture}
              aria-label="Remove selected image"
              className="rounded-xl p-2 text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </section>
    </RequestFormShell>
  );
}
