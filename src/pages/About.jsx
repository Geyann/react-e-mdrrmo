"use client";

import {
  Building2,
  Check,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Siren,
  Sparkles,
  Target,
} from "lucide-react";

import imglogo from "../Images/logo1.png";
import hotImg from "../Images/hotline-h1.png";

const GRADIENT_CLASS =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

const COMMAND_CENTER_LOCATION =
  "https://www.google.com/maps/place/Naic+OMDRRMO/@14.3223974,120.7692561,17z/data=!3m1!4b1!4m6!3m5!1s0x3396295b46854c2b:0xa77ec6df7a6c2793!8m2!3d14.3223922!4d120.771831!16s%2Fg%2F11vlz6vvp5?entry=ttu";

/* ══════════════════════════════════════════════════════════════════
   DRRM THEMATIC AREAS
   ══════════════════════════════════════════════════════════════════ */

const thematicAreas = [
  {
    id: "01",
    title: "Prevention and Mitigation",
    icon: ShieldCheck,
    gradient: "from-blue-600 to-blue-500",
    iconClass:
      "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    goal:
      "To avoid hazards and lessen potential adverse impacts.",
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
    goal:
      "To establish capacity to anticipate, cope, and recover efficiently.",
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
    goal:
      "To provide immediate and appropriate assistance during and after an event.",
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
    goal:
      "To restore and improve the living conditions of the affected community.",
    items: [
      "Formulating Post-Disaster Needs Assessments.",
      "Restoring critical services such as water, power, and roads.",
      "Providing necessary psychosocial support to survivors.",
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════
   QUICK FACTS
   ══════════════════════════════════════════════════════════════════ */

const quickFacts = [
  {
    value: "04",
    label: "Thematic Areas",
    icon: Target,
  },
  {
    value: "24/7",
    label: "Command Center",
    icon: Clock3,
  },
  {
    value: "Community",
    label: "Based DRRM Approach",
    icon: Building2,
  },
];

/* ══════════════════════════════════════════════════════════════════
   CONTACT CARDS
   ══════════════════════════════════════════════════════════════════ */

const contactDetails = [
  {
    label: "Emergency Hotline",
    value: "0917 812 8187",
    helper: "MDRRMO Command Center",
    href: "tel:+639178128187",
    icon: Phone,
    iconClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    valueClass:
      "text-rose-700 dark:text-rose-300",
  },
  {
    label: "Email Address",
    value: "naicmdrrmo768@gmail.com",
    helper: "For emergency coordination",
    href: "mailto:naicmdrrmo768@gmail.com",
    icon: Mail,
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    valueClass:
      "text-blue-700 dark:text-blue-300",
  },
  {
    label: "Command Center",
    value: "Antero Soriano Highway",
    helper: "Naic, 4110 Cavite, Philippines",
    href: COMMAND_CENTER_LOCATION,
    icon: MapPin,
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    valueClass:
      "text-violet-700 dark:text-violet-300",
  },
];

/* ══════════════════════════════════════════════════════════════════
   REUSABLE CONTACT CARD
   ══════════════════════════════════════════════════════════════════ */

function ContactCard({ contact }) {
  const Icon = contact.icon;
  const external = contact.href.startsWith("http");

  return (
    <a
      href={contact.href}
      target={external ? "_blank" : undefined}
      rel={
        external
          ? "noopener noreferrer"
          : undefined
      }
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-105 ${contact.iconClass}`}
      >
        <Icon
          className="h-5 w-5"
          aria-hidden="true"
        />
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
        {external
          ? "Open location"
          : "Contact now"}
        <ExternalLink
          className="ml-1 inline h-3.5 w-3.5"
          aria-hidden="true"
        />
      </span>
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REUSABLE THEMATIC AREA CARD
   ══════════════════════════════════════════════════════════════════ */

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
            <Icon
              className="h-6 w-6"
              aria-hidden="true"
            />
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
                <Check
                  className="h-3 w-3"
                  strokeWidth={3}
                  aria-hidden="true"
                />
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
      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className={`${GRADIENT_CLASS} relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-5 py-8 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-10 lg:px-12`}
      >
        {/* Decorative background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Hero copy */}
          <div className="text-center lg:text-left">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-50 backdrop-blur-sm lg:mx-0">
              <Sparkles
                className="h-4 w-4"
                aria-hidden="true"
              />

              SafeResponse · Naic, Cavite
            </div>

            <div className="mx-auto mt-6 flex w-fit items-center justify-center rounded-3xl border border-white/20 bg-white p-3 shadow-xl ring-1 ring-white/30 lg:mx-0">
              <img
                src={imglogo}
                alt="MDRRMO logo"
                className="h-20 w-32 object-contain sm:h-24 sm:w-40"
              />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
              Municipal Disaster Risk Reduction
              and Management Office
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Building safer and more resilient communities.
            </h1>

            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-blue-50/90 sm:text-base lg:mx-0">
              The MDRRMO serves as Naic&apos;s lead agency for disaster risk reduction, emergency preparedness, response coordination, and community recovery.
            </p>
          </div>

          {/* Quick facts */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {quickFacts.map((fact) => {
              const Icon = fact.icon;

              return (
                <div
                  key={fact.label}
                  className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/15"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <Icon
                      className="h-5 w-5 text-white"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xl font-black text-white">
                      {fact.value}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-blue-50/80">
                      {fact.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="relative z-10 mx-auto -mt-5 max-w-7xl sm:-mt-7">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div
            className={`h-1.5 ${GRADIENT_CLASS}`}
            aria-hidden="true"
          />

          {/* Introduction */}
          <section
            aria-labelledby="about-introduction-title"
            className="px-5 py-10 sm:px-8 sm:py-12 lg:px-12"
          >
            <div className="mx-auto max-w-4xl text-center">
              <div
                className={`mx-auto flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300`}
              >
                <ShieldCheck
                  className="h-4 w-4"
                  aria-hidden="true"
                />

                Our Mandate
              </div>

              <h2
                id="about-introduction-title"
                className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
              >
                Protecting lives, livelihoods, and assets
              </h2>

              <p className="mt-4 text-base font-medium leading-8 text-slate-600 dark:text-slate-300">
                The Municipal Disaster Risk Reduction and Management Office is committed to protecting lives, livelihoods, and assets through proactive planning and community-based resilience strategies.
              </p>
            </div>

            {/* Commitments */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Life and Safety",
                  description:
                    "Reduce exposure to hazards and strengthen emergency response.",
                  icon: ShieldCheck,
                },
                {
                  title: "Community Resilience",
                  description:
                    "Prepare residents and local responders before disasters occur.",
                  icon: HeartHandshake,
                },
                {
                  title: "Coordinated Recovery",
                  description:
                    "Restore essential services and help communities recover.",
                  icon: Building2,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/50"
                  >
                    <Icon
                      className="h-6 w-6 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />

                    <h3 className="mt-3 text-sm font-black text-slate-800 dark:text-white">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Legal basis */}
          <section className="px-5 pb-10 sm:px-8 sm:pb-12 lg:px-12">
            <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:p-6 dark:border-blue-900 dark:bg-blue-950/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                <Scale
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  Legal Basis
                </p>

                <h2 className="mt-1 text-lg font-black text-blue-950 dark:text-blue-100">
                  Republic Act No. 10121
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-200">
                  The Philippine Disaster Risk Reduction and Management Act of 2010 provides the legal foundation for the MDRRMO&apos;s mandate, responsibilities, and coordination efforts.
                </p>
              </div>
            </div>
          </section>

          {/* Thematic areas */}
          <section
            aria-labelledby="thematic-areas-title"
            className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <div className="mx-auto max-w-3xl text-center">
              <div
                className={`mx-auto flex w-fit items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-purple-700 dark:bg-purple-950/50 dark:text-purple-300`}
              >
                <Target
                  className="h-4 w-4"
                  aria-hidden="true"
                />

                DRRM Framework
              </div>

              <h2
                id="thematic-areas-title"
                className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
              >
                The Four Thematic Areas of DRRM
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                These interconnected areas guide prevention, preparedness, response, and recovery efforts before, during, and after emergencies.
              </p>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {thematicAreas.map((area) => (
                <ThematicAreaCard
                  key={area.id}
                  area={area}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================
          EMERGENCY CONTACT
      ===================================================== */}

      <section
        aria-labelledby="emergency-contact-title"
        className="relative mx-auto mt-8 max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-red-950/20 sm:p-8 lg:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl"
        />

        <div className="relative">
          {/* Emergency header */}
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
                    <Clock3
                      className="h-3 w-3"
                      aria-hidden="true"
                    />

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
                  Contact the command center for emergency coordination, response assistance, and official incident information.
                </p>
              </div>
            </div>

            <a
              href="tel:+639178128187"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-red-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              <Phone
                className="h-4 w-4"
                aria-hidden="true"
              />

              Call Emergency Hotline
            </a>
          </div>

          {/* Contact cards */}
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {contactDetails.map((contact) => (
              <ContactCard
                key={contact.label}
                contact={contact}
              />
            ))}
          </div>

          {/* Important notice */}
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
                Contact the MDRRMO Command Center and follow instructions from authorized emergency responders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <footer className="mx-auto mt-6 max-w-7xl px-2 text-center text-xs leading-6 text-slate-400 dark:text-slate-600">
        SafeResponse · Municipal Disaster Risk Reduction and Management Office · Naic, Cavite
      </footer>
    </main>
  );
}
