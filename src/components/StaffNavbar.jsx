import {
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings as SettingsIcon,
  Stethoscope,
  Truck,
} from "lucide-react";

import PortalNavbar from "./PortalNavbar";

const STAFF_LINKS = [
  {
    to: "/staff/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/staff/checkup",
    label: "OPD Check-Up",
    icon: Stethoscope,
  },
  {
    to: "/staff/checkupqueue",
    label: "Check-Up Queue",
    icon: ClipboardCheck,
  },
  {
    to: "/staff/borrow",
    label: "Vehicles",
    icon: Truck,
  },
  {
    to: "/staff/borrower-slip",
    label: "Borrower Slip",
    icon: ClipboardList,
  },
  {
    to: "/staff/inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    to: "/staff/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

export default function StaffNavbar() {
  return (
    <PortalNavbar
      portalTitle="Staff Operations Portal"
      links={STAFF_LINKS}
      homePath="/staff/dashboard"
      profilePath="/staff/profile"
      logoutPath="/admin"
      sessionKey="currentStaff"
    />
  );
}
