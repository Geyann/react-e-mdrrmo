import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../createClient";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  staffOnly = false,
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        let parsedUser = null;

        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch {
            parsedUser = null;
          }
        }

        const storedStaff = localStorage.getItem("currentStaff");
        let parsedStaff = null;

        if (storedStaff) {
          try {
            parsedStaff = JSON.parse(storedStaff);
          } catch {
            parsedStaff = null;
          }
        }

        if (!parsedUser && !parsedStaff) {
          setAuthorized(false);
          setLoading(false);
          navigate("/login", {
            replace: true,
            state: { error: "Please log in first." },
          });
          return;
        }

        if (parsedUser && !parsedStaff) {
          if (adminOnly || staffOnly) {
            localStorage.removeItem("currentUser");
            try {
              await supabase.auth.signOut();
            } catch {
              /* ignore */
            }
            setAuthorized(false);
            setLoading(false);
            navigate("/login", {
              replace: true,
              state: {
                error:
                  "Access denied. Sign in with a staff or administrator account.",
              },
            });
            return;
          }

          setAuthorized(true);
          setLoading(false);
          return;
        }

        if (parsedStaff) {
          const staffRole = parsedStaff.role;
          const isActive = parsedStaff.is_active;

          if (isActive === false) {
            localStorage.removeItem("currentStaff");
            setAuthorized(false);
            setLoading(false);
            navigate("/login", {
              replace: true,
              state: {
                error: "Your account has been deactivated.",
              },
            });
            return;
          }

          if (adminOnly) {
            if (staffRole !== "admin") {
              setAuthorized(false);
              setLoading(false);
              navigate("/login", {
                replace: true,
                state: { error: "Access denied. Admins only." },
              });
              return;
            }
            setAuthorized(true);
            setLoading(false);
            return;
          }

          if (staffOnly) {
            if (staffRole !== "staff" && staffRole !== "admin") {
              setAuthorized(false);
              setLoading(false);
              navigate("/login", {
                replace: true,
                state: {
                  error: "Access denied. Staff area only.",
                },
              });
              return;
            }
            setAuthorized(true);
            setLoading(false);
            return;
          }

          setAuthorized(true);
          setLoading(false);
          return;
        }

        if (parsedUser && parsedStaff) {
          if (!adminOnly && !staffOnly) {
            setAuthorized(true);
            setLoading(false);
            return;
          }

          const staffRole = parsedStaff.role;

          if (adminOnly && staffRole !== "admin") {
            setAuthorized(false);
            setLoading(false);
            navigate("/login", {
              replace: true,
              state: { error: "Access denied. Admins only." },
            });
            return;
          }

          if (
            staffOnly &&
            staffRole !== "staff" &&
            staffRole !== "admin"
          ) {
            setAuthorized(false);
            setLoading(false);
            navigate("/login", {
              replace: true,
              state: { error: "Access denied." },
            });
            return;
          }

          setAuthorized(true);
          setLoading(false);
          return;
        }

        setAuthorized(false);
        setLoading(false);
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("ProtectedRoute error:", err);
        setAuthorized(false);
        setLoading(false);
        navigate("/login", { replace: true });
      }
    };

    checkAuth();
  }, [navigate, adminOnly, staffOnly, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto" />
          <p className="mt-4 text-purple-200 font-semibold">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return children;
}