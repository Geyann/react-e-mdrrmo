import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import logo1 from "../Images/logo1.png";
import iconLogo from "../Images/icon3.png";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  Phone,
  ShieldAlert,
  Printer,
} from "lucide-react";

const BorrowerSlip = () => {
  const navigate = useNavigate();

  const emptySlip = () => {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      plateNo: "",
      driver: "",
      borrowerName: "",
      residentOf: "",
      contactNum: "",
      hospital: "",
      borrowerSignature: "",
    };
  };

  const [slip, setSlip] = useState(emptySlip);
  const [submittedSlip, setSubmittedSlip] = useState(null);
  const [showPrintable, setShowPrintable] = useState(false);
  const [printMode, setPrintMode] = useState(null); // null | "office" | "borrower" | "both"

  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // STAFF-ONLY guard
  // 1) localStorage session must exist
  // 2) account must exist in staff_users and be active (DB-verified)
  // Otherwise redirect to /admin/login
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = (message) => {
      navigate("/admin/login", { replace: true, state: { error: message } });
    };

    const loadStaff = async () => {
      const storedStaff = localStorage.getItem("currentStaff");
      if (!storedStaff) {
        redirectToLogin("Staff login required.");
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(storedStaff);
      } catch {
        localStorage.removeItem("currentStaff");
        redirectToLogin("Invalid session. Please log in again.");
        return;
      }

      const staffCustomId = parsed.user_id || parsed.id;
      if (!staffCustomId) {
        localStorage.removeItem("currentStaff");
        redirectToLogin("Session missing staff ID. Please log in again.");
        return;
      }

      const { data: staff, error: staffError } = await supabase
        .from("staff_users")
        .select("id, user_id, full_name, email, role, department, mobile_number, is_active")
        .eq("user_id", staffCustomId)
        .maybeSingle();

      if (cancelled) return;

      if (staffError) {
        console.error("staff_users lookup failed:", staffError.message);
        setError(`Staff lookup failed: ${staffError.message}`);
        setLoading(false);
        return;
      }

      if (!staff) {
        localStorage.removeItem("currentStaff");
        redirectToLogin("Staff account not found. Please log in again.");
        return;
      }

      if (staff.is_active === false) {
        localStorage.removeItem("currentStaff");
        redirectToLogin("Your staff account has been deactivated.");
        return;
      }

      setStaffProfile(staff);
      setLoading(false);
    };

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center print:hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Verifying staff session...</p>
        </div>
      </div>
    );
  }

  function handleChange(event) {
    setSlip((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function submitSlip(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!staffProfile?.id) {
        throw new Error("No verified staff session. Please log in again.");
      }

      const plate = slip.plateNo.trim().toUpperCase();
      const contact = slip.contactNum.replace(/[\s-]/g, "");
      if (!/^0\d{10}$/.test(contact)) {
        throw new Error("Contact number must be a valid PH mobile number (e.g. 09171234567).");
      }
      if (!plate) throw new Error("Ambulance plate number is required.");
      if (!slip.borrowerSignature.trim()) {
        throw new Error("Borrower signature name is required.");
      }

      const payload = {
        date: slip.date,
        time: slip.time,
        plateNo: plate,
        driver: slip.driver.trim(),
        borrower_name: slip.borrowerName.trim(),
        resident_of: slip.residentOf.trim(),
        contact_num: contact,
        hospital: slip.hospital.trim(),
        requested_by: staffProfile.full_name,
        staff_id: staffProfile.id,
        user_id: null,
      };

      const { error: insertError } = await supabase.from("borrower_slip").insert(payload);
      if (insertError) throw new Error(insertError.message);

      setSuccess("Borrower slip submitted successfully! You may now print the slip.");

      setSubmittedSlip({
        ...payload,
        borrowerSignature: slip.borrowerSignature.trim(),
      });
      setShowPrintable(true);
      setPrintMode(null);

      setSlip(emptySlip());
    } catch (err) {
      console.error("Insert error:", err);
      setError(err.message || "Failed to submit the slip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint(mode) {
    setPrintMode(mode);
    // Wait one tick so React renders the correct copies before the dialog opens
    setTimeout(() => window.print(), 50);
  }

  const inputClass =
    "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition";
  const labelClass = "text-sm font-medium text-gray-700";

  // ============================================================
  // One printed copy — official MDRRMO paper format, Tailwind only
  // ============================================================
  const SlipCopy = ({ data, copyLabel }) => (
    <div className="font-serif text-[11.5pt] leading-relaxed text-black px-2 py-3">
     {/* Header */}
<div className="text-center mb-3">
  <div className="flex items-center justify-center gap-100 mb-1">
    <img src={logo1} alt="MDRRMO Logo" className="w-30 h-30 object-contain" />
    <img src={iconLogo} alt="Municipal Seal" className="w-30 h-30 object-contain" />
  </div>
  <p className="font-bold text-[11.5pt] leading-tight">
    MUNICIPAL DISASTER RISK REDUCTION MANAGEMENT OFFICE
  </p>
  <p className="text-[10pt] leading-tight">Municipality of Naic, Province of Cavite</p>
  <p className="font-bold text-[13pt] underline tracking-wide mt-1.5">BORROWER SLIP</p>
  {copyLabel && <p className="text-[9pt] italic mt-0.5">{copyLabel}</p>}
</div>

      {/* Top logistical info */}
      <div className="flex justify-between mb-1.5">
        <p className="w-[48%] m-0">
          <span className="font-bold">Date: </span>
          <span className="inline-block min-w-[45mm] border-b border-black text-center px-2">
            {data.date}
          </span>
        </p>
        <p className="w-[48%] m-0">
          <span className="font-bold">Time: </span>
          <span className="inline-block min-w-[45mm] border-b border-black text-center px-2">
            {data.time}
          </span>
        </p>
      </div>
      <div className="flex justify-between mb-1.5">
        <p className="w-[48%] m-0">
          <span className="font-bold">Ambulance Plate No.: </span>
          <span className="inline-block min-w-[45mm] border-b border-black text-center px-2">
            {data.plateNo}
          </span>
        </p>
        <p className="w-[48%] m-0">
          <span className="font-bold">Ambulance Driver: </span>
          <span className="inline-block min-w-[45mm] border-b border-black text-center px-2">
            {data.driver}
          </span>
        </p>
      </div>

      {/* Main agreement text (Tagalog) */}
      <p className="text-justify my-2 mt-3">
        Ipinahihintulot at ipinagkakatiwala kay:
      </p>
      <p className="m-0 mb-1">
        <span className="font-bold">Name: </span>
        <span className="inline-block min-w-[120mm] border-b border-black text-center px-2">
          {data.borrower_name}
        </span>
      </p>
      <p className="m-0 mb-1">
        <span className="font-bold">Resident of: </span>
        <span className="inline-block min-w-[120mm] border-b border-black text-center px-2">
          {data.resident_of}
        </span>
      </p>
      <p className="m-0 mb-1">
        <span className="font-bold">Contact No.: </span>
        <span className="inline-block min-w-[120mm] border-b border-black text-center px-2">
          {data.contact_num}
        </span>
      </p>

      <p className="text-justify my-2">
        ang pansamantalang pangangalaga ng Ambulance Stretcher sa kadahilanang may kakulangan
        sa hospital beds ang{" "}
        <span className="inline-block min-w-[55mm] border-b border-black text-center px-2">
          {data.hospital}
        </span>{" "}
        (pangalan ng hospital) at walang maaring ipagamit na hospital beds sa kasalukuyang panahon.
      </p>

      <p className="text-justify my-2">
        Lahat ng pagkasira o pagkawala na natamo ng Ambulance Stretcher habang ito ay nasa
        pangangalaga ng nanghihiram ay pananagutan at responsibilidad niya.
      </p>

      {/* Signatures */}
      <div className="flex justify-between mx-6 mt-10 mb-2">
        <div className="w-[42%] text-center">
          <p className="font-cursive text-[12pt] min-h-[7mm] m-0">{data.borrowerSignature}</p>
          <div className="border-b border-black"></div>
          <p className="font-bold text-[10.5pt] mt-1 mb-0">Borrower</p>
          <p className="text-[9pt] italic m-0">(Signature over Printed Name)</p>
          <p className="text-[10pt] mt-2 m-0">
            <span className="font-bold">Contact No.: </span>
            {data.contact_num}
          </p>
        </div>
        <div className="w-[42%] text-center">
          <p className="font-cursive text-[12pt] min-h-[7mm] m-0">{data.requested_by}</p>
          <div className="border-b border-black"></div>
          <p className="font-bold text-[10.5pt] mt-1 mb-0">Noted By</p>
          <p className="text-[9pt] italic m-0">(Signature over Printed Name)</p>
        </div>
      </div>

      {/* Footer / Hotlines */}
      <div className="mt-4 text-[10pt]">
        <p className="font-bold my-0.5">MDRRMO HOTLINE NUMBERS:</p>
        <p className="my-0.5">LANDLINE: 410-6725 / 410-5728</p>
        <p className="my-0.5">MOBILE: 0917 812 8187</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ============================================================
          PRINT LAYOUT — ONE form per A4 sheet.
          Only the copy(ies) matching the chosen print mode are rendered.
          Each slip-page fills a full sheet, so copies never share a page.
      ============================================================ */}
      {showPrintable &&
        submittedSlip &&
        printMode !== null &&
        ( printMode === "office") && (
          <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full slip-page">
            <SlipCopy data={submittedSlip} copyLabel="OFFICE COPY" />
          </div>
        )}

      {showPrintable &&
        submittedSlip &&
        printMode !== null &&
        ( printMode === "borrower") && (
          <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full slip-page">
            <SlipCopy data={submittedSlip} copyLabel="BORROWER'S COPY" />
          </div>
        )}

      {/* ================= SCREEN UI (hidden when printing) ================= */}
      <div className="screen-ui min-h-screen pt-10 pb-16 print:hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 max-w-3xl mx-auto rounded-t-3xl shadow-t-xl border border-b-transparent border-gray-100">
          <div className="flex flex-col items-center mb-3 pt-5 text-center px-4">
            <FileText className="w-12 h-12 text-slate-200 mb-1" />
            <h2 className="text-white font-semibold text-sm tracking-wide">
              MUNICIPAL DISASTER RISK REDUCTION MANAGEMENT OFFICE
            </h2>
            <p className="text-orange-100 text-xs">Municipality of Naic, Province of Cavite</p>
            <h1 className="text-3xl font-bold text-white mt-2">Borrower Slip</h1>
            <p className="text-white text-sm mt-1">
              Staff use only · All fields marked <span className="text-yellow-300">*</span> are required.
            </p>
          </div>
        </div>

        <form
          onSubmit={submitSlip}
          className="max-w-3xl mx-auto bg-white px-10 pb-10 pt-6 rounded-b-3xl border border-gray-100"
        >
          {staffProfile && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <User className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold text-gray-800">
                  Noted by: {staffProfile.full_name}
                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-semibold">
                    {staffProfile.role}
                  </span>
                </p>
                <p className="text-gray-600">
                  {staffProfile.mobile_number || staffProfile.email}
                  {staffProfile.department ? ` · ${staffProfile.department}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  Verified staff account — slips you file are recorded under your account.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Print buttons — appear after successful submit */}
          {showPrintable && submittedSlip && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            
              <button
                type="button"
                onClick={() => handlePrint("office")}
                className="bg-gray-700 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Office Copy Only
              </button>
              <button
                type="button"
                onClick={() => handlePrint("borrower")}
                className="bg-gray-600 text-white font-bold py-4 rounded-2xl hover:bg-gray-700 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Borrower's Copy Only
              </button>
            </div>
          )}

          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Slip Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date <span className="text-red-500">*</span></label>
              <input name="date" type="date" value={slip.date} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Time <span className="text-red-500">*</span></label>
              <input name="time" type="time" value={slip.time} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Ambulance Plate No. <span className="text-red-500">*</span></label>
              <input name="plateNo" type="text" placeholder="e.g. CAV-1234" value={slip.plateNo} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Ambulance Driver <span className="text-red-500">*</span></label>
              <input name="driver" type="text" placeholder="e.g. Juan Dela Cruz" value={slip.driver} onChange={handleChange} className={inputClass} required />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-8 border-b pb-2">
            Borrower Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className={labelClass}>Name of Borrower <span className="text-red-500">*</span></label>
              <input name="borrowerName" type="text" placeholder="Full name of the person entrusted with the stretcher" value={slip.borrowerName} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Resident of <span className="text-red-500">*</span></label>
              <input name="residentOf" type="text" placeholder="e.g. Brgy. Bagong Kalsada, Naic, Cavite" value={slip.residentOf} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Contact No. <span className="text-red-500">*</span></label>
              <input name="contactNum" type="tel" placeholder="e.g. 0917 123 4567" value={slip.contactNum} onChange={handleChange} className={inputClass} required />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-1.5">
            <label className={labelClass}>
              Hospital (with shortage of hospital beds) <span className="text-red-500">*</span>
            </label>
            <input name="hospital" type="text" placeholder="e.g. Naic Doctors Hospital" value={slip.hospital} onChange={handleChange} className={inputClass} required />
          </div>

          <div className="mt-8 flex flex-col gap-1.5">
            <label className={labelClass}>
              Borrower Signature (printed name) <span className="text-red-500">*</span>
            </label>
            <input
              name="borrowerSignature"
              type="text"
              placeholder="Borrower's full name as signature"
              value={slip.borrowerSignature}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-gray-700">
            Lahat ng pagkasira o pagkawala na natamo ng Ambulance Stretcher habang ito ay nasa
            pangangalaga ng nanghihiram ay pananagutan at responsibilidad ng nanghihiram.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-8 bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Borrower Slip"
            )}
          </button>

          <div className="mt-8 flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
            <Phone className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-800">MDRRMO Hotline Numbers</p>
              <p className="text-gray-600">Landline: 410-6725 / 410-5728</p>
              <p className="text-gray-600">Mobile: 0917 812 8187</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            This page is restricted to MDRRMO staff accounts.
          </div>
        </form>
      </div>
    </>
  );
};

export default BorrowerSlip;