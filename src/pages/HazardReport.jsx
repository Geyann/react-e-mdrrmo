"use client";

import { Link } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { TriangleAlertIcon } from "lucide-react";

const HazardReport = () => {
  const [hazardReport, setHazardReport] = useState({
    reporterName: "",
    department: "",
    address: "",
    landMark: "",
    reporterContact: "",
    dateObserved: "",
    timeObserved: "",
    hazardCategory: "",
    riskLevel: "",
    hazardPhotos: [],
    hazardDescription: "",
    recommendedAction: "",
    latitude: null,
    longitude: null,
  });

  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setHazardReport((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => setGeoError("Unable to retrieve location."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  function handleChange(event) {
    const { name, value, type, files } = event.target;
    if (type === "file") {
      setHazardReport((prev) => ({ ...prev, hazardPhotos: Array.from(files).slice(0, 4) }));
    } else {
      setHazardReport((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function createHazardReport(event) {
    event.preventDefault();
    // ... (Your existing Supabase logic)
  }

  return (
    <div className="min-h-screen ">
     <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto bg-white rounded-t-4xl shadow-xl border border-b-transparent border-gray-100">
        <div className="flex flex-col items-center mb-3 pt-5">
         <TriangleAlertIcon className="w-15 h-auto text-slate-200" />
           <h1 className="text-3xl font-bold text-white">Hazard & Risk Report</h1>
            <p className="text-white text-sm">Identify risks. Fields marked <span className="text-red-500">*</span> are required.</p>
         
        </div>
      </div>
           <form 
        onSubmit={createHazardReport}
        className="max-w-2xl mx-auto bg-white p-8 md:p-10 rounded-b-3xl shadow-xl border border-t-transparent border-gray-100"
      >
        <div className="flex flex-col gap-6">
         

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: "Reporter Name", name: "reporterName", placeholder: "Optional" },
                { label: "Contact Details", name: "reporterContact", placeholder: "Optional" },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <input name={field.name} onChange={handleChange} placeholder={field.placeholder} className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Location / Address<span className="text-red-500">*</span></label>
              <input name="address" onChange={handleChange} required className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Date<span className="text-red-500">*</span></label>
                <input name="dateObserved" type="date" onChange={handleChange} required className="p-3 border border-gray-300 rounded-xl" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Time<span className="text-red-500">*</span></label>
                <input name="timeObserved" type="time" onChange={handleChange} required className="p-3 border border-gray-300 rounded-xl" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Hazard Description<span className="text-red-500">*</span></label>
              <textarea name="hazardDescription" onChange={handleChange} required className="p-3 border border-gray-300 rounded-xl min-h-[100px] outline-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Photo Evidence (2-4 images)<span className="text-red-500">*</span></label>
              <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                <img src={reportImg} alt="upload" className="w-8 h-8" />
                <span className="text-gray-500 text-sm truncate">
                  {hazardReport.hazardPhotos.length > 0 ? `${hazardReport.hazardPhotos.length} images selected` : "Select files"}
                </span>
                <input name="hazardPhotos" type="file" multiple onChange={handleChange} className="hidden" accept="image/*" required />
              </label>
            </div>

            <div className={`text-xs p-3 rounded-lg ${hazardReport.latitude ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
              {hazardReport.latitude ? "✓ GPS Location acquired." : geoError || "⌛ Acquiring GPS location..."}
            </div>

            <div className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" className="mt-1" required />
              <p>I agree to the <Link to="#" className="text-blue-600 underline">Terms & Conditions</Link> and authorize the use of my GPS coordinates.</p>
            </div>

            <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg">
              Submit Hazard Report
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default HazardReport;