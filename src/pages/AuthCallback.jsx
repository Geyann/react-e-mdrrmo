import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../createClient";

const clean = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const cleanName = (...parts) =>
  parts
    .filter(Boolean)
    .map((part) =>
      String(part).trim(),
    )
    .filter(Boolean)
    .join(" ")
    .trim();

async function findRegistration(
  user,
) {
  if (user.id) {
    const { data, error } =
      await supabase
        .from("pending_registrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data;
  }

  if (user.id) {
    const { data, error } =
      await supabase
        .from("pending_registrations")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data;
  }

  if (user.email) {
    const { data, error } =
      await supabase
        .from("pending_registrations")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data;
  }

  return null;
}

async function findProfile(
  user,
) {
  if (user.id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data;
  }

  if (user.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data;
  }

  return null;
}

function buildSession({
  user,
  registration = null,
  profile = null,
}) {
  const metadata =
    user.user_metadata || {};

  const displayName = cleanName(
    profile?.full_name ||
      registration?.full_name ||
      metadata.full_name ||
      metadata.name ||
      (profile?.first_name ||
        registration?.first_name) &&
        [
          profile?.first_name ||
            registration?.first_name,
          profile?.middle_name ||
            registration?.middle_name,
          profile?.last_name ||
            registration?.last_name,
        ]
          .filter(Boolean)
          .join(" "),
  );

  return {
    id:
      profile?.id ||
      registration?.id ||
      user.id,

    user_id:
      profile?.user_id ||
      registration?.user_id ||
      user.id,

    username:
      profile?.username ||
      registration?.username ||
      user.email?.split("@")[0] ||
      "resident",

    email:
      profile?.email ||
      registration?.email ||
      user.email ||
      "",

    full_name:
      displayName ||
      user.email ||
      "Resident",

    first_name:
      profile?.first_name ||
      registration?.first_name ||
      "",

    middle_name:
      profile?.middle_name ||
      registration?.middle_name ||
      "",

    last_name:
      profile?.last_name ||
      registration?.last_name ||
      "",

    role:
      profile?.role ||
      registration?.role ||
      "user",

    status:
      registration?.status ||
      (profile ? "approved" : "approved"),

    mobile_number:
      profile?.mobile_number ||
      registration?.mobile_number ||
      "",

    address:
      profile?.address ||
      registration?.address ||
      "",
  };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(
    "",
  );
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    const completeAuthentication =
      async () => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!session?.user) {
            throw new Error(
              "Your login session could not be found. Please sign in again.",
            );
          }

          const user = session.user;

          const registration =
            await findRegistration(user);

          const profile =
            await findProfile(user).catch(
              () => null,
            );

          if (profile?.is_active === false) {
            await supabase.auth.signOut();

            throw new Error(
              "Your account has been deactivated. Contact the MDRRMO administrator.",
            );
          }

          if (
            registration &&
            clean(registration.status) ===
              "pending"
          ) {
            await supabase.auth.signOut();

            if (!active) return;

            navigate("/login", {
              replace: true,
              state: {
                message:
                  "Your registration is still pending administrator approval.",
              },
            });
            return;
          }

          if (
            registration &&
            clean(registration.status) ===
              "rejected"
          ) {
            await supabase.auth.signOut();

            if (!active) return;

            navigate("/login", {
              replace: true,
              state: {
                error:
                  "Your registration was rejected. Please contact the MDRRMO office.",
              },
            });
            return;
          }

          /*
           * An approved registration may already
           * have a profile row.
           */
          if (
            registration &&
            clean(registration.status) ===
              "approved"
          ) {
            const residentSession =
              buildSession({
                user,
                registration,
                profile,
              });

            window.localStorage.setItem(
              "currentUser",
              JSON.stringify(
                residentSession,
              ),
            );

            if (!active) return;

            navigate("/home", {
              replace: true,
            });
            return;
          }

          /*
           * Compatibility with approved profiles
           * that no longer have a matching pending
           * registration row.
           */
          if (profile) {
            const residentSession =
              buildSession({
                user,
                registration: null,
                profile,
              });

            window.localStorage.setItem(
              "currentUser",
              JSON.stringify(
                residentSession,
              ),
            );

            if (!active) return;

            navigate("/home", {
              replace: true,
            });
            return;
          }

          /*
           * Brand-new OAuth account. Continue to
           * the profile-completion form.
           */
          if (!active) return;

          navigate("/register/oauth", {
            replace: true,
            state: {
              message:
                "Please complete your profile before accessing the resident portal.",
            },
          });
        } catch (callbackError) {
          console.error(
            "Auth callback error:",
            callbackError,
          );

          if (!active) return;

          setError(
            callbackError?.message ||
              "Authentication could not be completed.",
          );
        }
      };

    completeAuthentication();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 p-4">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-purple-400/30 blur-3xl"
        />

        <section className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-8 text-center shadow-2xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="mt-6 text-xl font-black text-slate-900">
            Authentication failed
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                navigate("/login", {
                  replace: true,
                })
              }
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Back to Login
            </button>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="min-h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700"
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 p-4">
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-purple-400/30 blur-3xl"
      />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />

          <h1 className="text-xl font-black text-slate-900">
            SafeResponse Portal
          </h1>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Completing your secure sign-in and checking
          your account approval...
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          <CheckCircle2 className="h-4 w-4" />
          Please keep this page open
        </div>
      </section>
    </main>
  );
}
