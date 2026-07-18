"use client";

import { Link } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState } from "react";
import { supabase } from "../createClient";
import { AlertTriangleIcon, Siren } from "lucide-react";

const Report = () => {
  const [report, setReport] = useState({
    patientName: "",
    address: "",
    landMark: "",
    reporterContact: "",
    date: "",
    time: "",
    incidentType: "",
    priorityLevel: "",
    pictureOfIncident: null,
    specialNeeds: "",
    requiredTools: "",
  });

  function handleChange(event) {
    const { name, value, type, files } = event.target;
    setReport((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  }

  async function createUser(event) {
    event.preventDefault();
    // ... (Your existing Supabase logic remains the same)
  }

  return (
    <div className="min-h-screen pt-10">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto bg-white rounded-t-4xl shadow-xl border border-b-transparent border-gray-100">
        <div className="flex flex-col items-center mb-3 pt-5">
         <Siren className="w-15 h-auto text-slate-200"/>
       <h1 className="text-3xl font-bold text-white">Report an Incident</h1>
            <p className="text-white text-sm">
              Please provide details below. All fields marked <span className="text-red-500">*</span> are required.
            </p>
        </div>
      </div><form
        onSubmit={createUser}
        className="max-w-2xl mx-auto bg-white p-8 md:p-10 rounded-b-3xl shadow-b-xl border border-t-transparent border-gray-200"
      >
        
        <div className=" flex flex-col gap-6">
        
          <div className="grid grid-cols-1 gap-5">
            {[
              { label: "Patient Name", name: "patientName", type: "text", placeholder: "Enter Patient Name" },
              { label: "Location / Address", name: "address", type: "text", placeholder: "Enter Address" },
              { label: "Land Mark", name: "landMark", type: "text", placeholder: "Enter Land mark" },
              { label: "Reporter Contact", name: "reporterContact", type: "text", placeholder: "Enter Contact Details" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">{field.label}<span className="text-red-500">*</span></label>
                <input
                  name={field.name}
                  type={field.type}
                  value={(report)[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Date<span className="text-red-500">*</span></label>
                <input name="date" type="date" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Time<span className="text-red-500">*</span></label>
                <input name="time" type="time" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Incident Type<span className="text-red-500">*</span></label>
                <select name="incidentType" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl bg-white" required>
                  <option value="">Select an Option</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Fire">Fire</option>
                  <option value="Accident">Accident</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Priority Level<span className="text-red-500">*</span></label>
                <select name="priorityLevel" onChange={handleChange} className="p-3 border border-gray-300 rounded-xl bg-white" required>
                  <option value="">Select an Option</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Picture of Incident<span className="text-red-500">*</span></label>
              <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <img src={reportImg} alt="upload" className="w-8 h-8" />
                <span className="text-gray-500">{report.pictureOfIncident ? (report.pictureOfIncident).name : "Upload PNG / JPEG"}</span>
                <input name="pictureOfIncident" type="file" onChange={handleChange} className="hidden" accept="image/*" required />
              </label>
            </div>

            <button 
              type="submit" 
              className="w-full mt-4 bg-purple-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg"
            >
              Submit Incident Report
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Report;