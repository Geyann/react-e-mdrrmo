"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import reportImg from "../Images/photo-icon.png";
import { Siren, AlertCircle, CheckCircle, Loader2, User } from "lucide-react";

const Report = () => {
  const navigate = useNavigate();

  const [report, setReport] = useState({
    patientName: "",
    address: "",
    landMark: "",
    reporterContact: "", // auto-filled from the logged-in user — not typed by the reporter
    date: "",
    time: "",
    incidentType: "",
    priorityLevel: "",
    pictureOfIncident: null,
    specialNeeds: "",
    requiredTools: "",
  });

  const [reporter, setReporter] = useState(null); // { userId, fullName, contact }
  const [loadingReporter, setLoadingReporter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // Auto-detect the reporter from the active session (mirrors the
  // logic in Profile.jsx / ProtectedRoute.jsx). The form never
  // asks who is reporting — it comes from localStorage.
  // ============================================================
useEffect(() => {
  const loadReporter = async () => {
    try {
      // 1) Staff / Admin session
      const storedStaff = localStorage.getItem("currentStaff");
      if (storedStaff) {
        const parsed = JSON.parse(storedStaff);
        const staffCustomId = parsed.user_id || parsed.id;
        if (!staffCustomId) throw new Error("Staff session is missing an ID.");

        // Staff must also exist in profiles — resolve their UUID id
        const { data: staffProfile, error: staffErr } = await supabase
          .from("profiles")
          .select("id, full_name, mobile_number, email")
          .eq("user_id", staffCustomId)
          .maybeSingle();

        if (staffErr) throw new Error(staffErr.message);
        if (!staffProfile?.id) {
          throw new Error("Staff account not found in profiles — ask an admin to add your profile row.");
        }

        const contact = staffProfile.mobile_number || parsed.mobile_number || staffProfile.email || "";
        setReporter({
          userId: staffProfile.id,          // UUID → matches profiles.id FK
          fullName: staffProfile.full_name || parsed.full_name || parsed.role || "Staff",
          contact,
        });
        setReport((prev) => ({ ...prev, reporterContact: contact }));
        return;
      }

      // 2) Regular user session
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        const [{ data: profileData }, { data: pendingData }] = await Promise.all([
          supabase.from("profiles").select("*").eq("email", parsed.email).maybeSingle(),
          supabase.from("pending_registrations").select("*").eq("email", parsed.email).maybeSingle(),
        ]);

        // THE fix: the FK references profiles(id), so we must send the UUID
        if (!profileData?.id) {
          throw new Error("Your account isn't approved in profiles yet — ask an admin to approve your registration.");
        }

        const mobile = profileData.mobile_number || pendingData?.mobile_number || "";
        const contact = mobile || profileData.email || parsed.email || "";
        const fullName =
          profileData.full_name ||
          parsed.full_name ||
          `${parsed.first_name || ""} ${parsed.middle_name || ""} ${parsed.last_name || ""}`.trim();

        setReporter({
          userId: profileData.id,           // UUID → matches profiles.id FK
          fullName,
          contact,
        });
        setReport((prev) => ({ ...prev, reporterContact: contact }));
        return;
      }

      // 3) No session → bounce to login
      navigate("/login", { replace: true, state: { error: "Please log in first." } });
    } catch (err) {
      console.error("Error loading reporter:", err);
      setError(err.message || "Failed to load your session. Please log in again.");
    } finally {
      setLoadingReporter(false);
    }
  };

  loadReporter();
}, [navigate]);

  function handleChange(event) {
    const { name, value, type, files } = event.target;
    setReport((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  }

  // ============================================================
  // Submit → upload photo (if any) → insert into reportIncident
  // ============================================================
  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!reporter?.userId) {
        throw new Error("No authenticated user found. Please log in.");
      }

      let pictureUrl = null;

      // Upload incident picture to Supabase Storage
      if (report.pictureOfIncident) {
        const file = report.pictureOfIncident;
        const ext = file.name.split(".").pop();
        const filePath = `incidents/${Date.now()}-${reporter.userId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("incident-photos")
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

        const { data: publicData } = supabase.storage
          .from("incident-photos")
          .getPublicUrl(filePath);

        pictureUrl = publicData?.publicUrl || null;
      }

      const { error: insertError } = await supabase.from("reportIncident").insert({
        patientName: report.patientName,
        address: report.address,
        landMark: report.landMark,
        reporterContact: report.reporterContact, // auto-filled, never typed
        date: report.date,
        time: report.time,
        incidentType: report.incidentType,
        priorityLevel: report.priorityLevel,
        pictureOfIncident: pictureUrl,
        specialNeeds: report.specialNeeds,
        requiredTools: report.requiredTools,
        userId: reporter.userId,
        status: "Pending",
      });

      if (insertError) throw new Error(insertError.message);

      setSuccess("Incident report submitted successfully! It is now pending review.");

      // Reset the form, keep the auto-detected reporter
      setReport({
        patientName: "",
        address: "",
        landMark: "",
        reporterContact: reporter.contact,
        date: "",
        time: "",
        incidentType: "",
        priorityLevel: "",
        pictureOfIncident: null,
        specialNeeds: "",
        requiredTools: "",
      });
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingReporter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading reporter details...</p>
        </div>
      </div>
    );
  }

 if (!reporter) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
        <p className="text-red-600 font-bold text-lg">
          {error || "You must be logged in to report an incident."}
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen py-10">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto bg-white rounded-t-4xl shadow-xl border border-b-transparent border-gray-100">
        <div className="flex flex-col items-center mb-3 pt-5">
          <Siren className="w-15 h-auto text-slate-200" />
          <h1 className="text-3xl font-bold text-white">Report an Incident</h1>
          <p className="text-white text-sm">
            Please provide details below. All fields marked <span className="text-red-500">*</span> are required.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white p-8 md:p-10 rounded-b-3xl shadow-b-xl border border-t-transparent border-gray-200"
      >
        <div className="flex flex-col gap-6">
          {/* Auto-detected reporter banner — no input needed */}
          {reporter && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold text-gray-800">Reporting as: {reporter.fullName}</p>
                <p className="text-gray-600">{reporter.contact}</p>
                <p className="text-xs text-gray-400">
                  Reporter identity is detected automatically from your account.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5">
            {[
              { label: "Patient Name", name: "patientName", type: "text", placeholder: "Enter Patient Name" },
              { label: "Location / Address", name: "address", type: "text", placeholder: "Enter Address" },
              { label: "Land Mark", name: "landMark", type: "text", placeholder: "Enter Land mark" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  {field.label}<span className="text-red-500">*</span>
                </label>
                <input
                  name={field.name}
                  type={field.type}
                  value={report[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Date<span className="text-red-500">*</span></label>
                <input name="date" type="date" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Time<span className="text-red-500">*</span></label>
                <input name="time" type="time" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Incident Type<span className="text-red-500">*</span></label>
                <select name="incidentType" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl bg-white" required>
                  <option value="">Select an Option</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Fire">Fire</option>
                  <option value="Accident">Accident</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Priority Level<span className="text-red-500">*</span></label>
                <select name="priorityLevel" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl bg-white" required>
                  <option value="">Select an Option</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {/* specialNeeds / requiredTools — required by the table schema (NOT NULL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Special Needs<span className="text-red-500">*</span></label>
                <input
                  name="specialNeeds"
                  type="text"
                  value={report.specialNeeds}
                  onChange={handleChange}
                  placeholder="e.g. Wheelchair, oxygen, none"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Required Tools<span className="text-red-500">*</span></label>
                <input
                  name="requiredTools"
                  type="text"
                  value={report.requiredTools}
                  onChange={handleChange}
                  placeholder="e.g. Stretcher, fire extinguisher"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Picture of Incident<span className="text-red-500">*</span></label>
              <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <img src={reportImg} alt="upload" className="w-8 h-8" />
                <span className="text-gray-500">
                  {report.pictureOfIncident ? report.pictureOfIncident.name : "Upload PNG / JPEG"}
                </span>
                <input name="pictureOfIncident" type="file" onChange={handleChange} className="hidden" accept="image/*" required />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-purple-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Incident Report"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Report;