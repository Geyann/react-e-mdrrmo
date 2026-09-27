import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Icon from "../Images/logo.png"
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
  Users,
} from "lucide-react";
import { supabase } from "../createClient";

const PASSWORD_SALT = "hackerai-salt-2024";

const clean = (value) =>
  String(value ?? "").trim();

async function hashPassword(
  password,
  salt = PASSWORD_SALT,
) {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    salt ? `${password}${salt}` : password,
  );

  const hashBuffer =
    await crypto.subtle.digest("SHA-256", data);

  return Array.from(
    new Uint8Array(hashBuffer),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function findAdminAccount(
  identifier,
) {
  const isEmail =
    identifier.includes("@");

  if (isEmail) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", identifier)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        source: "admin_users",
        account: data,
      };
    }

    return null;
  }

  const byWorkId = await supabase
    .from("admin_users")
    .select("*")
    .eq("custom_id", identifier)
    .maybeSingle();

  if (byWorkId.error) {
    throw new Error(
      byWorkId.error.message,
    );
  }

  if (byWorkId.data) {
    return {
      source: "admin_users",
      account: byWorkId.data,
    };
  }

  const byUsername =
    await supabase
      .from("admin_users")
      .select("*")
      .eq("username", identifier)
      .maybeSingle();

  if (byUsername.error) {
    throw new Error(
      byUsername.error.message,
    );
  }

  if (byUsername.data) {
    return {
      source: "admin_users",
      account: byUsername.data,
    };
  }

  return null;
}

async function findStaffAccount(
  identifier,
) {
  const isEmail =
    identifier.includes("@");

  if (isEmail) {
    const { data, error } = await supabase
      .from("staff_users")
      .select("*")
      .eq("email", identifier)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        source: "staff_users",
        account: data,
      };
    }

    return null;
  }

  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("user_id", identifier)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return {
      source: "staff_users",
      account: data,
    };
  }

  const byUsername =
    await supabase
      .from("staff_users")
      .select("*")
      .eq("username", identifier)
      .maybeSingle();

  if (byUsername.error) {
    throw new Error(
      byUsername.error.message,
    );
  }

  if (byUsername.data) {
    return {
      source: "staff_users",
      account: byUsername.data,
    };
  }

  return null;
}

function buildStaffSession(
  source,
  account,
) {
  if (source === "admin_users") {
    return {
      id: account.id,

      // custom_id remains the manual work ID.
      user_id:
        account.custom_id ||
        account.username ||
        account.user_id ||
        "",

      username:
        account.username ||
        account.custom_id ||
        "",

      email: account.email || "",

      full_name:
        account.full_name || "Administrator",

      role: "admin",

      department: "",

      is_active: true,

      source: "admin_users",

      created_at:
        account.created_at || null,
    };
  }

  return {
    id: account.id,

    // staff_users.user_id is the manual work ID.
    user_id:
      account.user_id ||
      account.username ||
      "",

    username:
      account.username ||
      account.user_id ||
      "",

    email: account.email || "",

    full_name:
      account.full_name || "Staff Member",

    role:
      account.role === "admin"
        ? "admin"
        : "staff",

    department:
      account.department || "",

    is_active:
      account.is_active !== false,

    source: "staff_users",

    created_at:
      account.created_at || null,
  };
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [error, setError] = useState(
    location.state?.error || "",
  );

  const isEmailInput =
    identifier.includes("@");

  const handleLogin = async (
    event,
  ) => {
    event.preventDefault();

    if (loading) return;

    const loginIdentifier = clean(
      identifier,
    );
    const plainPassword = clean(password);

    if (!loginIdentifier) {
      setError(
        "Enter your Work ID or email address.",
      );
      return;
    }

    if (!plainPassword) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * New administrator accounts are stored in
       * admin_users. Staff accounts are stored in
       * staff_users.
       */
      const found =
        (await findAdminAccount(
          loginIdentifier,
        )) ||
        (await findStaffAccount(
          loginIdentifier,
        ));

      if (!found) {
        throw new Error(
          isEmailInput
            ? "Email address not found in the administrator or staff portal."
            : "Work ID not found in the administrator or staff portal.",
        );
      }

      const account = found.account;

      if (
        found.source === "staff_users" &&
        account.is_active === false
      ) {
        throw new Error(
          "Your staff account has been deactivated. Contact an administrator.",
        );
      }

      const saltedHash =
        await hashPassword(plainPassword);

      const unsaltedHash =
        await hashPassword(
          plainPassword,
          "",
        );

      const storedPassword = clean(
        account.password,
      );

      if (
        !storedPassword ||
        (storedPassword !== saltedHash &&
          storedPassword !== unsaltedHash)
      ) {
        throw new Error(
          "Incorrect password. Please try again.",
        );
      }

      const session = buildStaffSession(
        found.source,
        account,
      );

      window.localStorage.setItem(
        "currentStaff",
        JSON.stringify(session),
      );

      if (session.role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });
      } else {
        navigate("/staff/dashboard", {
          replace: true,
        });
      }
    } catch (loginError) {
      console.error(
        "Portal login error:",
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
          {/* Brand panel */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 p-8 text-white sm:p-10 lg:p-12">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            />

            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-purple-400/20 blur-2xl"
            />

            <div className="relative flex h-full flex-col">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-md">
                 <img
                                    src={Icon}
                                    alt="SafeResponse Logo"
                                    className="h-8 w-8"
                                  />
              </div>

              <div className="mt-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-50">
                  <Users className="h-4 w-4" />
                  Authorized personnel only
                </span>

                <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  MDRRMO Staff and
                  Administrator Portal
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/80 sm:text-base">
                  Access emergency operations, shared
                  inventory, check-up queues, reports, and
                  administrative management tools.
                </p>
              </div>

              <div className="mt-10 space-y-3 lg:mt-auto">
                {[
                  "Role-based dashboards and queues",
                  "Shared emergency inventory",
                  "Administrative account management",
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
            </div>
          </section>

          {/* Login form */}
          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20">
                  <LogIn className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Personnel login
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with the Work ID or email
                  address assigned to your staff or
                  administrator account.
                </p>
              </div>

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

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="staff-identifier"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Work ID or Email Address
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="staff-identifier"
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
                          : "e.g. MDRRMO-001"
                      }
                      autoComplete="username"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="staff-password"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="staff-password"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verifying account...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Sign In to Portal
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                <div>
                  <p className="text-xs font-bold text-blue-900">
                    Account access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    Staff and administrator accounts
                    must be created from User
                    Management. Public account
                    registration is not accepted
                    here.
                  </p>
                </div>
              </div>

              <div className="mt-7 text-center">
                <p className="text-sm text-slate-500">
                  Resident user?{" "}
                  <Link
                    to="/login"
                    className="font-black text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-purple-700"
                  >
                    Resident login
                  </Link>
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Contact an administrator if your
                  Work ID, password, or account status
                  is incorrect.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
