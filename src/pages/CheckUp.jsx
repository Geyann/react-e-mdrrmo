"use client";

import React, { useState } from 'react';
import { supabase } from '../createClient';
import { HeartPlus } from 'lucide-react';

const CheckUp = () => {
  const [checkUp, setCheckUp] = useState({
    patientName: "", location: "", hospitalName: "", contactDetails: "",
    preferredDate: "", preferredTime: "", mobility: "", patientFor: "",
    specificVehicle: "", escort: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setCheckUp((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const finalEscort = checkUp.escort === "other" ? checkUp.specificVehicle : checkUp.escort;

    const { error } = await supabase
      .from("outPatientCheckUp")
      .insert([{
        patientName: checkUp.patientName,
        location: checkUp.location,
        hospitalName: checkUp.hospitalName,
        contactDetails: checkUp.contactDetails,
        preferredDate: checkUp.preferredDate,
        preferredTime: checkUp.preferredTime,
        mobility: checkUp.mobility,
        patientFor: checkUp.patientFor,
        escort: finalEscort
      }]);

    if (error) {
      console.error("Error:", error);
    } else {
      alert("Submitted successfully!");
      setCheckUp({
        patientName: "", location: "", hospitalName: "", contactDetails: "",
        preferredDate: "", preferredTime: "", mobility: "", patientFor: "",
        specificVehicle: "", escort: "",
      });
    }
  }

  return (
    <div className="min-h-screen pt-10">
   

       <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto bg-white rounded-t-4xl shadow-xl border border-b-transparent border-gray-100">
        <div className="flex flex-col items-center mb-3 pt-5">
        <HeartPlus className='h-15 w-auto text-white'/>
            <h1 className="text-4xl font-bold text-white">Out Patient Check Up</h1>
          <p className="text-white text-sm text-center">
            Fields marked <span className="text-red-500">*</span> are required for assessment.
          </p>
        </div>
        </div>
     
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white px-10 pb-10 pt-5 rounded-b-3xl shadow-xl border border-gray-100"
      >
        

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: "Patient Name", name: "patientName" },
            { label: "Location / Address", name: "location" },
            { label: "Hospital Name", name: "hospitalName" },
            { label: "Contact Details", name: "contactDetails" },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{field.label} <span className="text-red-500">*</span></label>
              <input name={field.name} value={(checkUp )[field.name]} onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Preferred Date <span className="text-red-500">*</span></label>
            <input type="date" name="preferredDate" value={checkUp.preferredDate} onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Preferred Time <span className="text-red-500">*</span></label>
            <input type="time" name="preferredTime" value={checkUp.preferredTime} onChange={handleChange} className="p-3 border border-gray-300 rounded-xl outline-none" required />
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {[
            { label: "Mobility", name: "mobility", options: ["Stretcher", "Wheel Chair", "Walker"] },
            { label: "Patient for", name: "patientFor", options: ["Admission", "Discharge", "Check Up"] },
            { label: "Escort / Vehicle", name: "escort", options: ["Medical", "Family", "Other"] },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{field.label} <span className="text-red-500">*</span></label>
              <select name={field.name} value={(checkUp)[field.name]} onChange={handleChange} className="p-3 border border-gray-300 rounded-xl bg-white outline-none" required>
                <option value="">Select an Option</option>
                {field.options.map(opt => <option key={opt} value={opt.toLowerCase().replace(" ", "-")}>{opt}</option>)}
              </select>
            </div>
          ))}

          {checkUp.escort === "other" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-gray-700">Specify Escort/Vehicle</label>
              <input name="specificVehicle" value={checkUp.specificVehicle} onChange={handleChange} className="p-3 border border-blue-500 rounded-xl outline-none" placeholder="Enter details..." required />
            </div>
          )}
        </div>

        <button type="submit" className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
          Submit
        </button>
      </form>
    </div>
    
  );
};

export default CheckUp;