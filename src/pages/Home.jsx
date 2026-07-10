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
            <h1 className="text-5xl md:text-7xl tracking-tighter font-bold text-slate-900 max-w-3xl pt-20 ">
              Report Hazards. Keep <br /> 
              <span className="text-purple-700">Your Community Safe.</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/hazardmap" 
                className="inline-flex items-center gap-2 px-10 border border-purple-900 py-3 bg-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:bg-purple-900"
              >
                <Map className="w-5 h-5" /> View Hazard Map
              </Link>
              <Link 
                to="/yearly-incident-trends" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 border border-gray-400 text-slate-700 rounded-lg font-medium hover:bg-gray-400 transition-all"
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
          <h2 id="report-hazard-history" className="text-4xl font-bold text-center mb-12 text-slate-900">
            Hazards History in Naic
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Chart 1 */}
            <div className="flex flex-col gap-4">
              <div className="">
                <UserMonthlyIncidentGraph />
              </div>
              <p className="text-center text-xl font-semibold text-black">Incidents Reported</p>
            </div>

            {/* Chart 2 */}
            <div className="flex flex-col gap-4">
              <div className="">
                <UserHazardMonthlyGraph />
              </div>
              <p className="text-center font-semibold text-black text-xl">Hazard and Risk Reported</p>
            </div>
          </div>
        </div>
      </section>

             <section className="bg-red-50 border-t-4 m-20 border-red-600 p-1 md:p-8 rounded-t-3xl rounded-b-3xl shadow-lg">
  {/* Header */}
  <div className="flex items-center gap-3 mb-6">
    <div className="bg-red-100 p-2 rounded-full">
      <img src={hotImg} alt="hazard icon" className="size-6" />
    </div>
    <h2 className="text-2xl font-bold text-red-900">Emergency Contact Information</h2>
  </div>

  {/* Body */}
  <div className="bg-white p-20 rounded-2xl border border-red-100 shadow-sm">
    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-500">
      MDRRMO Command Center (24/7)
    </h3>
    
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Emergency Hotline</p>
        <p className="text-red-600 font-bold text-lg">0917-123-4567</p>
      </div>
      
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Email</p>
        <p className="text-gray-800 font-medium">mdrrmo@naic.cavite.gov.ph</p>
      </div>
      
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Address</p>
        <p className="text-gray-800 font-medium">Municipal Compound, J. P. Rizal St., Naic, Cavite</p>
      </div>
    </div>
  </div>
</section>
               </div>
    )
}