"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  CheckCircle2,
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
import {
  EMERGENCY_INCIDENT_TYPES,
  getEmergencyTypesForCategory,
  isOtherEmergency,
  composeIncidentType,
} from "../utils/HazardTaxonomy";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function readLocalSession(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function localDateKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dashboardPathFor(reporter) {
  if (!reporter) return "/home";
  if (reporter.isStaff) {
    return reporter.role === "admin" ? "/admin/dashboard" : "/staff/dashboard";
  }
  return "/home";
}

const EMPTY_REPORT = {
  patientName: "",
  address: "",
  landMark: "",
  reporterContact: "",
  date: "",
  time: "",
  incidentType: "",
  incidentSpecificType: "",
  otherIncidentType: "",
  priorityLevel: "",
  pictureOfIncident: null,
  specialNeeds: "",
  requiredTools: "",
};

export default function Report() {
  const navigate = useNavigate();

  const [report, setReport] = useState(EMPTY_REPORT);
  const [reporter, setReporter] = useState(null);
  const [loadingReporter, setLoadingReporter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  const specificOptions = getEmergencyTypesForCategory(report.incidentType);
  const showOtherInput = isOtherEmergency(report.incidentType);
  const showSpecificSelect =
    Boolean(report.incidentType) &&
    !showOtherInput &&
    specificOptions.length > 0;

  useEffect(() => {
    let active = true;

    const loadReporter = async () => {
      try {
        const storedStaff = readLocalSession("currentStaff");

        if (storedStaff) {
          const workId = storedStaff.user_id || storedStaff.id;

          if (!workId) {
            throw new Error("Your staff session is missing its work ID.");
          }

          const [
            { data: staffRow, error: staffError },
            { data: profile, error: profileError },
          ] = await Promise.all([
            supabase
              .from("staff_users")
              .select("id, full_name, mobile_number, email, role, department")
              .eq("user_id", workId)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("id, full_name, mobile_number, email")
              .eq("user_id", workId)
              .maybeSingle(),
          ]);

          if (staffError) throw staffError;
          if (profileError) throw profileError;

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
              role: staffRow?.role || storedStaff.role || "staff",
              department:
                staffRow?.department || storedStaff.department || "",
            });

            setReport((previous) => ({ ...previous, reporterContact: contact }));
          }
          return;
        }

        const storedUser = readLocalSession("currentUser");

        if (storedUser) {
          const [
            { data: profileData, error: profileError },
            { data: pendingData },
          ] = await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .eq("email", storedUser.email)
              .maybeSingle(),
            supabase
              .from("pending_registrations")
              .select("*")
              .eq("email", storedUser.email)
              .maybeSingle(),
          ]);

          if (profileError) throw profileError;

          if (!profileData?.id) {
            throw new Error(
              "Your account is not yet approved in profiles. Ask an administrator to approve your registration.",
            );
          }

          const mobile =
            profileData.mobile_number || pendingData?.mobile_number || "";

          const contact = mobile || profileData.email || storedUser.email || "";

          const fullName =
            profileData.full_name ||
            storedUser.full_name ||
            [storedUser.first_name, storedUser.middle_name, storedUser.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();

          if (active) {
            setReporter({
              userId: profileData.id,
              fullName,
              contact,
              isStaff: false,
              role: profileData.role || "user",
              department: "",
            });

            setReport((previous) => ({ ...previous, reporterContact: contact }));
          }
          return;
        }

        if (active) {
          setError("Please log in before reporting an incident.");
          navigate("/login", {
            replace: true,
            state: { error: "Please log in before reporting an incident." },
          });
        }
      } catch (loadError) {
        console.error("Error loading reporter:", loadError);
        if (active) {
          setError(
            loadError?.message ||
              "Failed to load your account. Please log in again.",
          );
        }
      } finally {
        if (active) setLoadingReporter(false);
      }
    };

    loadReporter();
    return () => { active = false; };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value, type, files } = event.target;

    if (type === "file") {
      const file = files?.[0] || null;
      setError("");

      if (file) {
        if (!file.type.startsWith("image/")) {
          setError("Please select a valid image file.");
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          setError("The selected image must be smaller than 8 MB.");
          return;
        }
      }

      setReport((previous) => ({ ...previous, [name]: file }));
      return;
    }

    if (name === "incidentType") {
      setReport((previous) => ({
        ...previous,
        incidentType: value,
        incidentSpecificType: "",
        otherIncidentType: "",
      }));
      setError("");
      return;
    }

    setReport((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const removePicture = () => {
    setReport((previous) => ({ ...previous, pictureOfIncident: null }));
    const fileInput = document.getElementById("pictureOfIncident");
    if (fileInput) fileInput.value = "";
  };

  const handleReset = () => {
    setReport({ ...EMPTY_REPORT, reporterContact: reporter?.contact || "" });
    setError("");
    const fileInput = document.getElementById("pictureOfIncident");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");

    let uploadedPath = null;

    try {
      if (!reporter?.userId) {
        throw new Error("No authenticated account was found. Please log in.");
      }
      if (!report.incidentType) {
        throw new Error("Please select an emergency type.");
      }
      if (showOtherInput && !String(report.otherIncidentType || "").trim()) {
        throw new Error(
          "Please describe the type of emergency when choosing Other Emergency.",
        );
      }

      let pictureUrl = null;

      if (report.pictureOfIncident) {
        const file = report.pictureOfIncident;

        if (!file.type.startsWith("image/")) {
          throw new Error("The selected evidence file is not a valid image.");
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error("The selected image must be smaller than 8 MB.");
        }

        const extension =
          (file.name.split(".").pop() || "jpg")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "jpg";

        uploadedPath = `incidents/${Date.now()}-${reporter.userId}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("incident-photos")
          .upload(uploadedPath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        const { data: publicData } = supabase.storage
          .from("incident-photos")
          .getPublicUrl(uploadedPath);

        pictureUrl = publicData?.publicUrl || null;
      }

      const incidentTypeValue = composeIncidentType(
        report.incidentType,
        report.incidentSpecificType,
        report.otherIncidentType,
      );

      const { error: insertError } = await supabase
        .from("reportIncident")
        .insert({
          patientName: report.patientName.trim(),
          address: report.address.trim(),
          landMark: report.landMark.trim(),
          reporterContact: reporter.contact,
          date: report.date,
          time: report.time,
          incidentType: incidentTypeValue,
          priorityLevel: report.priorityLevel,
          pictureOfIncident: pictureUrl,
          specialNeeds: report.specialNeeds.trim(),
          requiredTools: report.requiredTools.trim(),
          userId: reporter.userId,
          status: "Pending",
        });

      if (insertError) {
        if (uploadedPath) {
          await supabase.storage
            .from("incident-photos")
            .remove([uploadedPath])
            .catch(() => null);
        }
        throw new Error(insertError.message);
      }

      window.dispatchEvent(new Event("mdrrmo:notif-refresh"));

      setSubmittedInfo({
        patientName: report.patientName.trim(),
        incidentType: incidentTypeValue,
        priorityLevel: report.priorityLevel,
        address: report.address.trim(),
      });

      setSubmitted(true);

      setReport({
        ...EMPTY_REPORT,
        reporterContact: reporter.contact || "",
      });

      const fileInput = document.getElementById("pictureOfIncident");
      if (fileInput) fileInput.value = "";
    } catch (submitError) {
      console.error("Incident report submit error:", submitError);
      setError(
        submitError?.message || "Failed to submit the incident report.",
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
              {error || "You must be logged in before reporting an incident."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
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

  if (submitted) {
    return (
      <ReportSuccess
        info={submittedInfo}
        onGoToDashboard={() => navigate(dashboardPathFor(reporter))}
        onSubmitAnother={() => setSubmitted(false)}
      />
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
        detail: reporter.contact || "No contact number available",
        badge: reporter.isStaff ? reporter.role || "Staff" : "Resident",
      }}
      onSubmit={handleSubmit}
      onReset={handleReset}
      error={error}
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
          <FormField id="patientName" label="Patient / Affected Person" required>
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
            <FormField id="address" label="Location / Address" required>
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

            <FormField id="landMark" label="Nearby Landmark" required>
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
          <FormField id="date" label="Incident Date" required>
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

          <FormField id="time" label="Incident Time" required>
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
          title="Emergency Classification"
          description="Choose the emergency type, specific detail, and priority. This report is for situations that need immediate MDRRMO or ambulance response."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="incidentType" label="Incident Type" required>
            <select
              id="incidentType"
              name="incidentType"
              value={report.incidentType}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
              aria-describedby="incidentType-hint"
            >
              <option value="">Select an emergency type</option>
              {EMERGENCY_INCIDENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            <p
              id="incidentType-hint"
              className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
            >
              Use this form for emergencies that need immediate response or dispatch.
              For natural conditions (flood, landslide, typhoon effects) to be verified and mapped, use Natural Hazard Report.
            </p>
          </FormField>

          {showSpecificSelect && (
            <FormField id="incidentSpecificType" label="Specific Type">
              <select
                id="incidentSpecificType"
                name="incidentSpecificType"
                value={report.incidentSpecificType}
                onChange={handleChange}
                className={FORM_INPUT_CLASS}
                aria-describedby="incidentSpecificType-hint"
              >
                <option value="">Select a specific type (optional)</option>
                {specificOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p
                id="incidentSpecificType-hint"
                className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                Optional detail that helps responders prepare (e.g. Cardiac emergency).
              </p>
            </FormField>
          )}

          {showOtherInput && (
            <FormField
              id="otherIncidentType"
              label="Specify Emergency Type"
              required
            >
              <input
                id="otherIncidentType"
                name="otherIncidentType"
                type="text"
                value={report.otherIncidentType}
                onChange={handleChange}
                placeholder="Describe the type of emergency"
                className={FORM_INPUT_CLASS}
                required
                aria-describedby="otherIncidentType-hint"
              />
              <p
                id="otherIncidentType-hint"
                className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                Required when Other Emergency is selected so responders know what to expect.
              </p>
            </FormField>
          )}

          <FormField id="priorityLevel" label="Priority Level" required>
            <select
              id="priorityLevel"
              name="priorityLevel"
              value={report.priorityLevel}
              onChange={handleChange}
              className={FORM_INPUT_CLASS}
              required
            >
              <option value="">Select a priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
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
          <FormField id="specialNeeds" label="Special Needs" required>
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

        <FormField id="pictureOfIncident" label="Incident Picture" required>
          <label
            htmlFor="pictureOfIncident"
            className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center transition hover:border-purple-400 hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-purple-500/10 dark:border-indigo-800 dark:bg-indigo-950/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
              <img src={reportImg} alt="" className="h-8 w-8" />
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
                {(report.pictureOfIncident.size / (1024 * 1024)).toFixed(2)} MB selected
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

/* ══════════════════════════════════════════════════════════════════
   SUCCESS PAGE
   ══════════════════════════════════════════════════════════════════ */

function ReportSuccess({ info, onGoToDashboard, onSubmitAnother }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-black">
            Incident Report Submitted
          </h1>
          <p className="mt-2 text-sm leading-6 text-blue-50/85">
            Your report has been received and is now pending administrator review.
          </p>
        </div>

        <div className="space-y-4 p-6 sm:p-8">
          {info && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
              {info.patientName && (
                <p className="text-base font-black">
                  Patient: {info.patientName}
                </p>
              )}
              {info.incidentType && (
                <p className="mt-1 text-xs leading-6 opacity-80">
                  Type: {info.incidentType}
                </p>
              )}
              {info.priorityLevel && (
                <p className="mt-1 text-xs leading-6 opacity-80">
                  Priority: {info.priorityLevel}
                </p>
              )}
              {info.address && (
                <p className="mt-1 text-xs leading-6 opacity-80">
                  Address: {info.address}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
            You can track this report from your dashboard under “My Requests”.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSubmitAnother}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Submit Another
            </button>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}