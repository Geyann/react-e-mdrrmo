import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "./navbar";
import AdminNavbar from "./adminNavbar";
import StaffNavbar from "./StaffNavbar";
import GuestNavbar from "./GuestNavbar";

export default function DynamicNavbar() {
  const location = useLocation();
  const path = location.pathname;
  const [userRole, setUserRole] =
    useState("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectRole = () => {
      try {
        const rawStaff =
          localStorage.getItem("currentStaff");

        if (rawStaff) {
          const staff = JSON.parse(rawStaff);

          if (staff?.role === "admin") {
            setUserRole("admin");
            setLoading(false);
            return;
          }

          if (staff?.role === "staff") {
            setUserRole("staff");
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore malformed staff data.
      }

      if (
        localStorage.getItem("currentUser")
      ) {
        setUserRole("user");
        setLoading(false);
        return;
      }

      setUserRole("guest");
      setLoading(false);
    };

    detectRole();
  }, [path]);

  if (loading) {
    return null;
  }

  switch (userRole) {
    case "admin":
      return <AdminNavbar />;

    case "staff":
      return <StaffNavbar />;

    case "user":
      return <Navbar />;

    default:
      return <GuestNavbar />;
  }
}
