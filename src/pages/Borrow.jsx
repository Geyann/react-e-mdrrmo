"use client";

import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Ambulance,
  CalendarDays,
  CarFront,
  Clock3,
  Gauge,
  Loader2,
  LogIn,
  MapPin,
  Route,
  UserRound,
} from "lucide-react";

import { supabase } from "../createClient";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

const EMPTY_BORROW = {
  dispatchNum: "",
  departure: "",
  arrival: "",
  vehicle: "",
  purpose: "",
  destination: "",
  date: "",
  time: "",
};

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

export default function Borrow() {
  const navigate = useNavigate();

  const [borrow, setBorrow] =
    useState(EMPTY_BORROW);

  const [requester, setRequester] =
    useState(null);

  const [loadingRequester, setLoadingRequester] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRequester = async () => {
      try {
        /*
         * 1. Staff or administrator session
         */
        const storedStaff =
          readLocalSession("currentStaff");

        if (storedStaff) {
          const workId =
            storedStaff.user_id ||
            storedStaff.id;

          if (!workId) {
            throw new Error(
              "Your staff session is missing its work ID.",
            );
          }

          const { data: staff, error: staffError } =
            await supabase
              .from("staff_users")
              .select(
                "id, user_id, full_name, mobile_number, email, role, department, is_active",
              )
              .eq("user_id", workId)
              .maybeSingle();

          if (staffError) {
            throw staffError;
          }

          if (
            staff?.is_active === false ||
            storedStaff.is_active === false
          ) {
            throw new Error(
              "Your staff account has been deactivated.",
            );
          }

          if (staff) {
            const contact =
              staff.mobile_number ||
              storedStaff.mobile_number ||
              staff.email ||
              "";

            const fullName =
              staff.full_name ||
              storedStaff.full_name ||
              staff.role ||
              "Staff Member";

            if (!cancelled) {
              setRequester({
                profileId: null,
                staffId: staff.id,
                fullName,
                contact,
                isStaff: true,
                role: staff.role,
                department:
                  staff.department || "",
              });
            }

            return;
          }

          /*
           * Compatibility fallback for staff accounts
           * that also have a resident profile.
           */
          const { data: profile, error: profileError } =
            await supabase
              .from("profiles")
              .select(
                "id, full_name, mobile_number, email, role",
              )
              .eq("user_id", workId)
              .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (profile?.id) {
            const contact =
              profile.mobile_number ||
              storedStaff.mobile_number ||
              profile.email ||
              "";

            const fullName =
              profile.full_name ||
              storedStaff.full_name ||
              storedStaff.role ||
              "Staff Member";

            if (!cancelled) {
              setRequester({
                profileId: profile.id,
                staffId: staff?.id || null,
                fullName,
                contact,
                isStaff: true,
                role: staff?.role || "staff",
                department:
                  staff?.department || "",
              });
            }

            return;
          }

          throw new Error(
            "Your staff account could not be verified. Ask an administrator to confirm your staff_users row.",
          );
        }

        /*
         * 2. Regular resident session
         */
        const storedUser =
          readLocalSession("currentUser");

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

          if (!cancelled) {
            setRequester({
              profileId: profileData.id,
              staffId: null,
              fullName,
              contact,
              isStaff: false,
              role: profileData.role || "user",
              department: "",
            });
          }

          return;
        }

        /*
         * 3. No authenticated account
         */
        if (!cancelled) {
          setError(
            "Please log in before requesting a vehicle.",
          );

          navigate("/login", {
            replace: true,
            state: {
              error:
                "Please log in before requesting a vehicle.",
            },
          });
        }
      } catch (loadError) {
        console.error(
          "Error loading requester:",
          loadError,
        );

        if (!cancelled) {
          setError(
            loadError?.message ||
              "Failed to load your account. Please log in again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingRequester(false);
        }
      }
    };

    loadRequester();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setBorrow((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  };

  const handleReset = () => {
    setBorrow(EMPTY_BORROW);
    setError("");
    setSuccess("");
  };

  const submitRequest = async (
    event,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!requester) {
        throw new Error(
          "No authenticated account was found. Please log in.",
        );
      }

      if (
        requester.isStaff &&
        !requester.staffId &&
        !requester.profileId
      ) {
        throw new Error(
          "Your staff account could not be linked to this request.",
        );
      }

      if (
        !requester.isStaff &&
        !requester.profileId
      ) {
        throw new Error(
          "Your resident profile could not be linked to this request.",
        );
      }

      const payload = {
        dispatchNum:
          borrow.dispatchNum.trim(),

        departure:
          borrow.departure.trim(),

        arrival:
          borrow.arrival.trim(),

        contactNum:
          requester.contact,

        vehicle: borrow.vehicle,

        requestedBy:
          requester.fullName,

        purpose:
          borrow.purpose.trim(),

        destination:
          borrow.destination.trim(),

        date: borrow.date,
        time: borrow.time,

        staffId:
          requester.isStaff &&
          requester.staffId
            ? requester.staffId
            : null,

        userId:
          requester.isStaff
            ? requester.profileId || null
            : requester.profileId,
      };

      const { error: insertError } =
        await supabase
          .from("borrow-vehicle")
          .insert([payload]);

      if (insertError) {
        throw new Error(
          insertError.message,
        );
      }

      setSuccess(
        "Your emergency vehicle dispatch request was submitted successfully and is now awaiting review.",
      );

      setBorrow(EMPTY_BORROW);

      window.dispatchEvent(
        new Event(
          "mdrrmo:notif-refresh",
        ),
      );
    } catch (submitError) {
      console.error(
        "Dispatch request error:",
        submitError,
      );

      setError(
        submitError?.message ||
          "Failed to submit the vehicle request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRequester) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Verifying your dispatch account...
          </p>
        </div>
      </div>
    );
  }

  if (!requester) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600" />

          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50">
              <Ambulance className="h-8 w-8 text-rose-600" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Account required
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "You must be logged in before requesting a vehicle."}
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
      icon={Ambulance}
      eyebrow="Emergency Transport"
      title="Vehicle Dispatch Request"
      description="Request an emergency response vehicle and provide the dispatch, odometer, and trip information."
      account={{
        name: requester.fullName,
        detail:
          requester.contact ||
          "No contact number available",
        badge: requester.isStaff
          ? requester.role || "Staff"
          : "Resident",
      }}
      onSubmit={submitRequest}
      onReset={handleReset}
      error={error}
      success={success}
      submitting={submitting}
      submitLabel="Submit Vehicle Request"
      submitIcon={Ambulance}
      resetLabel="Reset Request"
      maxWidth="max-w-5xl"
      footerNote="Dispatch requests are reviewed by authorized MDRRMO personnel. Contact information is taken from your verified account and cannot be edited in this form."
    >
      <section>
        <FormSectionHeading
          icon={Route}
          step="01"
          title="Dispatch Information"
          description="Enter the dispatch reference and travel date."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="dispatchNum"
            label="Dispatch Number"
            required
          >
            <div className="relative">
              <Route className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="dispatchNum"
                name="dispatchNum"
                type="text"
                value={borrow.dispatchNum}
                onChange={handleChange}
                placeholder="e.g. DISP-2026-001"
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="date"
            label="Dispatch Date"
            required
          >
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="date"
                name="date"
                type="date"
                value={borrow.date}
                onChange={handleChange}
                min={localDateKey()}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="time"
            label="Dispatch Time"
            required
          >
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="time"
                name="time"
                type="time"
                value={borrow.time}
                onChange={handleChange}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="vehicle"
            label="Vehicle to Be Used"
            required
          >
            <div className="relative">
              <CarFront className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                id="vehicle"
                name="vehicle"
                value={borrow.vehicle}
                onChange={handleChange}
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              >
                <option value="">
                  Select a vehicle
                </option>

                <option value="ambulance">
                  Ambulance
                </option>

                <option value="rescue-truck">
                  Rescue Truck
                </option>

                <option value="utility-van">
                  Utility Van
                </option>
              </select>
            </div>
          </FormField>
        </div>
      </section>

      <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" />

      <section>
        <FormSectionHeading
          icon={Gauge}
          step="02"
          title="Odometer Information"
          description="Record the vehicle's starting and ending kilometer readings."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="departure"
            label="Starting Odometer Reading"
            required
          >
            <div className="relative">
              <Gauge className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="departure"
                name="departure"
                type="text"
                inputMode="decimal"
                value={borrow.departure}
                onChange={handleChange}
                placeholder="e.g. 12,450 km"
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>

          <FormField
            id="arrival"
            label="Ending Odometer Reading"
            required
          >
            <div className="relative">
              <Gauge className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="arrival"
                name="arrival"
                type="text"
                inputMode="decimal"
                value={borrow.arrival}
                onChange={handleChange}
                placeholder="e.g. 12,512 km"
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
          icon={MapPin}
          step="03"
          title="Trip Purpose & Destination"
          description="Explain why the vehicle is needed and where it is going."
        />

        <div className="grid gap-5">
          <FormField
            id="purpose"
            label="Purpose"
            required
          >
            <input
              id="purpose"
              name="purpose"
              type="text"
              value={borrow.purpose}
              onChange={handleChange}
              placeholder="e.g. Transport patient to the hospital"
              className={FORM_INPUT_CLASS}
              required
            />
          </FormField>

          <FormField
            id="destination"
            label="Destination"
            required
          >
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="destination"
                name="destination"
                type="text"
                value={borrow.destination}
                onChange={handleChange}
                placeholder="e.g. Naic Doctors Hospital"
                className={`${FORM_INPUT_CLASS} pl-11`}
                required
              />
            </div>
          </FormField>
        </div>
      </section>

      <div className="mt-7 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <p className="text-xs leading-6">
          The request will be automatically linked to {requester.fullName}. Review the odometer readings and destination before submitting.
        </p>
      </div>
    </RequestFormShell>
  );
}
