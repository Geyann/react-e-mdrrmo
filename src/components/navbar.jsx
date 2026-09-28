import {
  CalendarCheck2,
  ClipboardList,
  Info,
  LayoutDashboard,
  Map,
  Settings as SettingsIcon,
  Siren,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
  Truck,
} from "lucide-react";

import PortalNavbar from "./PortalNavbar";

const USER_LINKS = [
  {
    to: "/home",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/hazard-report",
    label: "Hazard Report",
    icon: TriangleAlert,
  },
  {
    to: "/report",
    label: "Report Incident",
    icon: Siren,
  },
  {
    to: "/borrow",
    label: "Borrow Vehicle",
    icon: Truck,
  },
  {
    to: "/appointment",
    label: "Book Appointment",
    icon: CalendarCheck2,
  },
  {
    to: "/checkup",
    label: "OPD Check-Up",
    icon: Stethoscope,
  },
  {
    to: "/track",
    label: "My Requests",
    icon: ClipboardList,
  },
  {
    to: "/hazardmap",
    label: "Hazard Map",
    icon: Map,
  },
  {
    to: "/yearly-incident-trends",
    label: "Incident Trends",
    icon: TrendingUp,
  },
  {
    to: "/about",
    label: "About",
    icon: Info,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

export default function Navbar() {
  return (
    <PortalNavbar
      portalTitle="Resident Portal"
      links={USER_LINKS}
      homePath="/home"
      profilePath="/profile"
      logoutPath="/login"
      sessionKey="currentUser"
    />
  );
}
