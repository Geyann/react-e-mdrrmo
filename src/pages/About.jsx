import React from 'react';
import imglogo from './Images/icon.png';

const About = () => {
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

  return (
    <div className="about-wrapper">
      <div className="about-container">
        <header className="about-header">
          <div className="logo-container">
            <img src={imglogo} alt="" width="500"/>
          </div>
          <h1 className="about-title">
            <span style={{border: '1px solid black', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'}}>i</span> 
            About Us
          </h1>
          <p className="mission-statement">
            The Municipal Disaster Risk Reduction and Management Office (MDRRMO) is the lead agency committed to 
            <strong> protecting lives, livelihoods, and assets</strong> through proactive planning and community-based resilience strategies.
          </p>
        </header>

        <div className="legal-basis">
          <h4>Legal Basis:</h4>
          <p>We operate under the authority of Republic Act No. 10121 (The Philippine DRRM Act of 2010).</p>
        </div>

        <h2 className="thematic-section-title">The Four Thematic Areas of DRRM</h2>

        <div className="thematic-grid">
          {thematicAreas.map((area) => (
            <div key={area.id} className="theme-card">
              <div className="card-header">
                <span style={{fontSize: '24px'}}>{area.symbol}</span>
                <h3 className="card-title">{area.id}. {area.title}</h3>
              </div>
              <p className="card-goal"><strong>Goal:</strong> {area.goal}</p>
              <ul className="card-list">
                {area.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <footer className="emergency-footer">
          <h2>📞 Emergency Contact Information</h2>
          <div className="contact-details">
            <strong>MDRRMO Command Center (24/7)</strong>
            <p>Emergency Hotline (Mobile): 0917-123-4567</p>
            <p>Email: mdrrmo@naic.cavite.gov.ph</p>
            <p>Address: Municipal Compound, J.P. Rizal St., Naic, Cavite</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default About;
