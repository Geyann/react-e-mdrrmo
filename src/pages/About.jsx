"use client";
import logoImg1 from "../Images/icon3.png";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Check,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  Map,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Siren,
  Sparkles,
  Target,
  TriangleAlert,
  Truck,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

import hotImg from "../Images/hotline-h1.png";
import logoImg from "../Images/logoImg.webp";

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const COMMAND_CENTER_LOCATION =
  "https://www.google.com/maps/place/Naic+OMDRRMO/@14.3223974,120.7692561,17z/data=!3m1!4b1!4m6!3m5!1s0x3396295b46854c2b:0xa77ec6df7a6c2793!8m2!3d14.3223922!4d120.771831!16s%2Fg%2F11vlz6vvp5?entry=ttu";

/* ══════════════════════════════════════════════════════════════════
   SYSTEM IDENTITY (from manuscript)
   ══════════════════════════════════════════════════════════════════ */

const SYSTEM = {
  name: "SafeResponse",
  fullTitle:
    "SafeResponse: A Centralized Incident Reporting and Ambulance Dispatch Platform of MDRRMO for Disaster and Medical Emergencies",
  version: "1.0",
  status: "Capstone research system · Under evaluation",
  year: "2025–2026",
  location: "Naic, Cavite, Philippines",
  institution: "Cavite State University – Naic Campus",
  program: "Bachelor of Science in Information Technology",
  classification: "Undergraduate Capstone Research Project",
  organization:
    "Municipal Disaster Risk Reduction and Management Office (MDRRMO), Naic, Cavite",
  description:
    "A centralized web-based platform that supports incident reporting, ambulance dispatch coordination, digital patient information management, hazard reporting and mapping, and emergency incident monitoring for the Naic MDRRMO.",
  purpose:
    "To improve disaster and medical emergency operations by providing a single digital platform for reporting, coordination, monitoring, and records management.",
};

/* ══════════════════════════════════════════════════════════════════
   DEVELOPERS (from manuscript biographical data)
   ══════════════════════════════════════════════════════════════════ */

const DEVELOPERS = [
  {
    name: "Joris Y. Fabi",
    role: "Researcher / Documentation",
    program: "Bachelor of Science in Information Technology",
    institution: "Cavite State University – Naic Campus",
    bio: "Born on September 5, 2002 in Las Piñas City. Middle child among four siblings, currently residing at Dorothea I, Naic, Cavite. Completed elementary education at Pamplona Elementary School Central (2012), junior high school at Naic National High School (2017), and senior high school in 2019.",
  },
  {
    name: "Jerame L. Labid",
    role: "Researcher / Lead Documentation",
    program: "Bachelor of Science in Information Technology",
    institution: "Cavite State University – Naic Campus",
    bio: "Born on August 27, 2001 and raised in Panubigan, Zamboanga del Sur. Currently residing in Sabang, Naic, Cavite. Completed elementary education at Southville 1 Elementary School (2013), junior high school at Maria Rodriguez Tinga Memorial National High School (2017), and senior high school at La Vlaize Integrated Science School (2019).",
  },
  {
    name: "Gian Carlo F. Lintag",
    role: "Researcher / Lead Programmer",
    program: "Bachelor of Science in Information Technology",
    institution: "Cavite State University – Naic Campus",
    bio: "Born on September 3, 2004 in Ermita, Manila and raised in Pamplona Tres, Las Piñas City. Currently residing in Timalan Balsahan, Naic, Cavite. Completed elementary education at Pulanlupa Elementary School – Camella Annex (2016), junior high school at Las Piñas East National High School (2021), and senior high school at Granby Colleges of Science and Technology (2023).",
  },
];

/* ══════════════════════════════════════════════════════════════════
   RESEARCH PERSONNEL (from acknowledgement)
   ══════════════════════════════════════════════════════════════════ */

const RESEARCH_PERSONNEL = [
  {
    name: "Dr. Michelle C. Tanega, DIT",
    position: "Technical Adviser",
    organization: "Cavite State University – Naic Campus",
  },
  {
    name: "Ms. Dezza Anne A. Peregrina",
    position: "Technical Critic / Technical Critic",
    organization: "Cavite State University – Naic Campus",
  },
  {
    name: "Dr. Ricky Jay Riel, DIT",
    position: "Unit Research Coordinator",
    organization: "Cavite State University – Naic Campus",
  },
  {
    name: "Prof. Armina B. Pugay",
    position: "Campus Administrator",
    organization: "Cavite State University – Naic Campus",
  },
  {
    name: "Mr. Augusto A. Gonzales",
    position: "Client Representative",
    organization: "MDRRMO Naic",
  },
];

/* ══════════════════════════════════════════════════════════════════
   MISSION / VISION / VALUES
   ══════════════════════════════════════════════════════════════════ */

const MISSION =
  "To provide the Naic MDRRMO with a centralized digital platform that supports organized incident reporting, emergency dispatch, hazard monitoring, digital patient documentation, and coordinated disaster response.";

const VISION =
  "A safer and more resilient Municipality of Naic through informed, coordinated, and technology-supported disaster risk reduction and emergency management.";

const CORE_VALUES = [
  {
    title: "Service",
    description:
      "Prioritize public safety and timely assistance to the community.",
  },
  {
    title: "Integrity",
    description:
      "Handle reports, patient data, and operational records responsibly.",
  },
  {
    title: "Coordination",
    description:
      "Support clear communication among residents, staff, and administrators.",
  },
  {
    title: "Preparedness",
    description:
      "Enable proactive hazard awareness and structured emergency readiness.",
  },
  {
    title: "Accountability",
    description:
      "Maintain transparent digital records for review, monitoring, and continuous improvement.",
  },
];

/* ══════════════════════════════════════════════════════════════════
   OBJECTIVES (from manuscript)
   ══════════════════════════════════════════════════════════════════ */

const GENERAL_OBJECTIVE =
  "To design and develop SafeResponse: A Centralized Incident Reporting and Ambulance Dispatch Platform of MDRRMO for Disaster and Medical Emergencies that supports more efficient operations, situational awareness, and centralized data handling for the Naic MDRRMO.";

const SPECIFIC_OBJECTIVES = [
  "Define a system architecture capable of automated report summarization, digital patient data collection, crowdsourced hazard reporting, geo-referenced hazard mapping, and incident and dispatch management.",
  "Design SafeResponse using React and JavaScript for the web application, PostgreSQL and Supabase for data management, and Leaflet for interactive mapping.",
  "Provide role-based access for administrators, staff, registered residents, and guests according to operational needs.",
  "Assess the system using an adapted ISO/IEC 25010 evaluation instrument focusing on functionality, performance efficiency, usability, reliability, security, maintainability, compatibility, and portability.",
  "Develop an implementation plan that specifies deployment, training, and long-term use by the Naic MDRRMO.",
];

/* ══════════════════════════════════════════════════════════════════
   FEATURES (aligned with manuscript + implemented modules)
   ══════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    name: "Incident Reporting",
    description:
      "Residents can submit emergency incident reports with details needed for MDRRMO response coordination.",
    icon: Siren,
    category: "Reporting",
  },
  {
    name: "Hazard Reporting & Mapping",
    description:
      "Community members can report natural hazards with location data, supported by an interactive geo-referenced hazard map.",
    icon: TriangleAlert,
    category: "Hazards",
  },
  {
    name: "Ambulance & Vehicle Dispatch Support",
    description:
      "Supports emergency vehicle and ambulance-related request handling for coordinated response activities.",
    icon: Ambulance,
    category: "Dispatch",
  },
  {
    name: "Digital Patient / Check-Up Information",
    description:
      "Provides digital forms for outpatient check-up requests and related patient information handling.",
    icon: ClipboardCheck,
    category: "Health",
  },
  {
    name: "Appointment Booking",
    description:
      "Allows residents to request appointments and track related status updates within the platform.",
    icon: BookOpen,
    category: "Services",
  },
  {
    name: "Vehicle Borrowing Requests",
    description:
      "Supports structured vehicle request submission and staff review workflows.",
    icon: Truck,
    category: "Logistics",
  },
  {
    name: "Centralized Dashboard & Analytics",
    description:
      "Provides monitoring views and trend summaries to support operational awareness and decision-making.",
    icon: LayoutDashboard,
    category: "Analytics",
  },
  {
    name: "Notifications",
    description:
      "Informs users of relevant status changes and platform activities related to their submissions.",
    icon: Bell,
    category: "Communication",
  },
  {
    name: "User Access Levels & Security",
    description:
      "Applies authentication and role-based access control for residents, staff, and administrators.",
    icon: Lock,
    category: "Security",
  },
  {
    name: "Digital Records & History",
    description:
      "Stores submitted reports and request records for tracking, review, and operational continuity.",
    icon: Archive,
    category: "Records",
  },
];

/* ══════════════════════════════════════════════════════════════════
   WORKFLOW
   ══════════════════════════════════════════════════════════════════ */

const WORKFLOW = [
  {
    step: "01",
    title: "Report Submission",
    description:
      "A resident or staff member submits an incident, hazard, appointment, check-up, or vehicle-related request through the platform.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Verification & Review",
    description:
      "MDRRMO staff or administrators review the submission, validate details, and determine the appropriate next action.",
    icon: UserCheck,
  },
  {
    step: "03",
    title: "Assessment & Coordination",
    description:
      "Operational teams assess priority, available resources, and response requirements based on the submitted information.",
    icon: Activity,
  },
  {
    step: "04",
    title: "Dispatch / Service Action",
    description:
      "Approved requests proceed to ambulance, vehicle, field response, or scheduled service handling as applicable.",
    icon: Ambulance,
  },
  {
    step: "05",
    title: "Status Updates",
    description:
      "Users receive notifications and can track request status as the report moves through processing stages.",
    icon: Bell,
  },
  {
    step: "06",
    title: "Completion & Records",
    description:
      "Resolved or completed cases are retained as digital records to support monitoring, reporting, and future reference.",
    icon: Archive,
  },
];

/* ══════════════════════════════════════════════════════════════════
   USER ROLES
   ══════════════════════════════════════════════════════════════════ */

const USER_ROLES = [
  {
    role: "Guest",
    description:
      "Can view public information such as the about page, hazard map, and selected public resources.",
    access: "Public",
    permissions:
      "Browse public pages; limited interaction depending on configured public forms.",
  },
  {
    role: "Registered Resident",
    description:
      "Authenticated community users who can submit requests and monitor their own records.",
    access: "Resident portal",
    permissions:
      "Submit incidents, hazards, appointments, check-ups, and vehicle requests; track personal submissions; manage profile settings.",
  },
  {
    role: "Staff",
    description:
      "Operational MDRRMO personnel who process day-to-day requests and reports.",
    access: "Staff portal",
    permissions:
      "Review and process assigned operational modules such as queues, vehicle requests, hazard reports, inventory-related tasks, and service workflows.",
  },
  {
    role: "Administrator",
    description:
      "System and office administrators with oversight of approvals, users, and overall platform operations.",
    access: "Admin portal",
    permissions:
      "Manage approvals, monitor reports, oversee users and operational records, and supervise platform administration.",
  },
];

/* ══════════════════════════════════════════════════════════════════
   PRIVACY & SECURITY (only claims aligned with implemented stack)
   ══════════════════════════════════════════════════════════════════ */

const SECURITY_POINTS = [
  {
    title: "Authentication",
    description:
      "User access is managed through authenticated sessions supported by Supabase Auth and role-aware portal routing.",
  },
  {
    title: "Authorization & RBAC",
    description:
      "Access is separated across guest, resident, staff, and administrator portals according to assigned roles.",
  },
  {
    title: "Data Protection",
    description:
      "Operational records are stored in a cloud-hosted PostgreSQL database managed through Supabase.",
  },
  {
    title: "Patient & Request Information",
    description:
      "Sensitive request and patient-related fields are restricted to authorized accounts and operational workflows.",
  },
  {
    title: "Account Security",
    description:
      "Users access only the portals and records associated with their authenticated identity and role.",
  },
  {
    title: "Privacy Contact",
    description:
      "For privacy or data-handling concerns related to platform use, contact the MDRRMO Command Center through the published office channels.",
  },
];

/* ══════════════════════════════════════════════════════════════════
   SCOPE & LIMITATIONS (from manuscript)
   ══════════════════════════════════════════════════════════════════ */

const SCOPE_POINTS = [
  "Covers administrators, staff, responders, and registered community users of the Naic MDRRMO context.",
  "Supports incident reporting, hazard reporting and mapping, appointment booking, outpatient check-up requests, vehicle borrowing, dashboards, notifications, and digital records.",
  "Designed as a centralized web platform for local emergency coordination and community participation in Naic, Cavite.",
];

const LIMITATION_POINTS = [
  "Requires stable internet access for synchronization and cloud database access; offline reporting is not supported.",
  "The system is web-browser based and does not include a standalone native mobile application.",
  "Geographic coverage is local to Naic, Cavite and is not intended as a nationwide MDRRMO deployment.",
  "Does not integrate advanced external systems such as national disaster databases, weather forecasting APIs, or SMS gateways.",
  "Crowdsourced hazard information depends on the accuracy of user-submitted reports and may require staff validation.",
  "Automated summarization, where available, is intended to assist review and still benefits from human verification for critical decisions.",
];

/* ══════════════════════════════════════════════════════════════════
   THEMATIC AREAS (existing content retained)
   ══════════════════════════════════════════════════════════════════ */

const thematicAreas = [
  {
    id: "01",
    title: "Prevention and Mitigation",
    icon: ShieldCheck,
    gradient: "from-blue-600 to-blue-500",
    iconClass:
      "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    goal: "To avoid hazards and lessen potential adverse impacts.",
    items: [
      "Conducting scientific risk assessments and mapping.",
      "Enforcing stricter building codes and zoning laws.",
      "Implementing environmental protection programs such as reforestation.",
    ],
  },
  {
    id: "02",
    title: "Preparedness",
    icon: ClipboardCheck,
    gradient: "from-violet-600 to-purple-500",
    iconClass:
      "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    goal: "To establish capacity to anticipate, cope, and recover efficiently.",
    items: [
      "Organizing and conducting regular community-based drills.",
      "Managing functional evacuation centers and logistics.",
      "Training local emergency responders and volunteers.",
    ],
  },
  {
    id: "03",
    title: "Response",
    icon: Siren,
    gradient: "from-rose-600 to-red-500",
    iconClass:
      "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    goal: "To provide immediate and appropriate assistance during and after an event.",
    items: [
      "Leading Search, Rescue, and Retrieval operations.",
      "Conducting rapid Damage and Needs Assessments.",
      "Coordinating relief-goods distribution and medical services.",
    ],
  },
  {
    id: "04",
    title: "Rehabilitation and Recovery",
    icon: HeartHandshake,
    gradient: "from-emerald-600 to-teal-500",
    iconClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    goal: "To restore and improve the living conditions of the affected community.",
    items: [
      "Formulating Post-Disaster Needs Assessments.",
      "Restoring critical services such as water, power, and roads.",
      "Providing necessary psychosocial support to survivors.",
    ],
  },
];

const contactDetails = [
  {
    label: "Emergency Hotline",
    value: "0917 812 8187",
    helper: "MDRRMO Command Center",
    href: "tel:+639178128187",
    icon: Phone,
    iconClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    valueClass: "text-rose-700 dark:text-rose-300",
  },
  {
    label: "Email Address",
    value: "naicmdrrmo768@gmail.com",
    helper: "For emergency coordination",
    href: "mailto:naicmdrrmo768@gmail.com",
    icon: Mail,
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    valueClass: "text-blue-700 dark:text-blue-300",
  },
  {
    label: "Command Center",
    value: "Antero Soriano Highway",
    helper: "Naic, 4110 Cavite, Philippines",
    href: COMMAND_CENTER_LOCATION,
    icon: MapPin,
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    valueClass: "text-violet-700 dark:text-violet-300",
  },
];

/* ══════════════════════════════════════════════════════════════════
   UI ATOMS
   ══════════════════════════════════════════════════════════════════ */

function SectionBadge({ icon: Icon, children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tones[tone] || tones.blue}`}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

function SectionHeading({ id, badge, badgeIcon, tone, title, subtitle }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="flex justify-center">
        <SectionBadge icon={badgeIcon} tone={tone}>
          {badge}
        </SectionBadge>
      </div>
      <h2
        id={id}
        className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ContactCard({ contact }) {
  const Icon = contact.icon;
  const external = contact.href.startsWith("http");

  return (
    <a
      href={contact.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-105 ${contact.iconClass}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {contact.label}
      </p>
      <p
        className={`mt-1 break-words text-base font-black leading-6 ${contact.valueClass}`}
      >
        {contact.value}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {contact.helper}
      </p>
      <span className="mt-auto pt-5 text-xs font-bold text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-700 dark:text-slate-300 dark:group-hover:text-blue-300">
        {external ? "Open location" : "Contact now"}
        <ExternalLink
          className="ml-1 inline h-3.5 w-3.5"
          aria-hidden="true"
        />
      </span>
    </a>
  );
}

function ThematicAreaCard({ area }) {
  const Icon = area.icon;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800">
      <div
        className={`h-1.5 bg-gradient-to-r ${area.gradient}`}
        aria-hidden="true"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${area.iconClass}`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="font-mono text-3xl font-black text-slate-100 transition group-hover:text-blue-100 dark:text-slate-800">
            {area.id}
          </span>
        </div>
        <h3 className="mt-5 text-lg font-black leading-tight text-slate-800 dark:text-white">
          {area.title}
        </h3>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Goal
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
            {area.goal}
          </p>
        </div>
        <ul className="mt-5 space-y-3">
          {area.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white ${area.gradient}`}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function About() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      {/* 1. SYSTEM HERO */}
      <section
        className={`${GRADIENT_CLASS} relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-5 py-8 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-10 lg:px-12`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="text-center lg:text-left">
            

            <div className="mx-auto mt-6 flex w-fit items-center justify-center rounded-3xl border border-white/20 bg-white p-3 shadow-xl ring-1 ring-white/30 lg:mx-0">
              <img
                src={logoImg}
                alt="SafeResponse / MDRRMO logo"
                className="h-20  w-32 object-contain sm:h-30 sm:w-40"
              />
            </div>

            
            <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
             SafeResponse
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-blue-50/90 sm:text-base lg:mx-0">
               A centralized incident reporting and ambulance dispatch platform
              for disaster and medical emergencies.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                label: "Target Organization",
                value: "MDRRMO Naic",
                icon: Building2,
              },
              {
                label: "Institution",
                value: "CvSU – Naic Campus",
                icon: BookOpen,
              },
              {
                label: "Program",
                value: "BS Information Technology",
                icon: Layers,
              },
              {
                label: "Development Year",
                value: SYSTEM.year,
                icon: Clock3,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/80">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-black text-white">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-5 max-w-7xl space-y-8 sm:-mt-7">
        {/* MAIN WHITE CARD STACK */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className={`h-1.5 ${GRADIENT_CLASS}`} aria-hidden="true" />

          {/* 4. MISSION VISION VALUES */}
          <section className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800 dark:bg-slate-950/40">
            <SectionHeading
              badge="Mission, Vision & Values"
              badgeIcon={HeartHandshake}
              tone="emerald"
              title="Guiding principles of SafeResponse"
            />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                  Mission
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-700 dark:text-slate-200">
                  {MISSION}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                  Vision
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-700 dark:text-slate-200">
                  {VISION}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {CORE_VALUES.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {value.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. FEATURES */}
          <section className="border-t border-slate-200 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800">
            <SectionHeading
              badge="Key Features"
              badgeIcon={Layers}
              title="What SafeResponse provides"
              subtitle="Feature set based on the implemented platform and approved project scope."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.name}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                        {feature.category}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-black text-slate-800 dark:text-white">
                      {feature.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 6. HOW IT WORKS */}
          <section className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800 dark:bg-slate-950/40">
            <SectionHeading
              badge="How It Works"
              badgeIcon={Activity}
              tone="amber"
              title="End-to-end request workflow"
              subtitle="From community submission to operational review and record keeping."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {WORKFLOW.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-2xl font-black text-slate-200 dark:text-slate-700">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-black text-slate-800 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

         

          {/* 8. DEVELOPERS + RESEARCH PERSONNEL */}
          <section className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800 dark:bg-slate-950/40">
            <SectionHeading
              badge="Researchers & Personnel"
              badgeIcon={UserRound}
              title="Developers and research contributors"
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {DEVELOPERS.map((dev) => (
                <article
                  key={dev.name}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <UserRound className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-800 dark:text-white">
                    {dev.name}
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">
                    {dev.role}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {dev.program}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dev.institution}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {dev.bio}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {RESEARCH_PERSONNEL.map((person) => (
                <div
                  key={person.name}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {person.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {person.position}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {person.organization}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 9. MDRRMO + LEGAL + THEMATIC */}
          <section className="border-t border-slate-200 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800">
            <SectionHeading
              badge="MDRRMO Naic"
              badgeIcon={Building2}
              title="Partner organization and DRRM foundation"
              subtitle="SafeResponse is a student-developed platform designed to support the operations of the Naic MDRRMO."
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-1">
             

              <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                  <Scale className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                    Legal Basis
                  </p>
                  <h3 className="mt-1 text-lg font-black text-blue-950 dark:text-blue-100">
                    Republic Act No. 10121
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Philippine Disaster Risk Reduction and Management Act of
                    2010
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-800 dark:text-blue-200">
                    Provides the legal foundation for local DRRM institutions,
                    preparedness, response coordination, and risk reduction
                    responsibilities that inform the operational context of
                    SafeResponse.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-center text-lg font-black text-slate-800 dark:text-white">
                Four Thematic Areas of DRRM
              </h3>
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {thematicAreas.map((area) => (
                  <ThematicAreaCard key={area.id} area={area} />
                ))}
              </div>
            </div>
          </section>
          {/* 12. ACKNOWLEDGMENT */}
          <section className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800 dark:bg-slate-950/40">
            <SectionHeading
              badge="Acknowledgment"
              badgeIcon={HeartHandshake}
              title="With gratitude"
            />
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                The researchers express their gratitude to Almighty God; Technical
                Adviser <strong>Dr. Michelle C. Tanega</strong>; Technical Critic{" "}
                <strong>Ms. Dezza Anne A. Peregrina</strong>; Unit Research
                Coordinator <strong>Dr. Ricky Jay Riel</strong>; Campus
                Administrator <strong>Prof. Armina B. Pugay</strong>;{" "}
                <strong>Mr. Augusto A. Gonzales</strong> and the MDRRMO staff
                for guidance and cooperation; and their families, classmates,
                and friends for continued support throughout the completion of
                this study.
              </p>
            </div>
          </section>

        
        </div>

        {/* EMERGENCY CONTACT */}
        <section
          aria-labelledby="emergency-contact-title"
          className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-red-950/20 sm:p-8 lg:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500/15 blur-3xl"
          />
          <div className="relative">
            <div className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
                  <img
                    src={hotImg}
                    alt=""
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                      Emergency Information
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      24/7
                    </span>
                  </div>
                  <h2
                    id="emergency-contact-title"
                    className="mt-2 text-2xl font-black text-white sm:text-3xl"
                  >
                    MDRRMO Command Center
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    Contact the command center for emergency coordination,
                    response assistance, and official incident information.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {contactDetails.map((contact) => (
                <ContactCard key={contact.label} contact={contact} />
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <Siren
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-black text-amber-100">
                  For immediate life-threatening situations
                </p>
                <p className="mt-1 text-xs leading-6 text-amber-100/70">
                  Contact the MDRRMO Command Center and follow instructions from
                  authorized emergency responders.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="px-2 text-center text-xs leading-6 text-slate-400 dark:text-slate-600">
          SafeResponse ·  MDRRMO Naic, Cavite
        </footer>
      </div>
    </main>
  );
}