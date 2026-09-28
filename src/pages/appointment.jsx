"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";

import { supabase } from "../createClient";

import RequestFormShell, {
  FORM_INPUT_CLASS,
  FormField,
  FormSectionHeading,
} from "../components/RequestFormShell";

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date, amount) {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + amount);

  return next;
}

function monthStart(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  );
}

function sameMonth(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

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

function buildAvailableDates(
  bookingCounts,
  unavailableDates,
  limits,
) {
  const available = [];

  const tomorrow = addDays(
    new Date(),
    1,
  );

  for (let i = 0; i < 90; i += 1) {
    const checkDate = addDays(
      tomorrow,
      i,
    );

    const dateKey = localDateKey(
      checkDate,
    );

    if (
      unavailableDates.includes(dateKey)
    ) {
      continue;
    }

    const bookingCount =
      bookingCounts[dateKey] || 0;

    const limit = limits[dateKey];

    if (
      limit &&
      bookingCount >= limit
    ) {
      continue;
    }

    available.push(dateKey);
  }

  return available;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export default function AppointmentForm() {
  const [currentUser, setCurrentUser] =
    useState(null);

  const [resolvingUser, setResolvingUser] =
    useState(true);

  const [formData, setFormData] =
    useState({
      fullName: "",
      purpose: "",
      date: "",
      time: "",
      reason: "",
    });

  const [availableDates, setAvailableDates] =
    useState([]);

  const [unavailableDates, setUnavailableDates] =
    useState([]);

  const [dateVolumeLimits, setDateVolumeLimits] =
    useState({});

  const [bookingsPerDate, setBookingsPerDate] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  useEffect(() => {
    let active = true;

    const fetchCurrentUser =
      async () => {
        try {
          const storedUser =
            readLocalSession(
              "currentUser",
            );

          if (storedUser) {
            let fullName =
              storedUser.full_name ||
              [
                storedUser.first_name,
                storedUser.middle_name,
                storedUser.last_name,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();

            if (storedUser.email) {
              const [
                { data: profile },
                { data: pending },
              ] = await Promise.all([
                supabase
                  .from("profiles")
                  .select(
                    "full_name, first_name, middle_name, last_name",
                  )
                  .eq(
                    "email",
                    storedUser.email,
                  )
                  .maybeSingle(),

                supabase
                  .from(
                    "pending_registrations",
                  )
                  .select(
                    "first_name, middle_name, last_name, full_name",
                  )
                  .eq(
                    "email",
                    storedUser.email,
                  )
                  .maybeSingle(),
              ]);

              fullName =
                profile?.full_name ||
                pending?.full_name ||
                [
                  profile?.first_name ||
                    pending?.first_name,
                  profile?.middle_name ||
                    pending?.middle_name,
                  profile?.last_name ||
                    pending?.last_name,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                fullName;
            }

            if (active) {
              setCurrentUser(storedUser);

              setFormData((previous) => ({
                ...previous,
                fullName,
              }));
            }

            setResolvingUser(false);

            return;
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && active) {
            let fullName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "";

            const { data: profile } =
              await supabase
                .from("profiles")
                .select(
                  "full_name, first_name, middle_name, last_name",
                )
                .eq("id", user.id)
                .maybeSingle();

            fullName =
              profile?.full_name ||
              [
                profile?.first_name,
                profile?.middle_name,
                profile?.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              fullName ||
              user.email ||
              "Resident";

            setCurrentUser({
              ...user,
              full_name: fullName,
            });

            setFormData((previous) => ({
              ...previous,
              fullName,
            }));
          } else if (active) {
            setError(
              "You must be logged in before creating an appointment.",
            );
          }
        } catch (loadError) {
          console.error(
            "Error fetching user:",
            loadError,
          );

          if (active) {
            setError(
              loadError?.message ||
                "Failed to load your account.",
            );
          }
        } finally {
          if (active) {
            setResolvingUser(false);
          }
        }
      };

    fetchCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchAvailabilityData =
      async () => {
        try {
          setLoading(true);
          setError("");

          const [
            { data: appointments, error: appointmentError },
            {
              data: restrictions,
              error: restrictionError,
            },
          ] = await Promise.all([
            supabase
              .from("appointments")
              .select("date"),

            supabase
              .from("date_restrictions")
              .select(
                "date, is_unavailable, volume_limit",
              ),
          ]);

          if (appointmentError) {
            throw appointmentError;
          }

          if (
            restrictionError &&
            restrictionError.code !==
              "PGRST116"
          ) {
            throw restrictionError;
          }

          const bookingCounts = {};

          appointments?.forEach(
            (appointment) => {
              bookingCounts[
                appointment.date
              ] =
                (
                  bookingCounts[
                    appointment.date
                  ] || 0
                ) + 1;
            },
          );

          const unavailable = [];
          const limits = {};

          restrictions?.forEach(
            (restriction) => {
              if (
                restriction.is_unavailable
              ) {
                unavailable.push(
                  restriction.date,
                );
              }

              if (
                restriction.volume_limit
              ) {
                limits[restriction.date] =
                  restriction.volume_limit;
              }
            },
          );

          const available =
            buildAvailableDates(
              bookingCounts,
              unavailable,
              limits,
            );

          if (!active) {
            return;
          }

          setUnavailableDates(
            unavailable,
          );

          setDateVolumeLimits(limits);
          setBookingsPerDate(
            bookingCounts,
          );

          setAvailableDates(available);
        } catch (loadError) {
          console.error(
            "Error fetching appointment availability:",
            loadError,
          );

          if (active) {
            setError(
              loadError?.message ||
                "Failed to load available appointment dates.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    fetchAvailabilityData();

    return () => {
      active = false;
    };
  }, []);

  const getAccountSnapshot =
    async (
      authUserId,
      userEmail,
    ) => {
      const snapshot = {};

      const profileFields =
        "email, first_name, middle_name, last_name, age, birthdate, address, mobile_number, username, role, is_active";

      if (authUserId) {
        const { data } = await supabase
          .from("profiles")
          .select(profileFields)
          .eq("id", authUserId)
          .maybeSingle();

        if (data) {
          Object.assign(snapshot, data);
        }
      }

      if (
        !snapshot.email &&
        userEmail
      ) {
        const { data } = await supabase
          .from("profiles")
          .select(profileFields)
          .eq("email", userEmail)
          .maybeSingle();

        if (data) {
          Object.assign(snapshot, data);
        }
      }

      const pendingFields =
        "email, first_name, middle_name, last_name, age, birthdate, address, mobile_number, username, role, id_number, id_image_url, status";

      if (userEmail || authUserId) {
        let query = supabase
          .from("pending_registrations")
          .select(pendingFields);

        query = userEmail
          ? query.eq(
              "email",
              userEmail,
            )
          : query.eq(
              "user_id",
              authUserId,
            );

        const { data } =
          await query.maybeSingle();

        if (data) {
          Object.assign(snapshot, data);
        }
      }

      return snapshot;
    };

  const createAppointment =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (!currentUser) {
        setError(
          "You must be logged in to create an appointment.",
        );

        return;
      }

      if (
        !availableDates.includes(
          formData.date,
        )
      ) {
        setError(
          "This date is no longer available. Please select another date.",
        );

        return;
      }

      const bookingCount =
        bookingsPerDate[
          formData.date
        ] || 0;

      const limit =
        dateVolumeLimits[
          formData.date
        ];

      if (
        limit &&
        bookingCount >= limit
      ) {
        setError(
          "This date has reached its maximum appointment capacity.",
        );

        return;
      }

      if (
        !formData.fullName.trim() ||
        !formData.purpose.trim() ||
        !formData.time
      ) {
        setError(
          "Please complete all required appointment fields.",
        );

        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const authUserId =
        authUser?.id || null;

      const pendingUserId =
        currentUser?.id ||
        currentUser?.user_id ||
        null;

      const account =
        await getAccountSnapshot(
          authUserId,
          authUser?.email ||
            currentUser?.email,
        );

      const appointmentData = {
        fullName:
          formData.fullName.trim(),

        purpose:
          formData.purpose.trim(),

        date: formData.date,
        time: formData.time,

        reason:
          formData.reason.trim(),

        /*
         * Non-auth identifier. This column is text
         * and does not reference auth.users.
         */
        userId: pendingUserId,

        /*
         * Real Supabase Auth UUID only.
         */
        user_id_from_auth:
          authUserId,

        email: account.email || null,

        first_name:
          account.first_name || null,

        middle_name:
          account.middle_name || null,

        last_name:
          account.last_name || null,

        age: account.age || null,

        birthdate:
          account.birthdate || null,

        address:
          account.address || null,

        mobile_number:
          account.mobile_number || null,

        username:
          account.username || null,

        id_number:
          account.id_number || null,

        id_image_url:
          account.id_image_url || null,

        account_role:
          account.role || null,

        account_status:
          account.status || null,

        is_active:
          account.is_active ?? null,
      };

      const { error: insertError } =
        await supabase
          .from("appointments")
          .insert([appointmentData]);

      if (insertError) {
        setError(
          insertError.message ||
            "Failed to schedule the appointment.",
        );

        return;
      }

      const nextBookingCount =
        bookingCount + 1;

      const nextBookings = {
        ...bookingsPerDate,
        [formData.date]:
          nextBookingCount,
      };

      setBookingsPerDate(nextBookings);

      if (
        limit &&
        nextBookingCount >= limit
      ) {
        setAvailableDates(
          (previous) =>
            previous.filter(
              (date) =>
                date !== formData.date,
            ),
        );
      }

      setSuccess(
        "Your appointment was submitted successfully. Please wait for administrator confirmation.",
      );

      setFormData(
        (previous) => ({
          ...previous,
          purpose: "",
          date: "",
          time: "",
          reason: "",
        }),
      );

      window.dispatchEvent(
        new Event(
          "mdrrmo:notif-refresh",
        ),
      );
    };

  const handleReset = () => {
    setFormData(
      (previous) => ({
        ...previous,
        purpose: "",
        date: "",
        time: "",
        reason: "",
      }),
    );

    setError("");
    setSuccess("");
  };

  const dateKeyForDay = (day) => {
    return localDateKey(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      ),
    );
  };

  const isDateAvailable = (day) => {
    return availableDates.includes(
      dateKeyForDay(day),
    );
  };

  const isDateUnavailable = (day) => {
    return unavailableDates.includes(
      dateKeyForDay(day),
    );
  };

  const isDateSelected = (day) => {
    return (
      formData.date ===
      dateKeyForDay(day)
    );
  };

  const isDateInPast = (day) => {
    const checkDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    return (
      checkDate <=
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      )
    );
  };

  const isDateAtCapacity = (day) => {
    const key = dateKeyForDay(day);

    const bookingCount =
      bookingsPerDate[key] || 0;

    const limit =
      dateVolumeLimits[key];

    return Boolean(
      limit &&
      bookingCount >= limit,
    );
  };

  const selectedDateBookings =
    bookingsPerDate[
      formData.date
    ] || 0;

  const handleDateSelect = (
    date,
  ) => {
    if (
      !availableDates.includes(date)
    ) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      date,
      time: "",
    }));

    setError("");
    setSuccess("");
  };

  const firstDay =
    currentMonth.getDay();

  const daysInMonth =
    new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    ).getDate();

  const days = Array.from(
    { length: firstDay },
    (_, index) => ({
      key: `empty-${index}`,
      day: null,
    }),
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      key: `day-${day}`,
      day,
    });
  }

  const today = new Date();

  const canGoPrevious =
    !sameMonth(
      currentMonth,
      today,
    );

  const maximumMonth = addDays(
    today,
    90,
  );

  const canGoNext =
    currentMonth <
    new Date(
      maximumMonth.getFullYear(),
      maximumMonth.getMonth(),
      1,
    );

  const pageLoading =
    loading || resolvingUser;

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>

          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Loading available appointment dates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RequestFormShell
      icon={CalendarDays}
      eyebrow="Public Service Appointment"
      title="Schedule an Appointment"
      description="Select an available date and provide the purpose of your visit."
      account={
        currentUser
          ? {
              name:
                formData.fullName ||
                currentUser.full_name ||
                currentUser.email,
              detail:
                currentUser.email ||
                "Verified resident account",
              badge: "Resident",
            }
          : null
      }
      onSubmit={createAppointment}
      onReset={handleReset}
      error={error}
      success={success}
      submitting={loading}
      submitDisabled={
        !currentUser ||
        availableDates.length === 0 ||
        !formData.date ||
        !formData.fullName.trim() ||
        !formData.purpose.trim() ||
        !formData.time
      }
      submitLabel="Confirm Appointment"
      submitIcon={CalendarDays}
      resetLabel="Clear Form"
      maxWidth="max-w-6xl"
      footerNote="Appointment confirmation is subject to administrator review. Select only a date highlighted as available."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Appointment fields */}
        <div>
          <section>
            <FormSectionHeading
              icon={UserRound}
              step="01"
              title="Resident Information"
              description="Confirm your name and the purpose of your visit."
            />

            <div className="space-y-5">
              <FormField
                id="fullName"
                label="Full Name"
                required
              >
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => {
                      const {
                        name,
                        value,
                      } = event.target;

                      setFormData(
                        (previous) => ({
                          ...previous,
                          [name]: value,
                        }),
                      );

                      setError("");
                      setSuccess("");
                    }}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className={`${FORM_INPUT_CLASS} pl-11`}
                    required
                  />
                </div>
              </FormField>

              <FormField
                id="purpose"
                label="Purpose of Visit"
                required
              >
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="purpose"
                    name="purpose"
                    type="text"
                    value={formData.purpose}
                    onChange={(event) => {
                      const {
                        name,
                        value,
                      } = event.target;

                      setFormData(
                        (previous) => ({
                          ...previous,
                          [name]: value,
                        }),
                      );

                      setError("");
                      setSuccess("");
                    }}
                    placeholder="What is the purpose of your visit?"
                    className={`${FORM_INPUT_CLASS} pl-11`}
                    required
                  />
                </div>
              </FormField>

              <FormField
                id="time"
                label="Preferred Time"
                required
                hint={
                  formData.date
                    ? undefined
                    : "Select an available date first."
                }
              >
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={(event) => {
                      const {
                        name,
                        value,
                      } = event.target;

                      setFormData(
                        (previous) => ({
                          ...previous,
                          [name]: value,
                        }),
                      );

                      setError("");
                      setSuccess("");
                    }}
                    disabled={!formData.date}
                    className={`${FORM_INPUT_CLASS} pl-11`}
                    required
                  />
                </div>
              </FormField>

              {formData.date && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                  <div className="text-sm">
                    <p className="font-black">
                      Selected date: {formData.date}
                    </p>

                    <p className="mt-1 text-xs leading-5">
                      Current bookings:{" "}
                      <strong>
                        {selectedDateBookings}
                      </strong>
                      {dateVolumeLimits[
                        formData.date
                      ] && (
                        <>
                          {" / "}
                          <strong>
                            {
                              dateVolumeLimits[
                                formData.date
                              ]
                            }
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <FormField
                id="reason"
                label="Reason / Additional Notes"
              >
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={(event) => {
                    const {
                      name,
                      value,
                    } = event.target;

                    setFormData(
                      (previous) => ({
                        ...previous,
                        [name]: value,
                      }),
                    );
                  }}
                  placeholder="Provide any additional details..."
                  className={`${FORM_INPUT_CLASS} min-h-32 resize-y`}
                />
              </FormField>
            </div>
          </section>
        </div>

        {/* Calendar */}
        <section>
          <div className="overflow-hidden rounded-[1.5rem] border border-blue-200 bg-blue-50/60 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 px-5 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-black">
                    Select an Available Date
                  </h2>

                  <p className="mt-0.5 text-xs text-blue-50/80">
                    Appointments can be scheduled
                    from tomorrow up to 90 days ahead.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {/* Legend */}
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
                {[
                  {
                    label: "Available",
                    className:
                      "bg-emerald-500",
                  },
                  {
                    label: "Unavailable",
                    className:
                      "bg-rose-500",
                  },
                  {
                    label: "At Capacity",
                    className:
                      "bg-amber-400",
                  },
                  {
                    label: "Selected",
                    className:
                      "bg-blue-600",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${item.className}`}
                    />

                    {item.label}
                  </div>
                ))}
              </div>

              {/* Month navigation */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!canGoPrevious) {
                      return;
                    }

                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1,
                      ),
                    );
                  }}
                  disabled={!canGoPrevious}
                  aria-label="Previous month"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 text-center">
                  <p className="truncate text-lg font-black text-slate-800 dark:text-white">
                    {MONTH_NAMES[
                      currentMonth.getMonth()
                    ]}{" "}
                    {
                      currentMonth.getFullYear()
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!canGoNext) {
                      return;
                    }

                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1,
                      ),
                    );
                  }}
                  disabled={!canGoNext}
                  aria-label="Next month"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
                {DAY_NAMES.map(
                  (day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {days.map((item) => {
                  if (item.day === null) {
                    return (
                      <div
                        key={item.key}
                        className="aspect-square"
                      />
                    );
                  }

                  const day = item.day;
                  const dateKey =
                    dateKeyForDay(day);

                  const available =
                    isDateAvailable(day);

                  const unavailable =
                    isDateUnavailable(day);

                  const selected =
                    isDateSelected(day);

                  const inPast =
                    isDateInPast(day);

                  const atCapacity =
                    isDateAtCapacity(day);

                  const disabled =
                    !available ||
                    inPast ||
                    unavailable ||
                    atCapacity;

                  let dayClass =
                    "border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800";

                  if (inPast) {
                    dayClass =
                      "border border-slate-200 bg-slate-100 text-slate-400";
                  } else if (unavailable) {
                    dayClass =
                      "border border-rose-500 bg-rose-500 font-black text-white shadow-sm";
                  } else if (atCapacity) {
                    dayClass =
                      "border border-amber-400 bg-amber-400 font-black text-amber-950 shadow-sm";
                  } else if (selected) {
                    dayClass =
                      "border border-blue-600 bg-blue-600 font-black text-white shadow-md ring-2 ring-blue-300";
                  } else if (available) {
                    dayClass =
                      "border border-emerald-500 bg-emerald-500 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600";
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (!disabled) {
                          handleDateSelect(
                            dateKey,
                          );
                        }
                      }}
                      disabled={disabled}
                      aria-label={`${dateKey}${
                        unavailable
                          ? ", unavailable"
                          : atCapacity
                            ? ", at capacity"
                            : available
                              ? ", available"
                              : ", unavailable"
                      }`}
                      aria-pressed={selected}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xs font-bold transition sm:rounded-lg sm:text-sm ${dayClass} ${
                        disabled
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {availableDates.length === 0 ? (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="text-sm leading-6">
                    No appointment dates are currently available.
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="text-sm leading-6">
                    <strong>
                      {availableDates.length}
                    </strong>{" "}
                    appointment dates are currently available within the next 90 days.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </RequestFormShell>
  );
}
