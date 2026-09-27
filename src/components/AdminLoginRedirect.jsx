import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import AdminLogin from "../pages/adminlogin";
import { supabase } from "../createClient";

const clean = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

function readCurrentStaff() {
  try {
    const raw =
      window.localStorage.getItem(
        "currentStaff",
      );

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function buildAdminSession({
  row,
  authUser,
  profile,
}) {
  const metadata =
    authUser?.user_metadata || {};

  const fullName =
    row?.full_name ||
    profile?.full_name ||
    metadata.full_name ||
    metadata.name ||
    authUser?.email ||
    "Administrator";

  const workId =
    row?.custom_id ||
    row?.username ||
    metadata.work_id ||
    metadata.username ||
    "";

  return {
    id:
      row?.id ||
      authUser?.id ||
      profile?.id ||
      "",

    user_id: workId,

    username:
      row?.username ||
      workId ||
      metadata.username ||
      "",

    email:
      row?.email ||
      authUser?.email ||
      "",

    full_name: fullName,

    role: "admin",

    department: "",

    is_active: true,

    source: "admin_users",

    created_at:
      row?.created_at ||
      profile?.created_at ||
      null,
  };
}

export default function AdminLoginRedirect() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(
    true,
  );
  const [error, setError] = useState(
    "",
  );

  useEffect(() => {
    let active = true;

    const checkAdministratorSession =
      async () => {
        try {
          /*
           * An existing manual administrator session
           * can go directly to the dashboard.
           */
          const currentStaff =
            readCurrentStaff();

          if (
            currentStaff &&
            clean(currentStaff.role) ===
              "admin" &&
            currentStaff.is_active !== false
          ) {
            if (!active) return;

            navigate(
              "/admin/dashboard",
              { replace: true },
            );
            return;
          }

          /*
           * Check whether the browser already has
           * a real Supabase Auth administrator
           * session.
           */
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            if (!active) return;

            setChecking(false);
            return;
          }

          const { data: adminRow } =
            await supabase
              .from("admin_users")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

          if (
            adminRow &&
            clean(adminRow.role) === "admin"
          ) {
            const session =
              buildAdminSession({
                row: adminRow,
                authUser: user,
                profile: null,
              });

            window.localStorage.setItem(
              "currentStaff",
              JSON.stringify(session),
            );

            if (!active) return;

            navigate(
              "/admin/dashboard",
              { replace: true },
            );
            return;
          }

          /*
           * Compatibility fallback for projects
           * where the role is stored in profiles.
           */
          const { data: profile } =
            await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

          if (
            profile &&
            clean(profile.role) === "admin"
          ) {
            const session =
              buildAdminSession({
                row: null,
                authUser: user,
                profile,
              });

            window.localStorage.setItem(
              "currentStaff",
              JSON.stringify(session),
            );

            if (!active) return;

            navigate(
              "/admin/dashboard",
              { replace: true },
            );
            return;
          }

          /*
           * Compatibility fallback for legacy
           * administrator accounts stored in
           * staff_users.
           */
          if (user.email) {
            const { data: staffRow } =
              await supabase
                .from("staff_users")
                .select("*")
                .eq("email", user.email)
                .maybeSingle();

            if (
              staffRow &&
              clean(staffRow.role) ===
                "admin" &&
              staffRow.is_active !== false
            ) {
              const session =
                buildAdminSession({
                  row: {
                    ...staffRow,
                    custom_id:
                      staffRow.user_id ||
                      staffRow.username ||
                      "",
                  },
                  authUser: user,
                  profile: null,
                });

              window.localStorage.setItem(
                "currentStaff",
                JSON.stringify(session),
              );

              if (!active) return;

              navigate(
                "/admin/dashboard",
                { replace: true },
              );
              return;
            }
          }

          if (!active) return;

          setChecking(false);
        } catch (checkError) {
          console.error(
            "Admin session check failed:",
            checkError,
          );

          if (!active) return;

          setError(
            checkError?.message ||
              "Unable to verify the current administrator session.",
          );

          setChecking(false);
        }
      };

    checkAdministratorSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 px-4">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-purple-400/30 blur-3xl"
        />

        <section className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white/95 p-8 text-center shadow-2xl sm:p-10">
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
            Checking your administrator session...
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 p-4">
        <section className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            Unable to verify session
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setChecking(true);
              setError("");

              window.location.reload();
            }}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700"
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  return <AdminLogin />;
}
