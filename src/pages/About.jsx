import React from 'react';
import imglogo from '../Images/logo1.png';
import hotImg from '../Images/hotline-h1.png'

const thematicAreas = [
  {
    id: 1,
    title: "Prevention and Mitigation",
    symbol: "🛡️",
    goal: "To avoid hazards and lessen potential adverse impacts.",
    items: [
      "Conducting scientific risk assessments and mapping.",
      "Enforcement of stricter building codes and zoning laws.",
      "Implementing environmental protection (e.g., reforestation)."
    ]
  },
  {
    id: 2,
    title: "Preparedness",
    symbol: "📋",
    goal: "To establish capacity to anticipate, cope, and recover efficiently.",
    items: [
      "Organizing and conducting regular, community-based drills.",
      "Managing functional evacuation centers and logistics.",
      "Training local emergency responders and volunteers."
    ]
  },
  {
    id: 3,
    title: "Response",
    symbol: "➕",
    goal: "To provide immediate and appropriate assistance during and after an event.",
    items: [
      "Leading Search, Rescue, and Retrieval (SRR) operations.",
      "Conducting rapid Damage and Needs Assessments (DANA).",
      "Coordinating relief goods distribution and medical services."
    ]
  },
  {
    id: 4,
    title: "Rehabilitation and Recovery",
    symbol: "🌍",
    goal: "To restore and improve the living conditions of the affected community.",
    items: [
      "Formulating Post-Disaster Needs Assessments (PDNA).",
      "Restoring critical services (water, power, roads).",
      "Providing necessary psychosocial support to survivors."
    ]
  }
];

export default function About() {
  return (
    /* Same shell as Appointment: plain light page, no dark bg, no mono font */
    <main className="min-h-screen p-4 sm:p-10 font-sans">

      {/* ─── Gradient header — same as "Schedule an Appointment" banner ─── */}
      <div className="max-w-6xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl shadow-xl border border-gray-200">
        <div className="flex flex-col items-center mb-3 pt-8 pb-2">
          <div className="bg-white rounded-2xl p-3 shadow-md mb-4">
            <img src={imglogo} alt="MDRRMO Logo" className="w-28 sm:w-40 h-auto" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center">
            About Us
          </h1>
          <p className="text-white text-sm sm:text-base">
            Municipal Disaster Risk Reduction and Management Office
          </p>
        </div>
      </div>

      {/* ─── White body card — same as the appointment form card ─── */}
      <section className="max-w-6xl mx-auto bg-white p-6 md:p-10 rounded-b-3xl shadow-xl border border-gray-200">

        {/* Intro */}
        <header className="flex flex-col items-center text-center mb-10">
          <p className="max-w-3xl text-base sm:text-lg font-semibold text-gray-700 leading-relaxed">
            The Municipal Disaster Risk Reduction and Management Office (MDRRMO) is the lead agency committed to
            <strong className="font-bold text-gray-900"> protecting lives, livelihoods, and assets</strong> through
            proactive planning and community-based resilience strategies.
          </p>
        </header>

        {/* Legal Basis — blue info chip, same family as the "Logged in as" banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-12 text-center">
          <h4 className="font-bold text-blue-900 mb-1">Legal Basis:</h4>
          <p className="text-blue-700">
            We operate under the authority of Republic Act No. 10121 (The Philippine DRRM Act of 2010).
          </p>
        </div>

        {/* Thematic Areas */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-gray-800">
          The Four Thematic Areas of DRRM
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {thematicAreas.map((area) => (
            <div
              key={area.id}
              className="border border-black rounded-2xl p-6 hover:shadow-lg hover:border-blue-300 transition-all bg-white"
            >
              <div className="flex items-center gap-3 mb-4">
                {/* Icon chip — same rounded-full style as the hazard icon in the emergency block */}
                <span className="bg-blue-100 p-2 rounded-full text-2xl leading-none">
                  {area.symbol}
                </span>
                <h3 className="text-lg font-bold text-gray-800 leading-tight">
                  {area.id}. {area.title}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                <strong className="text-gray-900">Goal:</strong> {area.goal}
              </p>

              <ul className="space-y-2 text-sm text-gray-500 list-disc list-inside">
                {area.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Emergency Contact — red-50 banner family, same as appointment's error banners ─── */}
      <section className="max-w-6xl mx-auto bg-red-50 border border-red-200 my-8 p-4 md:p-8 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 p-2 rounded-full">
            <img src={hotImg} alt="hazard icon" className="size-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-red-900">
            Emergency Contact Information
          </h2>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-2xl border border-red-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            MDRRMO Command Center (24/7)
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs text-black uppercase tracking-wider font-bold">Emergency Hotline</p>
              <a href="tel:09171234567" className="text-red-600 font-bold text-lg select-none">
                0917-123-4567
              </a>
            </div>

            <div>
              <p className="text-xs text-black uppercase tracking-wider font-bold">Email</p>
              <a href="mailto:mdrrmo@naic.cavite.gov.ph" className="text-gray-800 font-medium break-all">
                mdrrmo@naic.cavite.gov.ph
              </a>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Address</p>
              <p className="text-black font-medium">Municipal Compound, J. P. Rizal St., Naic, Cavite</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}