import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Icon from '../Images/logo.png';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
  LogIn,
  UserRound,
} from "lucide-react";
import { supabase } from "../createClient";

/* ══════════════════════════════════════════════════════════════════
   PASSWORD HELPERS
   ══════════════════════════════════════════════════════════════════ */

const PASSWORD_SALT = "hackerai-salt-2024";

const clean = (value) =>
  String(value ?? "").trim();

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) => clean(part))
    .filter(Boolean)
    .join(" ")
    .trim();

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    clean(value),
  );

async function hashPassword(
  password,
  salt = PASSWORD_SALT,
) {
  const encoder = new TextEncoder();

  const value = salt
    ? `${password}${salt}`
    : password;

  const data = encoder.encode(value);

  const hashBuffer =
    await crypto.subtle.digest(
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

/* ══════════════════════════════════════════════════════════════════
   DATABASE LOOKUPS
   ══════════════════════════════════════════════════════════════════ */

async function findRegistrationByEmail(
  email,
) {
  const { data, error } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("email", clean(email).toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findRegistrationByUsername(
  username,
) {
  const { data, error } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("username", clean(username))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findProfileById(id) {
  if (!id || !isUuid(id)) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findProfileByEmail(
  email,
) {
  if (!email) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq(
      "email",
      clean(email).toLowerCase(),
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findProfileForRegistration(
  registration,
) {
  if (
    registration?.user_id &&
    isUuid(registration.user_id)
  ) {
    const profile =
      await findProfileById(
        registration.user_id,
      ).catch(() => null);

    if (profile) return profile;
  }

  if (registration?.email) {
    return findProfileByEmail(
      registration.email,
    ).catch(() => null);
  }

  return null;
}

/* ══════════════════════════════════════════════════════════════════
   SESSION BUILDER
   ══════════════════════════════════════════════════════════════════ */

function buildResidentSession({
  registration = null,
  profile = null,
  authUser = null,
  fallbackEmail = "",
}) {
  const metadata =
    authUser?.user_metadata || {};

  const email = clean(
    profile?.email ||
    registration?.email ||
    authUser?.email ||
    fallbackEmail,
  ).toLowerCase();

  const firstName = clean(
    profile?.first_name ||
    registration?.first_name ||
    metadata.first_name ||
    metadata.given_name ||
    "",
  );

  const middleName = clean(
    profile?.middle_name ||
    registration?.middle_name ||
    "",
  );

  const lastName = clean(
    profile?.last_name ||
    registration?.last_name ||
    metadata.family_name ||
    metadata.last_name ||
    "",
  );

  const generatedName = cleanName(
    firstName,
    middleName,
    lastName,
  );

  const fullName = clean(
    profile?.full_name ||
    registration?.full_name ||
    metadata.full_name ||
    metadata.name ||
    generatedName ||
    email ||
    "Resident",
  );

  const role = clean(
    profile?.role ||
    registration?.role ||
    "user",
  ).toLowerCase();

  const accountStatus =
    profile?.is_active === false
      ? "inactive"
      : clean(
          registration?.status ||
            "approved",
        ).toLowerCase();

  return {
    id:
      profile?.id ||
      registration?.id ||
      authUser?.id ||
      null,

    user_id: clean(
      profile?.user_id ||
      registration?.user_id ||
      authUser?.id ||
      "",
    ),

    username: clean(
      profile?.username ||
      registration?.username ||
      metadata.username ||
      email.split("@")[0] ||
      "resident",
    ).toLowerCase(),

    email,

    full_name: fullName,

    first_name: firstName,

    middle_name: middleName,

    last_name: lastName,

    role: role || "user",

    status: accountStatus || "approved",

    mobile_number: clean(
      profile?.mobile_number ||
      registration?.mobile_number ||
      "",
    ),

    address: clean(
      profile?.address ||
      registration?.address ||
      "",
    ),
  };
}

/* ══════════════════════════════════════════════════════════════════
   GOOGLE ICON
   ══════════════════════════════════════════════════════════════════ */

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />

      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />

      <path
        fill="#FBBC05"
        d="M5.84 14.1A7.06 7.06 0 0 1 5.84 9.9V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeError = clean(
    location.state?.error || "",
  );

  const routeNotice = clean(
    location.state?.message || "",
  );

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] = useState(
    "",
  );

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(
    false,
  );

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState(
    routeError,
  );

  const [notice, setNotice] = useState(
    routeNotice,
  );

  const isEmailInput =
    identifier.includes("@");

  useEffect(() => {
    setError(routeError);
    setNotice(routeNotice);
  }, [routeError, routeNotice]);

  const saveResidentSession = (
    session,
  ) => {
    if (!session.id) {
      throw new Error(
        "Your approved account could not be resolved. Please contact the MDRRMO administrator.",
      );
    }

    window.localStorage.setItem(
      "currentUser",
      JSON.stringify(session),
    );

    window.sessionStorage.removeItem(
      "mdrrmo_previous_hash",
    );

    navigate("/home", {
      replace: true,
    });
  };

  /* ══════════════════════════════════════════════════════════════
     USERNAME / EMAIL / PASSWORD LOGIN
  ══════════════════════════════════════════════════════════════ */

  const handlePasswordLogin = async (
    event,
  ) => {
    event.preventDefault();

    if (
      loading ||
      googleLoading
    ) {
      return;
    }

    const loginIdentifier = clean(
      identifier,
    );

    const plainPassword = clean(
      password,
    );

    if (
      !loginIdentifier ||
      !plainPassword
    ) {
      setError(
        "Enter your username or email and password.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const isEmail =
        loginIdentifier.includes("@");

      const normalizedEmail =
        loginIdentifier.toLowerCase();

      let authResult = null;

      /*
       * First attempt Supabase Auth for migrated
       * and Google/OAuth accounts that also have
       * a password.
       */
      if (isEmail) {
        const result =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: plainPassword,
          });

        if (
          !result.error &&
          result.data?.session
        ) {
          authResult = result.data;
        }
      }

      /*
       * Fall back to the approved local
       * pending_registrations account.
       */
      const registration = isEmail
        ? await findRegistrationByEmail(
            normalizedEmail,
          )
        : await findRegistrationByUsername(
            loginIdentifier,
          );

      if (registration) {
        const status = clean(
          registration.status,
        ).toLowerCase();

        if (status === "pending") {
          if (authResult?.session) {
            await supabase.auth.signOut();
          }

          throw new Error(
            "Your account is still pending administrator approval.",
          );
        }

        if (status === "rejected") {
          if (authResult?.session) {
            await supabase.auth.signOut();
          }

          throw new Error(
            "Your registration was rejected. Please contact the MDRRMO office.",
          );
        }

        if (
          status &&
          status !== "approved"
        ) {
          throw new Error(
            "Your account is not available for login.",
          );
        }

        if (!authResult?.session) {
          const saltedHash =
            await hashPassword(
              plainPassword,
            );

          const unsaltedHash =
            await hashPassword(
              plainPassword,
              "",
            );

          const storedPassword = clean(
            registration.password,
          );

          if (
            !storedPassword ||
            (storedPassword !== saltedHash &&
              storedPassword !== unsaltedHash)
          ) {
            throw new Error(
              "Incorrect username or password.",
            );
          }
        }

        const profile =
          await findProfileForRegistration(
            registration,
          );

        if (
          profile?.is_active === false
        ) {
          if (authResult?.session) {
            await supabase.auth.signOut();
          }

          throw new Error(
            "Your account has been deactivated. Contact the MDRRMO administrator.",
          );
        }

        const residentSession =
          buildResidentSession({
            registration,
            profile,
            authUser:
              authResult?.user || null,
            fallbackEmail:
              registration.email,
          });

        saveResidentSession(
          residentSession,
        );

        return;
      }

      /*
       * The account may exist only as an
       * approved Supabase profile.
       */
      if (authResult?.session) {
        const profile =
          await findProfileById(
            authResult.user.id,
          ).catch(() => null);

        if (
          !profile ||
          profile.is_active === false
        ) {
          await supabase.auth.signOut();

          throw new Error(
            "Your account has not been approved yet.",
          );
        }

        const role = clean(
          profile.role || "user",
        ).toLowerCase();

        if (
          ![
            "user",
            "resident",
          ].includes(role)
        ) {
          await supabase.auth.signOut();

          throw new Error(
            "Use the staff or administrator portal to sign in with this account.",
          );
        }

        const residentSession =
          buildResidentSession({
            registration: null,
            profile,
            authUser: authResult.user,
            fallbackEmail:
              authResult.user.email || "",
          });

        saveResidentSession(
          residentSession,
        );

        return;
      }

      throw new Error(
        isEmail
          ? "Email not found. Check your account or create an account."
          : "Username not found. Check your account or create an account.",
      );
    } catch (loginError) {
      console.error(
        "Resident login error:",
        loginError,
      );

      setError(
        loginError?.message ||
          "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     GOOGLE LOGIN
  ══════════════════════════════════════════════════════════════ */

  const handleGoogleLogin = async () => {
    if (
      loading ||
      googleLoading
    ) {
      return;
    }

    setGoogleLoading(true);
    setError("");
    setNotice("");

    try {
      const redirectTo =
        `${window.location.origin}/auth/callback`;

      const { error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

      if (oauthError) {
        throw oauthError;
      }
    } catch (oauthError) {
      console.error(
        "Google login error:",
        oauthError,
      );

      setError(
        oauthError?.message ||
          "Google login could not be started.",
      );

      setGoogleLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 px-4 py-6 sm:px-6 lg:px-8">
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
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl shadow-blue-950/30 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Brand panel */}
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
                <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Welcome back to your
                  safer community.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/80 sm:text-base">
                  Sign in to request emergency assistance,
                  monitor your submitted reports.
                </p>
              </div>

             
            </div>
          </section>

          {/* Form panel */}
          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
            

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

              {/* Notice */}
              {notice && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <p className="text-sm font-semibold leading-5 text-emerald-700">
                    {notice}
                  </p>
                </div>
              )}

              <form
                onSubmit={handlePasswordLogin}
                className="space-y-5"
              >
                {/* Username or email */}
                <div>
                  <label
                    htmlFor="resident-identifier"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Username or Email
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="resident-identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) =>
                        setIdentifier(
                          event.target.value,
                        )
                      }
                      placeholder={
                        isEmailInput
                          ? "name@example.com"
                          : "Enter your username"
                      }
                      autoComplete="username"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="resident-password"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="resident-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (visible) => !visible,
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    googleLoading
                  }
                  className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Sign In
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  or continue with
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={
                  loading ||
                  googleLoading
                }
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : (
                  <GoogleIcon />
                )}

                {googleLoading
                  ? "Opening Google..."
                  : "Continue with Google"}
              </button>

              {/* Information */}
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                <p className="text-xs leading-5 text-blue-800">
                  Google accounts must first be approved
                  by an administrator before accessing the
                  resident portal.
                </p>
              </div>

              {/* Registration */}
              <p className="mt-7 text-center text-sm text-slate-500">
                Do not have an account?{" "}
                <Link
                  to="/register"
                  className="font-black text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-purple-700"
                >
                  Create an account
                </Link>
              </p>

              {/* Personnel login */}
              <p className="mt-5 text-center text-sm text-slate-500">
                Authorized staff member?{" "}
                <Link
                  to="/admin"
                  className="font-black text-purple-700 underline decoration-purple-300 underline-offset-4 transition hover:text-blue-700"
                >
                  Staff login
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
