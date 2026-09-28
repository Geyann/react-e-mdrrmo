"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Loader2,
  MapPin,
  Phone,
  Printer,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import logo1 from "../Images/logo1.png";
import iconLogo from "../Images/icon3.png";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

import { supabase } from "../createClient";

/* =============================================================
 * HELPERS
 * ============================================================= */

const cleanText = (value) =>
  String(value ?? "").trim();

const getPhoneDigits = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\D/g, "");

const getLocalDateKey = () => {
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

const getLocalTimeKey = () => {
  const date = new Date();

  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
};

const getInitials = (value) => {
  const text = cleanText(value);

  if (!text) {
    return "ST";
  }

  return (
    text
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ST"
  );
};

const getRoleLabel = (role) => {
  const normalized = cleanText(role).toLowerCase();

  if (normalized === "admin") {
    return "Administrator";
  }

  if (normalized === "moderator") {
    return "Moderator";
  }

  return "Staff Member";
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

const createEmptySlip = () => ({
  date: getLocalDateKey(),
  time: getLocalTimeKey(),
  plateNo: "",
  driver: "",
  borrowerName: "",
  residentOf: "",
  contactNum: "",
  hospital: "",
  borrowerSignature: "",
});

/* =============================================================
 * PRINTABLE BORROWER SLIP
 * ============================================================= */

function SlipCopy({
  data,
  copyLabel,
}) {
  return (
    <article className="slip-copy font-serif text-[11.5pt] leading-relaxed text-black">
      {/* Header */}
      <header className="mb-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-6">
          <img
            src={logo1}
            alt="MDRRMO Logo"
            className="h-20 w-20 object-contain"
          />

          <img
            src={iconLogo}
            alt="Municipal Seal"
            className="h-20 w-20 object-contain"
          />
        </div>

        <p className="text-[11.5pt] font-bold leading-tight">
          MUNICIPAL DISASTER RISK REDUCTION
          MANAGEMENT OFFICE
        </p>

        <p className="text-[10pt] leading-tight">
          Municipality of Naic, Province of
          Cavite
        </p>

        <p className="mt-2 text-[14pt] font-bold tracking-wide underline">
          BORROWER SLIP
        </p>

        {copyLabel && (
          <p className="mt-1 text-[9pt] font-semibold uppercase tracking-[0.12em]">
            {copyLabel}
          </p>
        )}
      </header>

      {/* Date and time */}
      <section className="space-y-2">
        <div className="flex justify-between gap-4">
          <p className="m-0 w-1/2">
            <span className="font-bold">
              Date:{" "}
            </span>

            <span className="inline-block min-w-[42mm] border-b border-black px-2 text-center">
              {data.date}
            </span>
          </p>

          <p className="m-0 w-1/2 text-right">
            <span className="font-bold">
              Time:{" "}
            </span>

            <span className="inline-block min-w-[42mm] border-b border-black px-2 text-center">
              {data.time}
            </span>
          </p>
        </div>

        {/* Vehicle and driver */}
        <div className="flex justify-between gap-4">
          <p className="m-0 w-1/2">
            <span className="font-bold">
              Ambulance Plate No.:{" "}
            </span>

            <span className="inline-block min-w-[38mm] border-b border-black px-2 text-center">
              {data.plateNo}
            </span>
          </p>

          <p className="m-0 w-1/2 text-right">
            <span className="font-bold">
              Ambulance Driver:{" "}
            </span>

            <span className="inline-block min-w-[38mm] border-b border-black px-2 text-center">
              {data.driver}
            </span>
          </p>
        </div>
      </section>

      <div className="my-3 h-px bg-black" />

      {/* Borrower information */}
      <section>
        <p className="my-2 text-justify">
          Ipinahihintulot at ipinagkakatiwala kay:
        </p>

        <p className="mb-1 mt-3">
          <span className="font-bold">
            Name:{" "}
          </span>

          <span className="inline-block min-w-[125mm] border-b border-black px-2 text-center">
            {data.borrower_name}
          </span>
        </p>

        <p className="mb-1">
          <span className="font-bold">
            Resident of:{" "}
          </span>

          <span className="inline-block min-w-[125mm] border-b border-black px-2 text-center">
            {data.resident_of}
          </span>
        </p>

        <p className="mb-1">
          <span className="font-bold">
            Contact No.:{" "}
          </span>

          <span className="inline-block min-w-[125mm] border-b border-black px-2 text-center">
            {data.contact_num}
          </span>
        </p>

        <p className="my-3 text-justify">
          ang pansamantalang pangangalaga ng
          Ambulance Stretcher sa kadahilanang may
          kakulangan sa hospital beds ang{" "}
          <span className="inline-block min-w-[55mm] border-b border-black px-2 text-center">
            {data.hospital}
          </span>{" "}
          (pangalan ng hospital) at walang maaring
          ipagamit na hospital beds sa
          kasalukuyang panahon.
        </p>

        <p className="my-3 text-justify">
          Lahat ng pagkasira o pagkawala na
          natamo ng Ambulance Stretcher habang
          ito ay nasa pangangalaga ng nanghihiram
          ay pananagutan at responsibilidad
          niya.
        </p>
      </section>

      {/* Signatures */}
      <section className="mx-4 mt-10 flex justify-between gap-6">
        <div className="w-1/2 text-center">
          <p className="m-0 min-h-[8mm] font-[cursive] text-[12pt]">
            {data.borrowerSignature}
          </p>

          <div className="border-b border-black" />

          <p className="mb-0 mt-1 text-[10.5pt] font-bold">
            Borrower
          </p>

          <p className="m-0 text-[9pt] italic">
            (Signature over Printed Name)
          </p>

          <p className="mb-0 mt-2 text-[10pt]">
            <span className="font-bold">
              Contact No.:{" "}
            </span>

            {data.contact_num}
          </p>
        </div>

        <div className="w-1/2 text-center">
          <p className="m-0 min-h-[8mm] font-[cursive] text-[12pt]">
            {data.requested_by}
          </p>

          <div className="border-b border-black" />

          <p className="mb-0 mt-1 text-[10.5pt] font-bold">
            Noted By
          </p>

          <p className="m-0 text-[9pt] italic">
            (Signature over Printed Name)
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-5 text-[10pt]">
        <p className="my-0.5 font-bold">
          MDRRMO HOTLINE NUMBERS:
        </p>

        <p className="my-0.5">
          LANDLINE: 410-6725 / 410-5728
        </p>

        <p className="my-0.5">
          MOBILE: 0917 812 8187
        </p>
      </footer>
    </article>
  );
}

/* =============================================================
 * MAIN COMPONENT
 * ============================================================= */

export default function BorrowerSlip() {
  const navigate = useNavigate();

  const printTimerRef = useRef(null);

  const [slip, setSlip] =
    useState(createEmptySlip);

  const [staffProfile, setStaffProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [submittedSlip, setSubmittedSlip] =
    useState(null);

  const [printMode, setPrintMode] =
    useState(null);

  /* ===========================================================
     CLEANUP
  =========================================================== */

  useEffect(() => {
    return () => {
      if (printTimerRef.current) {
        window.clearTimeout(
          printTimerRef.current,
        );
      }
    };
  }, []);

  /* ===========================================================
     VERIFY CURRENT STAFF OR ADMINISTRATOR
  =========================================================== */

  useEffect(() => {
    let active = true;

    const redirectToLogin = (message) => {
      navigate("/admin/login", {
        replace: true,
        state: {
          error: message,
        },
      });
    };

    const verifyPersonnel = async () => {
      const storedStaff =
        readLocalSession("currentStaff");

      if (!storedStaff) {
        redirectToLogin(
          "Staff login is required to create a borrower slip.",
        );

        return;
      }

      const workId = cleanText(
        storedStaff.user_id ||
          storedStaff.id,
      );

      if (!workId) {
        localStorage.removeItem(
          "currentStaff",
        );

        redirectToLogin(
          "Your session is missing a staff ID. Please log in again.",
        );

        return;
      }

      try {
        const sessionRole = cleanText(
          storedStaff.role,
        ).toLowerCase();

        const sessionSource =
          cleanText(storedStaff.source).toLowerCase();

        const isAdminSession =
          sessionRole === "admin" ||
          sessionSource === "admin_users";

        let account = null;

        if (isAdminSession) {
          const adminColumns =
            "id, user_id, custom_id, username, full_name, email, role, created_at";

          const byWorkId = await supabase
            .from("admin_users")
            .select(adminColumns)
            .eq("custom_id", workId)
            .maybeSingle();

          if (byWorkId.error) {
            throw byWorkId.error;
          }

          account = byWorkId.data;

          if (
            !account &&
            storedStaff.username
          ) {
            const byUsername =
              await supabase
                .from("admin_users")
                .select(adminColumns)
                .eq(
                  "username",
                  cleanText(
                    storedStaff.username,
                  ),
                )
                .maybeSingle();

            if (byUsername.error) {
              throw byUsername.error;
            }

            account = byUsername.data;
          }

          if (
            !account &&
            storedStaff.email
          ) {
            const byEmail =
              await supabase
                .from("admin_users")
                .select(adminColumns)
                .eq(
                  "email",
                  cleanText(
                    storedStaff.email,
                  ).toLowerCase(),
                )
                .maybeSingle();

            if (byEmail.error) {
              throw byEmail.error;
            }

            account = byEmail.data;
          }
        } else {
          const staffColumns =
            "id, user_id, username, full_name, email, role, department, mobile_number, is_active, created_at";

          const byWorkId = await supabase
            .from("staff_users")
            .select(staffColumns)
            .eq("user_id", workId)
            .maybeSingle();

          if (byWorkId.error) {
            throw byWorkId.error;
          }

          account = byWorkId.data;

          if (
            !account &&
            storedStaff.username
          ) {
            const byUsername =
              await supabase
                .from("staff_users")
                .select(staffColumns)
                .eq(
                  "username",
                  cleanText(
                    storedStaff.username,
                  ),
                )
                .maybeSingle();

            if (byUsername.error) {
              throw byUsername.error;
            }

            account = byUsername.data;
          }
        }

        if (!active) {
          return;
        }

        if (!account) {
          localStorage.removeItem(
            "currentStaff",
          );

          redirectToLogin(
            "Your personnel account could not be found. Please log in again.",
          );

          return;
        }

        if (
          account.is_active === false ||
          storedStaff.is_active === false
        ) {
          localStorage.removeItem(
            "currentStaff",
          );

          redirectToLogin(
            "Your personnel account has been deactivated.",
          );

          return;
        }

        const fullName =
          account.full_name ||
          storedStaff.full_name ||
          storedStaff.username ||
          workId ||
          "Staff Member";

        const role = cleanText(
          account.role ||
            storedStaff.role ||
            "staff",
        ).toLowerCase();

        const contact =
          account.mobile_number ||
          storedStaff.mobile_number ||
          account.email ||
          storedStaff.email ||
          "";

        const department =
          account.department ||
          storedStaff.department ||
          "";

        if (active) {
          setStaffProfile({
            id: account.id,
            user_id:
              account.user_id ||
              account.custom_id ||
              workId,
            fullName,
            email:
              account.email ||
              storedStaff.email ||
              "No email address",
            contact,
            role,
            department,
            source: isAdminSession
              ? "admin_users"
              : "staff_users",
            createdAt:
              account.created_at ||
              storedStaff.created_at ||
              null,
          });

          setLoading(false);
        }
      } catch (verificationError) {
        console.error(
          "Staff verification failed:",
          verificationError,
        );

        if (active) {
          setLoadError(
            verificationError?.message ||
              "Your personnel account could not be verified.",
          );

          setLoading(false);
        }
      }
    };

    verifyPersonnel();

    return () => {
      active = false;
    };
  }, [navigate]);

  /* ===========================================================
     VALIDATION
  =========================================================== */

  const validateForm = useCallback(() => {
    const errors = {};

    if (!cleanText(slip.date)) {
      errors.date = "Date is required.";
    }

    if (!cleanText(slip.time)) {
      errors.time = "Time is required.";
    }

    if (!cleanText(slip.plateNo)) {
      errors.plateNo =
        "Ambulance plate number is required.";
    }

    if (!cleanText(slip.driver)) {
      errors.driver =
        "Ambulance driver is required.";
    }

    if (!cleanText(slip.borrowerName)) {
      errors.borrowerName =
        "Borrower name is required.";
    }

    if (!cleanText(slip.residentOf)) {
      errors.residentOf =
        "Borrower residence is required.";
    }

    const contactDigits = getPhoneDigits(
      slip.contactNum,
    );

    if (!contactDigits) {
      errors.contactNum =
        "Contact number is required.";
    } else if (
      !/^0\d{10}$/.test(contactDigits)
    ) {
      errors.contactNum =
        "Enter a valid Philippine mobile number, such as 09171234567.";
    }

    if (!cleanText(slip.hospital)) {
      errors.hospital =
        "Hospital name is required.";
    }

    if (!cleanText(slip.borrowerSignature)) {
      errors.borrowerSignature =
        "Borrower's printed signature name is required.";
    }

    return errors;
  }, [slip]);

  /* ===========================================================
     FORM HANDLERS
  =========================================================== */

  const handleChange = useCallback(
    (event) => {
      const { name, value } = event.target;

      setSlip((previous) => ({
        ...previous,
        [name]:
          name === "plateNo"
            ? value.toUpperCase()
            : value,
      }));

      setFieldErrors((previous) => ({
        ...previous,
        [name]: "",
      }));

      setError("");
      setSuccess("");
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSlip(createEmptySlip());
    setFieldErrors({});
    setError("");
    setSuccess("");
  }, []);

  /* ===========================================================
     SUBMIT
  =========================================================== */

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (
        submitting ||
        submittedSlip
      ) {
        return;
      }

      setError("");
      setSuccess("");
      setFieldErrors({});

      if (!staffProfile?.id) {
        setError(
          "Your personnel account could not be verified. Please log in again.",
        );

        return;
      }

      const validationErrors =
        validateForm();

      if (
        Object.keys(validationErrors).length > 0
      ) {
        setFieldErrors(validationErrors);

        setError(
          "Please complete all required fields before saving the borrower slip.",
        );

        return;
      }

      setSubmitting(true);

      try {
        const payload = {
          date: cleanText(slip.date),
          time: cleanText(slip.time),

          plateNo:
            cleanText(slip.plateNo).toUpperCase(),

          driver: cleanText(slip.driver),

          borrower_name:
            cleanText(slip.borrowerName),

          resident_of:
            cleanText(slip.residentOf),

          contact_num:
            getPhoneDigits(slip.contactNum),

          hospital:
            cleanText(slip.hospital),

          requested_by:
            staffProfile.fullName,

          staff_id: staffProfile.id,
          user_id: null,
        };

        const { error: insertError } =
          await supabase
            .from("borrower_slip")
            .insert(payload);

        if (insertError) {
          throw new Error(
            insertError.message ||
              "The borrower slip could not be saved.",
          );
        }

        setSubmittedSlip({
          ...payload,
          borrowerSignature:
            cleanText(slip.borrowerSignature),
        });

        setPrintMode(null);

        setSuccess(
          "Borrower slip saved successfully. You may now print the office or borrower copy.",
        );

        setSlip(createEmptySlip());

        window.dispatchEvent(
          new Event(
            "mdrrmo:notif-refresh",
          ),
        );
      } catch (submitError) {
        console.error(
          "Borrower slip submit error:",
          submitError,
        );

        setError(
          submitError?.message ||
            "The borrower slip could not be saved. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      slip,
      staffProfile,
      submittedSlip,
      submitting,
      validateForm,
    ],
  );

  /* ===========================================================
     PRINT
  =========================================================== */

  const handlePrint = useCallback(
    (mode) => {
      if (!submittedSlip) {
        return;
      }

      setPrintMode(mode);

      if (printTimerRef.current) {
        window.clearTimeout(
          printTimerRef.current,
        );
      }

      printTimerRef.current =
        window.setTimeout(() => {
          window.print();
        }, 150);
    },
    [submittedSlip],
  );

  const startNewSlip = useCallback(() => {
    setSubmittedSlip(null);
    setPrintMode(null);
    setSlip(createEmptySlip());
    setFieldErrors({});
    setError("");
    setSuccess("");
  }, []);

  /* ===========================================================
     LOADING SCREEN
  =========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Verifying your personnel account...
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Checking staff permissions before creating the borrower slip.
          </p>
        </div>
      </div>
    );
  }

  /* ===========================================================
     LOAD ERROR
  =========================================================== */

  if (loadError || !staffProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600" />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50">
              <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Personnel account unavailable
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {loadError ||
                "Your personnel account could not be verified."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/login", {
                  replace: true,
                })
              }
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              <ArrowLeft className="h-4 w-4" />

              Return to Personnel Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const staffInitials = getInitials(
    staffProfile.fullName,
  );

  const roleLabel = getRoleLabel(
    staffProfile.role,
  );

  const accountDetail = [
    staffProfile.contact ||
      staffProfile.email,
    staffProfile.department,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ===========================================================
     PAGE
  =========================================================== */

  return (
    <>
      {/* =========================================================
          PRINT LAYOUT
      ========================================================= */}

      <div className="borrower-slip-print-root hidden">
        {submittedSlip &&
          printMode &&
          (printMode === "office" ||
            printMode === "both") && (
            <div className="borrower-slip-print-page">
              <SlipCopy
                data={submittedSlip}
                copyLabel="Office Copy"
              />
            </div>
          )}

        {submittedSlip &&
          printMode &&
          (printMode === "borrower" ||
            printMode === "both") && (
            <div className="borrower-slip-print-page">
              <SlipCopy
                data={submittedSlip}
                copyLabel="Borrower's Copy"
              />
            </div>
          )}
      </div>

      {/* =========================================================
          FORM
      ========================================================= */}

      <RequestFormShell
        formId="borrower-slip-form"
        icon={FileText}
        eyebrow="MDRRMO Personnel Service"
        title="Create Borrower Slip"
        description="Record the temporary custody of an ambulance stretcher and generate the official acknowledgment copy."
        account={{
          initials: staffInitials,
          name: staffProfile.fullName,
          detail:
            accountDetail ||
            "Verified personnel account",
          badge: roleLabel,
        }}
        onSubmit={handleSubmit}
        onReset={
          submittedSlip
            ? startNewSlip
            : handleReset
        }
        error={error}
        success={success}
        submitting={submitting}
        submitDisabled={Boolean(submittedSlip)}
        submitLabel="Save Borrower Slip"
        submitIcon={FileText}
        resetLabel={
          submittedSlip
            ? "Create Another Slip"
            : "Clear Form"
        }
        maxWidth="max-w-5xl"
        footerNote="The borrower must receive the printed acknowledgment copy and sign over the printed borrower name. The borrower signature name is used for the printed form only and is not stored in the borrower_slip table."
      >
        {/* =======================================================
            SUCCESS PRINT PANEL
        ======================================================= */}

        {submittedSlip && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/70 dark:bg-emerald-950/40">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-emerald-900 dark:text-emerald-100">
                  Borrower slip saved
                </h2>

                <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                  Choose the acknowledgment copy you want to print.
                </p>
              </div>
            </div>

            {/* Submitted summary */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Borrower
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                  {
                    submittedSlip.borrower_name
                  }
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Ambulance
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                  {
                    submittedSlip.plateNo
                  }{" "}
                  · {submittedSlip.driver}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Hospital
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                  {submittedSlip.hospital}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Noted By
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                  {submittedSlip.requested_by}
                </p>
              </div>
            </div>

            {/* Print buttons */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  handlePrint("office")
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />

                Office Copy
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePrint("borrower")
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-700"
              >
                <Printer className="h-4 w-4" />

                Borrower's Copy
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePrint("both")
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <Printer className="h-4 w-4" />

                Print Both Copies
              </button>
            </div>
          </section>
        )}

        {/* =======================================================
            FORM CONTENT
        ======================================================= */}

        {!submittedSlip && (
          <>
            {/* Step 01 */}
            <section>
              <FormSectionHeading
                icon={CalendarDays}
                step="01"
                title="Slip Schedule"
                description="Enter the official date and time when the borrower slip was issued."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="date"
                  label="Issue Date"
                  required
                  error={fieldErrors.date}
                >
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="date"
                      name="date"
                      type="date"
                      value={slip.date}
                      onChange={handleChange}
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      required
                    />
                  </div>
                </FormField>

                <FormField
                  id="time"
                  label="Issue Time"
                  required
                  error={fieldErrors.time}
                >
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="time"
                      name="time"
                      type="time"
                      value={slip.time}
                      onChange={handleChange}
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      required
                    />
                  </div>
                </FormField>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

            {/* Step 02 */}
            <section>
              <FormSectionHeading
                icon={FileText}
                step="02"
                title="Ambulance Details"
                description="Enter the ambulance plate number and assigned driver."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="plateNo"
                  label="Ambulance Plate Number"
                  required
                  hint="Example: CAV-1234"
                  error={fieldErrors.plateNo}
                >
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="plateNo"
                      name="plateNo"
                      type="text"
                      value={slip.plateNo}
                      onChange={handleChange}
                      placeholder="e.g. CAV-1234"
                      className={`${FORM_INPUT_CLASS} pl-11 uppercase`}
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                  </div>
                </FormField>

                <FormField
                  id="driver"
                  label="Ambulance Driver"
                  required
                  error={fieldErrors.driver}
                >
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="driver"
                      name="driver"
                      type="text"
                      value={slip.driver}
                      onChange={handleChange}
                      placeholder="Enter the driver's full name"
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      autoComplete="name"
                      required
                    />
                  </div>
                </FormField>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

            {/* Step 03 */}
            <section>
              <FormSectionHeading
                icon={UserRound}
                step="03"
                title="Borrower Information"
                description="Identify the person who will temporarily hold the ambulance stretcher."
              />

              <div className="space-y-5">
                <FormField
                  id="borrowerName"
                  label="Borrower's Full Name"
                  required
                  error={fieldErrors.borrowerName}
                >
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="borrowerName"
                      name="borrowerName"
                      type="text"
                      value={slip.borrowerName}
                      onChange={handleChange}
                      placeholder="Full name of the borrower"
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      autoComplete="name"
                      required
                    />
                  </div>
                </FormField>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    id="residentOf"
                    label="Resident Of"
                    required
                    error={fieldErrors.residentOf}
                  >
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        id="residentOf"
                        name="residentOf"
                        type="text"
                        value={slip.residentOf}
                        onChange={handleChange}
                        placeholder="e.g. Brgy. Bagong Kalsada, Naic"
                        className={`${FORM_INPUT_CLASS} pl-11`}
                        autoComplete="street-address"
                        required
                      />
                    </div>
                  </FormField>

                  <FormField
                    id="contactNum"
                    label="Borrower's Contact Number"
                    required
                    hint="Use an active Philippine mobile number."
                    error={fieldErrors.contactNum}
                  >
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        id="contactNum"
                        name="contactNum"
                        type="tel"
                        inputMode="tel"
                        value={slip.contactNum}
                        onChange={handleChange}
                        placeholder="e.g. 0917 123 4567"
                        className={`${FORM_INPUT_CLASS} pl-11`}
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

            {/* Step 04 */}
            <section>
              <FormSectionHeading
                icon={Building2}
                step="04"
                title="Hospital & Acknowledgment"
                description="Identify the hospital and enter the borrower's printed signature name."
              />

              <div className="space-y-5">
                <FormField
                  id="hospital"
                  label="Hospital"
                  required
                  hint="Enter the hospital with a shortage of available beds."
                  error={fieldErrors.hospital}
                >
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="hospital"
                      name="hospital"
                      type="text"
                      value={slip.hospital}
                      onChange={handleChange}
                      placeholder="e.g. Naic Doctors Hospital"
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      autoComplete="organization"
                      required
                    />
                  </div>
                </FormField>

                <FormField
                  id="borrowerSignature"
                  label="Borrower's Printed Signature Name"
                  required
                  hint="The borrower must sign over this printed name when receiving the slip."
                  error={
                    fieldErrors.borrowerSignature
                  }
                >
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="borrowerSignature"
                      name="borrowerSignature"
                      type="text"
                      value={slip.borrowerSignature}
                      onChange={handleChange}
                      placeholder="Borrower's full name as signature"
                      className={`${FORM_INPUT_CLASS} pl-11`}
                      autoComplete="name"
                      required
                    />
                  </div>
                </FormField>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

            {/* Agreement */}
            <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/40">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-black text-amber-900 dark:text-amber-100">
                  Temporary custody agreement
                </p>

                <p className="mt-1 text-xs leading-6 text-amber-800 dark:text-amber-200">
                  Lahat ng pagkasira o pagkawala na natamo ng Ambulance Stretcher habang ito ay nasa pangangalaga ng nanghihiram ay pananagutan at responsibilidad ng nanghihiram.
                </p>
              </div>
            </section>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/70 dark:bg-blue-950/40">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-sm font-black text-blue-900 dark:text-blue-100">
                  Personnel record
                </p>

                <p className="mt-1 text-xs leading-6 text-blue-800 dark:text-blue-200">
                  This borrower slip will be automatically recorded under your verified personnel account. The borrower must receive and sign the printed acknowledgment copy.
                </p>
              </div>
            </div>
          </>
        )}
      </RequestFormShell>

      {/* =========================================================
          PRINT STYLES
      ========================================================= */}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body,
          #root {
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .borrower-slip-print-root {
            display: block !important;
            position: static !important;
            visibility: visible !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .borrower-slip-print-root,
          .borrower-slip-print-root * {
            visibility: visible !important;
          }

          .borrower-slip-print-page {
            display: block !important;
            width: 100% !important;
            min-height: 260mm !important;
            margin: 0 !important;
            padding: 0 !important;
            break-after: page;
            page-break-after: always;
            overflow: visible !important;
          }

          .borrower-slip-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .slip-copy {
            width: 100% !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            color: #000000 !important;
            font-size: 11.5pt !important;
            line-height: 1.45 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .slip-copy img {
            max-width: 24mm !important;
            max-height: 24mm !important;
            object-fit: contain !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
