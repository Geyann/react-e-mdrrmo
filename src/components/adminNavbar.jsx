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
    badge: {
      table: "hazard_reports",
      statusField: "review_status",
      statuses: ["pending"],
    },
  },
  {
    to: "/admin/pending-account",
    label: "User Accounts",
    icon: ShieldCheck,
    badge: {
      table: "pending_registrations",
      statusField: "status",
      statuses: ["pending"],
    },
  },
  {
    to: "/admin/report",
    label: "Incidents",
    icon: Siren,
    badge: {
      table: "reportIncident",
      statusField: "status",
      statuses: ["Pending", "pending"],
    },
  },
  {
    to: "/admin/borrow",
    label: "Vehicles",
    icon: Truck,
    badge: {
      table: "borrow-vehicle",
      statusField: "status",
      statuses: ["Pending", "pending"],
    },
  },
  {
    to: "/admin/appointment",
    label: "Appointments",
    icon: CalendarCheck2,
    badge: {
      table: "appointments",
      statusField: "status",
      statuses: ["pending"],
    },
  },
  {
    to: "/admin/checkup",
    label: "Check-Ups",
    icon: Stethoscope,
    badge: {
      table: "outPatientCheckUp",
      statusField: "status",
      statuses: ["Pending", "pending"],
    },
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