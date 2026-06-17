import { Link } from "react-router-dom";
import earthquakeImg from '../Images/earthquake.jpg';
import floodingImg from '../Images/flooding.jpg';
import hotImg from '../Images/hotline-h1.png';
import hazardImg from '../Images/hazard-map-icon.png'
import UserMonthlyIncidentGraph from "../components/UserMonthlyIncidentGraph";
import UserHazardMonthlyGraph from "../components/UserMonthlyHazardGraph";
import { Map, TrendingUp } from "lucide-react";
export default function Guest() {
    return(
               <div className="">
               <section className="w-full py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center gap-8">
            <h1 className="text-5xl md:text-7xl tracking-tighter font-bold text-slate-900 max-w-3xl">
              Report Hazards. Keep <br /> 
              <span className="text-purple-700">Your Community Safe.</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/guest/hazardmap" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-700 text-white rounded-lg font-medium hover:bg-cyan-700 transition-all shadow-lg hover:shadow-cyan-200"
              >
                <Map className="w-5 h-5" /> View Hazard Map
              </Link>
              <Link 
                to="/guest/yearly-incident-trends" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all"
              >
                <TrendingUp className="w-5 h-5" /> Yearly Incident Trends
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hazards History Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 id="report-hazard-history" className="text-3xl font-bold text-center mb-12 text-slate-900">
            Hazards History in Naic
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Chart 1 */}
            <div className="flex flex-col gap-4">
              <div className="">
                <UserMonthlyIncidentGraph />
              </div>
              <p className="text-center font-semibold text-slate-700">Incidents Reported</p>
            </div>

            {/* Chart 2 */}
            <div className="flex flex-col gap-4">
              <div className="">
                <UserHazardMonthlyGraph />
              </div>
              <p className="text-center font-semibold text-slate-700">Hazard and Risk Reported</p>
            </div>
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