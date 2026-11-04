import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../createClient";

/**
 * Automatically logs the user out whenever the current path starts with /guest.
 * Clears both the custom localStorage session and any Supabase Auth session.
 */
export function useAutoLogoutOnGuest() {
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false); // prevents concurrent logouts

  useEffect(() => {
    const isGuestPath = location.pathname.startsWith("/guest");

    if (!isGuestPath) return;

    // Prevent multiple concurrent logouts
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    const performLogout = async () => {
      try {
        // 1. Clear custom session used by LoginPage
        localStorage.removeItem("currentUser");

        // 2. Extra safety cleanup
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.clear();

        // 3. Sign out from Supabase Auth (if a real session exists)
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) {
          console.warn("Supabase signOut warning:", error.message);
        }
      } catch (err) {
        console.error("Auto-logout on /guest failed:", err);
      } finally {
        isLoggingOutRef.current = false;
        setIsLoggingOut(false);
      }
    };

    performLogout();
  }, [location.pathname]);

  return { isLoggingOut };
}