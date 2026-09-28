import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Eye,
  Mail,
  Map,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Siren,
  TrendingUp,
} from "lucide-react";
import Icon from "../Images/logo.png";

import earthquakeImg from "../Images/earthquake.png";
import floodingImg from "../Images/flooding.png";
import hazardImg from "../Images/hazard-map-icon.png";
import hotImg from "../Images/hotline-h1.png";

import UserMonthlyIncidentGraph from "../components/UserMonthlyIncidentGraph";
import UserHazardMonthlyGraph from "../components/UserMonthlyHazardGraph";

const PUBLIC_TOOLS = [
  {
    title: "Public Hazard Map",
    description:
      "Explore approved hazard hotspots across Naic using the public hotspot map.",
    icon: Map,
    href: "/hazardmap",
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    buttonClass:
      "text-blue-700 dark:text-blue-300",
    image: hazardImg,
  },
  {
    title: "Incident Trends",
    description:
      "Review monthly incident and hazard analytics to understand community trends.",
    icon: TrendingUp,
    href: "/yearly-incident-trends",
    iconClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    buttonClass:
      "text-purple-700 dark:text-purple-300",
  },
];

const SAFETY_FEATURES = [
  {
    title: "Approved Hotspots Only",
    description:
      "Public maps display only hazard reports approved for community visibility.",
    icon: CheckCircle2,
  },
  {
    title: "Boundary-Limited",
    description:
      "Hazard information is displayed only within the official Naic boundary.",
    icon: MapPin,
  },
  {
    title: "Community Analytics",
    description:
      "Charts make monthly incident and hazard patterns easier to understand.",
    icon: TrendingUp,
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

export default function Guest() {
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
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              SafeResponse · Naic, Cavite
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
              View public hazard hotspots, understand community
              incident trends, and quickly contact the MDRRMO
              Command Center when help is needed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/hazardmap"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-sm font-extrabold text-white shadow-2xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426] sm:text-base"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Map className="h-5 w-5" aria-hidden="true" />
                </span>

                <span>Open Hazard Map</span>

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

            <div className="mt-7 flex flex-col items-center gap-3 text-sm text-slate-300 sm:flex-row sm:justify-center lg:justify-start">
              <span className="flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />
                Approved public hotspots
              </span>

              <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:block" />

              <span className="flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />
                No public report details
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative z-10 mx-auto w-full max-w-xl lg:mx-0">
            <div className="relative min-h-[440px] sm:min-h-[520px]">
              {/* Main image */}
              <div className="absolute right-0 top-0 h-[370px] w-[84%] overflow-hidden rounded-[2rem] border-4 border-white/10 bg-slate-800 shadow-2xl sm:h-[440px]">
                <img
                  src={floodingImg}
                  alt="Flooding affecting a community"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/15 to-transparent" />

                <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    <Radio
                      className="h-3.5 w-3.5 text-red-400"
                      aria-hidden="true"
                    />
                    Community Safety
                  </span>

                  <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white shadow-lg">
                    Naic
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                    Public Safety Information
                  </p>

                  <p className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                    Prepared communities respond faster.
                  </p>
                </div>
              </div>

              {/* Supporting image */}
              <div className="absolute left-0 top-20 h-48 w-48 overflow-hidden rounded-[1.75rem] border-4 border-white/10 bg-slate-800 shadow-2xl sm:h-60 sm:w-60">
                <img
                  src={earthquakeImg}
                  alt="Earthquake preparedness"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-orange-300">
                    Preparedness
                  </p>

                  <p className="mt-1 text-sm font-black leading-5 text-white">
                    Plan before an emergency happens.
                  </p>
                </div>
              </div>

              {/* Hotspot map card */}
              <div className="absolute bottom-2 left-5 z-20 w-[250px] rounded-2xl border border-white/15 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:left-10 sm:w-[285px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
                    <img
                      src={hazardImg}
                      alt=""
                      className="h-9 w-9 object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">
                      Public Hotspot Map
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      View approved risk areas
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                    <Eye
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    No report details
                  </span>

                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                </div>
              </div>

              {/* Command center card */}
              <div className="absolute right-2 bottom-32 z-20 flex items-center gap-3 rounded-2xl border border-red-300/20 bg-red-950/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:right-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                  <Siren
                    className="h-5 w-5 text-red-300"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-red-300">
                    Command Center
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    Available 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PUBLIC TOOLS
      ══════════════════════════════════════════════════════════ */}

      <section className="relative z-30 -mt-8 pb-16 sm:-mt-10 sm:pb-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          {PUBLIC_TOOLS.map((tool, index) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                to={tool.href}
                className={`group flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-950 ${
                      index === 0
                        ? "border-blue-100 dark:border-blue-900"
                        : "border-purple-100 dark:border-purple-900"
                    }`}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tool.iconClass}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                    {tool.title}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                    {tool.description}
                  </p>
                </div>

                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 transition group-hover:translate-x-1 dark:bg-slate-800 ${tool.buttonClass}`}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
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
                                  src={Icon}
                                  alt="SafeResponse Logo"
                                  className="h-8 w-8"
                                />
              Public Information
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Designed for community awareness
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              The public portal presents general safety information
              without exposing individual reports or sensitive
              report details.
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
          PREPAREDNESS
      ══════════════════════════════════════════════════════════ */}

      <section className="bg-slate-50 py-20 dark:bg-slate-950 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                <AlertTriangle
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Disaster Preparedness
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                Build awareness before an emergency
              </h2>

              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                Learn how different hazards affect communities
                and recognize the importance of preparation.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <BellRing
                className="h-4 w-4 text-orange-500"
                aria-hidden="true"
              />
              Prepare early. Respond calmly.
            </span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* Earthquake */}
            <article className="group relative min-h-[390px] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-xl">
              <img
                src={earthquakeImg}
                alt="Earthquake preparedness"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />

              <div className="relative flex min-h-[390px] flex-col justify-end p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-orange-500 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
                    Earthquake
                  </span>

                  <span className="rounded-full border border-white/20 bg-slate-950/50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Preparedness
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                  Know what to do during ground shaking
                </h3>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">
                  Stay calm, protect yourself, and follow
                  official instructions from local authorities.
                </p>
              </div>
            </article>

            {/* Flooding */}
            <article className="group relative min-h-[390px] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-xl">
              <img
                src={floodingImg}
                alt="Flood preparedness"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/55 to-blue-950/10" />

              <div className="relative flex min-h-[390px] flex-col justify-end p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
                    Flooding
                  </span>

                  <span className="rounded-full border border-white/20 bg-slate-950/50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Preparedness
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                  Avoid flooded roads and unsafe areas
                </h3>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">
                  Monitor official advisories and move to
                  safer areas when evacuation is advised.
                </p>
              </div>
            </article>
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
              Incident and hazard trends
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Explore monthly reports to understand community
              activity, incident categories, hazard types,
              and recorded risk levels.
            </p>
          </div>

          <div className="mt-10 grid min-w-0 gap-6 xl:grid-cols-2">
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
                    Monthly hazard volume by type and risk.
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

                <a
                  href="tel:+639178128187"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-red-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-950"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call Emergency Hotline
                </a>
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
                SafeResponse · Naic
              </p>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Municipal Disaster Risk Reduction and
                Management Office
              </p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Public safety information and emergency contacts
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Community Hazard Map · Incident Trends ·
              Emergency Response
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
