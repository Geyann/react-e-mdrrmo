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
    <main>
      <section className="max-w-6xl mx-auto px-6 py-12 font-sans ">
        <header className="flex flex-col items-center text-center mb-16">
          <div className="w-full max-w-[500px] mb-8">
            <img src={imglogo} alt="MDRRMO Logo" className="w-full h-auto" />
          </div>
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-6">
            <span className="size-8 flex items-center justify-center border border-black rounded-full text-sm">i</span>
            About Us
          </h1>
          <p className="max-w-2xl text-lg font-semibold text-slate-800">
            The Municipal Disaster Risk Reduction and Management Office (MDRRMO) is the lead agency committed to 
            <strong className="font-bold text-slate-900"> protecting lives, livelihoods, and assets</strong> through proactive planning and community-based resilience strategies.
          </p>
        </header>

        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-16 text-center">
          <h4 className="font-bold text-slate-900 mb-2">Legal Basis:</h4>
          <p className="text-slate-600">We operate under the authority of Republic Act No. 10121 (The Philippine DRRM Act of 2010).</p>
        </div>

        <h2 className="text-3xl font-semibold text-center mb-12">The Four Thematic Areas of DRRM</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {thematicAreas.map((area) => (
            <div key={area.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{area.symbol}</span>
                <h3 className="text-xl font-bold text-slate-800">{area.id}. {area.title}</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                <strong className="text-slate-900">Goal:</strong> {area.goal}
              </p>
              <ul className="space-y-2 text-sm text-slate-500 list-disc list-inside">
                {area.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-red-50 border-t-4 mx-6 md:mx-20 my-12 border-red-600 p-4 md:p-8 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 p-2 rounded-full">
            <img src={hotImg} alt="hazard icon" className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-red-900">Emergency Contact Information</h2>
        </div>
    
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-red-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            MDRRMO Command Center (24/7)
          </h3>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Emergency Hotline</p>
              <p className="text-red-600 font-bold text-lg">0917-123-4567</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</p>
              <p className="text-gray-800 font-medium">mdrrmo@naic.cavite.gov.ph</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Address</p>
              <p className="text-gray-800 font-medium">Municipal Compound, J. P. Rizal St., Naic, Cavite</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}