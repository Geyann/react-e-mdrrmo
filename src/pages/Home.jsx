import { Link } from "react-router-dom";
import {
  Ambulance,
  CalendarDays,
  ClipboardList,
  Map,
  Phone,
  ShieldCheck,
  Siren,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Clock3,
  Mail,
  Navigation,
  Radio,
} from "lucide-react";
import Icon from "../Images/logo.png";
import Icon1 from "../Images/icon3.png";
import Mdrrmo from "../Images/MDRRMO.jpg";
import LOGO from "../Images/logo1.png";
import hotImg from "../Images/hotline-h1.png";

import UserMonthlyIncidentGraph from "../components/UserMonthlyIncidentGraph";
import UserHazardMonthlyGraph from "../components/UserMonthlyHazardGraph";



const SAFETY_FEATURES = [
 {
  title: "Incident & Natural Disaster Reporting",
  description:
    "Submit reports for emergencies, hazards, and unsafe conditions with precise location details and supporting evidence.",
  icon: Siren,
},
  {
    title: "Transport Requests",
    description:
      "Request an ambulance, rescue truck, or utility vehicle for urgent response.",
    icon: Ambulance,
  },
  {
    title: "Appointments & Check-Ups",
    description:
      "Schedule office visits and submit outpatient transportation or care requests.",
    icon: CalendarDays,
  },
  {
    title: "Track Requests & Notifications",
    description:
      "Follow every submission and receive updates whenever its status changes.",
    icon: ClipboardList,
  },
  {
  title: "Public Natural Disaster Map",
  description:
    "View officially approved natural disaster zones within the municipal boundary of Naic.",
  icon: Map,
},
  {
    title: "Community Safety Analytics",
    description:
      "View monthly incident, hazard category, risk level, and service trends.",
    icon: TrendingUp,
  },
  {
    title: "Reviewed Public Information",
    description:
      "Only reviewed and approved hazard information appears on the public map.",
    icon: ShieldCheck,
  },
  {
    title: "24/7 Emergency Support",
    description:
      "Contact the MDRRMO Command Center for urgent assistance and official information.",
    icon: Phone,
  },
];


const EMERGENCY_CONTACTS = [
  {
    label: "Emergency Hotline",
    value: "0917 812 8187",
    helper: "Command Center · 24/7",
    href: "tel:+639178128187",
    icon: Phone,
    iconClass:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    valueClass:
      "text-red-700 dark:text-red-300",
  },
  {
    label: "Email Address",
    value: "naicmdrrmo768@gmail.com",
    helper: "For emergency coordination",
    href: "mailto:naicmdrrmo768@gmail.com",
    icon: Mail,
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    valueClass:
      "text-blue-700 dark:text-blue-300",
  },
  {
    label: "Command Center",
    value: "Antero Soriano Highway",
    helper: "Naic, 4110 Cavite, Philippines",
    href: "https://www.google.com/maps/place/Naic+OMDRRMO/@14.3223974,120.7692561,17z/data=!3m1!4b1!4m6!3m5!1s0x3396295b46854c2b:0xa77ec6df7a6c2793!8m2!3d14.3223922!4d120.771831!16s%2Fg%2F11vlz6vvp5?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D",
    icon: Navigation,
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    valueClass:
      "text-violet-700 dark:text-violet-300",
  },
];

function ContactCard({ contact }) {
  const Icon = contact.icon;
  const external = contact.href.startsWith("http");

  return (
    <a
      href={contact.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-red-900 dark:focus-visible:ring-offset-slate-950"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${contact.iconClass}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {contact.label}
      </p>

      <p
        className={`mt-1 break-words text-base font-black leading-6 ${contact.valueClass}`}
      >
        {contact.value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {contact.helper}
      </p>

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-red-700 dark:text-slate-200 dark:group-hover:text-red-300">
        {external ? "Open location" : "Contact now"}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}

      <section className="relative isolate min-h-[700px] overflow-hidden bg-[#071426] pt-28 text-white lg:min-h-[780px] lg:pt-32">
        {/* Background decoration */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_25%,rgba(37,99,235,0.30),transparent_35%),radial-gradient(circle_at_85%_65%,rgba(124,58,237,0.28),transparent_38%)]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:52px_52px]"
        />

        <div
          aria-hidden="true"
          className="absolute -left-24 top-40 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -right-16 bottom-0 -z-10 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-8 lg:pb-28">
          {/* Hero copy */}
          <div className="relative z-20 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-100 backdrop-blur-md sm:text-xs">
             
              Naic, Cavite
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:mx-0 lg:text-6xl xl:text-7xl">
              Report Hazards.
              <br />
              Keep Naic{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
                safe.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg lg:mx-0">
             Community safety portal for reporting hazards and incidents, 
             requesting emergency transport, appointments, and check-ups, 
             while providing natural disaster areas, trends, and coordinated 
             management for residents.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/hazardmap"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-sm font-extrabold text-white shadow-2xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426] sm:text-base"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Map className="h-5 w-5" aria-hidden="true" />
                </span>

                <span>Natural Disaster Map</span>

                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                to="/yearly-incident-trends"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-extrabold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426] sm:text-base"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </span>

                <span>View Trends</span>

                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

          
          </div>

          {/* Hero visual */}
          <div className="relative z-10 mx-auto w-full max-w-xl lg:mx-0">
            <div className="relative min-h-[440px] sm:min-h-[520px]">
              {/* Main image */}
              <div className="absolute right-0 top-0 h-[370px] w-[84%] overflow-hidden rounded-[2rem] border-4 border-white/10 bg-slate-300 shadow-2xl sm:h-[440px]">
                <img
                                  src={LOGO}
                                  alt="Flooding affecting a community"
                                  className="h-full w-full object-cover"
                                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/15 to-transparent" />

                

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                    OFFICE OF THE MUNICIPAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICER - NAIC
                  </p>

                  <p className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl">
                    Naghahanda at Kumikilos tungo sa panatag na bagong pilipinas
                  </p>
                </div>
              </div>

           

           
            </div>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
          SAFETY FEATURES
      ══════════════════════════════════════════════════════════ */}

      <section className="bg-white py-20 dark:bg-slate-900 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <img
                                  src={Icon1}
                                  alt="SafeResponse Logo"
                                  className="h-8 w-8"
                                />
              Public Information
            </div>

           <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
  Everything you need for community safety
</h2>

<p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
  Report concerns, request emergency services, track submissions, and access
  verified public safety information in one convenient portal.
</p>

          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SAFETY_FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-800 dark:hover:bg-slate-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <h3 className="mt-5 text-base font-black text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      {/* ══════════════════════════════════════════════════════════
    REPORT TYPES COMPARISON
══════════════════════════════════════════════════════════ */}

<section className="bg-slate-50 py-20 dark:bg-slate-950 sm:py-24">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Know the Difference
      </div>

      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
        Natural Hazard Report vs Emergency Incident Report
      </h2>

      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
        Choosing the correct report type helps the MDRRMO respond faster and more accurately.
      </p>
    </div>

    <div className="mt-12 grid gap-6 lg:grid-cols-2">
      {/* Natural Hazard Report */}
      <article className="relative overflow-hidden rounded-3xl border border-orange-200 bg-white p-7 shadow-sm dark:border-orange-900/50 dark:bg-slate-900">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-100/80 blur-2xl dark:bg-orange-900/30" />
        
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
            Natural Hazard Report
          </h3>

          <p className="mt-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
            For potential or existing environmental risks
          </p>

          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use this when you observe or experience natural or environmental conditions that may threaten the community, even if no one is currently injured.
          </p>

          <ul className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              Flooding, rising water, or blocked drainage
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              Landslides, soil cracks, or unstable slopes
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              Earthquake-related damage or aftershocks
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              Fallen trees, debris, or structural hazards after storms
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              Other natural disaster risks that need monitoring or public awareness
            </li>
          </ul>

          <div className="mt-6 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/40">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
              What happens next
            </p>
            <p className="mt-1 text-sm leading-5 text-orange-900/80 dark:text-orange-200/80">
              Reports are reviewed by staff. Approved hazards can appear on the public Natural Disaster Map so the community stays informed.
            </p>
          </div>
        </div>
      </article>

      {/* Emergency Incident Report */}
      <article className="relative overflow-hidden rounded-3xl border border-red-200 bg-white p-7 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-red-100/80 blur-2xl dark:bg-red-900/30" />
        
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
            <Siren className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
            Emergency Incident Report
          </h3>

          <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
            For active emergencies that need immediate response
          </p>

          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use this when a person is injured, in danger, or when urgent help (ambulance, rescue, or tools) is needed right now.
          </p>

          <ul className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Medical emergencies or people needing transport to hospital
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Accidents, injuries, or trapped individuals
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Fire, rescue, or life-threatening situations
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Situations requiring ambulance, special tools, or immediate intervention
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Any incident where delay could endanger life or safety
            </li>
          </ul>

          <div className="mt-6 rounded-2xl bg-red-50 p-4 dark:bg-red-950/40">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              What happens next
            </p>
            <p className="mt-1 text-sm leading-5 text-red-900/80 dark:text-red-200/80">
              Reports are prioritized and can trigger ambulance dispatch, staff response, and coordination with the Command Center.
            </p>
          </div>
        </div>
      </article>
    </div>

    {/* Quick tip */}
    <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-black text-blue-900 dark:text-blue-100">
            Quick tip
          </p>
          <p className="mt-1 text-sm leading-6 text-blue-800/90 dark:text-blue-200/90">
            If someone is hurt or in immediate danger → submit an <strong>Emergency Incident Report</strong>. 
            If you see a dangerous natural condition (flooding, landslide risk, etc.) that needs monitoring or public warning → submit a <strong>Natural Hazard Report</strong>.
            When in doubt, call the MDRRMO hotline first.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* ══════════════════════════════════════════════════════════
          ANALYTICS
      ══════════════════════════════════════════════════════════ */}

      <section
        id="community-analytics"
        className="bg-white py-20 dark:bg-slate-900 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              <TrendingUp
                className="h-4 w-4"
                aria-hidden="true"
              />
              Community Insights
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Incident and natural disaster trends
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Explore monthly reports to understand community
              activity, incident categories, natural disaster hazard types,
              and recorded risk levels.
            </p>
          </div>

          <div className="mt-10 grid min-w-0 gap-6 xl:grid-cols-1">
            <article className="min-w-0">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/20">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  <Siren
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Incident Reports
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Monthly incident volume by type and priority.
                  </p>
                </div>
              </div>

              <UserMonthlyIncidentGraph />
            </article>

            <article className="min-w-0">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/70 dark:bg-orange-950/20">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  <AlertTriangle
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Hazard Reports
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Monthly natural disaster volume by type and risk.
                  </p>
                </div>
              </div>

              <UserHazardMonthlyGraph />
            </article>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          EMERGENCY CONTACT
      ══════════════════════════════════════════════════════════ */}

      <section
        id="emergency-contact"
        className="bg-slate-50 pb-20 dark:bg-slate-950 sm:pb-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#450a0a] p-5 shadow-2xl sm:p-8 lg:p-10">
            {/* Decorative background */}
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:48px_48px]"
            />

            <div className="relative">
              {/* Header */}
              <div className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10">
                    <img
                      src={hotImg}
                      alt=""
                      className="h-11 w-11 object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-300">
                        Emergency Information
                      </p>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white">
                        <Clock3
                          className="h-3 w-3"
                          aria-hidden="true"
                        />
                        24/7
                      </span>
                    </div>

                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                      MDRRMO Command Center
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/70">
                      Contact the municipal command center for
                      emergency coordination, response assistance,
                      and official incident information.
                    </p>
                  </div>
                </div>

               
              </div>

              {/* Contact cards */}
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {EMERGENCY_CONTACTS.map((contact) => (
                  <ContactCard
                    key={contact.label}
                    contact={contact}
                  />
                ))}
              </div>

              {/* Notice */}
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
                  aria-hidden="true"
                />

                <div>
                  <p className="text-sm font-black text-amber-100">
                    For immediate life-threatening situations
                  </p>

                  <p className="mt-1 text-xs leading-6 text-amber-100/70">
                    Contact the MDRRMO Command Center and
                    follow instructions from authorized
                    emergency responders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}

      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
              <img
                                  src={Icon}
                                  alt="SafeResponse Logo"
                                  className="h-8 w-8"
                                />
            </div>

            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                SafeResponse
              </p>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
               Office of the Municipal Disaster Risk Reduction and Management Officer - Naic, Cavite
              </p>
            </div>
          </div>

          
        </div>
      </footer>
    </main>
  );
}
