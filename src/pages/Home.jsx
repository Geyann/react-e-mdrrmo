import { Link } from "react-router-dom";
import earthquakeImg from '../Images/earthquake.jpg';
import floodingImg from '../Images/flooding.jpg';
import hotImg from '../Images/hotline-h1.png';
import hazardImg from '../Images/hazard-map-icon.png'
export default function Home() {
    return(
               <div className="homepage">
                <section className="hero-section" >
                <div className="hero-card">
                    <h1>Report Hazards. Keep <br /> Your <span className="purple-text">Community Safe.</span></h1>
                    <div className="button-group">
                        <Link href="/hazardmap" className="btn-map" ><img src={hazardImg} alt="" />View Hazard Map</Link>
                        <Link href="/incident-trends" className="btn-trends">Weekly Incident Trends</Link>
                    </div>
                    </div>
                    </section>
                    <section className="hazards-section">
                <h2 id='report-hazard-history' className="section-title">Hazards History in Naic:</h2>
                <div className="chart-grid">
                    <div className="chart-item">
                        <div className="chart-box">
                            <img id='flooding' src={floodingImg} alt="Flooding Chart " />
                        </div>
                        <p className="chart-label">Flooding</p>
                    </div>
                    <div className="chart-item">
                        <div className="chart-box">
                            <img id='earthquake' src={earthquakeImg} alt="Earthquake Chart " />
                        </div>
                        <p className="chart-label">Earthquake</p>
                    </div>
                </div>
            </section>
              <section className="emergency-footer">
                <div name="emergency-header">
                    <span className="phone-icon"><img src={hotImg} alt="hazard image" /></span>
                    <h2>Emergency Contact Information</h2>
                </div>
                <div className="emergency-body">
                    <h3>MDRRMO Command Center (24/7)</h3>
                    <div name="contact-info">
                        <p>Emergency Hotline (Mobile):</p>
                        <p className="detail">0917-123-4567</p>

                        <p>Email:</p>
                        <p className="detail">mdrrmo@naic.cavite.gov.ph</p>

                        <p>Address:</p>
                        <p className="detail">Municipal Compound, J. P. Rizal St., Naic, Cavite</p>
                    </div>
                </div>
            </section>
               </div>
    )
}