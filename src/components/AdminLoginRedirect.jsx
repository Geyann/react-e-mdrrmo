import { Navigate, useLocation } from "react-router-dom";

/**
 * Legacy /admin and /admin/login routes now funnel into the
 * single unified login page at /login.
 */
export default function AdminLoginRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to="/login"
      replace
      state={
        location.state?.error
          ? { error: location.state.error }
          : location.state?.message
            ? { message: location.state.message }
            : undefined
      }
    />
  );
}