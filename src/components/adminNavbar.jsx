import {
  CalendarCheck2,
  LayoutDashboard,
  Package,
  Settings as SettingsIcon,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
  Truck,
} from "lucide-react";

import PortalNavbar from "./PortalNavbar";

const ADMIN_LINKS = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/hazard-map",
    label: "Hazard Map",
    icon: TriangleAlert,
  },
  {
    to: "/admin/pending-account",
    label: "User Accounts",
    icon: ShieldCheck,
  },
  {
    to: "/admin/report",
    label: "Incidents",
    icon: Siren,
  },
  {
    to: "/admin/borrow",
    label: "Vehicles",
    icon: Truck,
  },
  {
    to: "/admin/appointment",
    label: "Appointments",
    icon: CalendarCheck2,
  },
  {
    to: "/admin/checkup",
    label: "Check-Ups",
    icon: Stethoscope,
  },
  {
    to: "/admin/inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    to: "/admin/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

export default function AdminNavbar() {
  return (
    <PortalNavbar
      portalTitle="Administrator Portal"
      links={ADMIN_LINKS}
      homePath="/admin/dashboard"
      profilePath="/admin/profile"
      logoutPath="/admin"
      sessionKey="currentStaff"
    />
  );
}
