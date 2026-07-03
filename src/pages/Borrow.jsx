"use client";

import React, { useState } from "react";
import { supabase } from "../createClient";
import { Ambulance } from "lucide-react";

const Borrow = () => {
  const [borrow, setBorrow] = useState({
    dispatchNum: "",
    departure: "",
    arrival: "",
    contactNum: "",
    vehicle: "",
    requestedBy: "",
    purpose: "",
    destination: "",
    date: "",
    time: "",
  });

  function handleChange(event) {
    setBorrow((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    const { data, error } = await supabase
      .from("borrow-vehicle")
      .insert([borrow]);

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    alert("Request submitted successfully!");
    setBorrow({
      dispatchNum: "", departure: "", arrival: "", contactNum: "",
      vehicle: "", requestedBy: "", purpose: "", destination: "",
      date: "", time: "",
    });
  }

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 ">
      <form
        onSubmit={submitRequest}
        className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8 pt-5">
          <Ambulance className="w-20 h-auto" />
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Emergency Response Vehicle Dispatch
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            All fields marked <span className="text-red-500">*</span> are required.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          Kilometer Reading
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Departure", name: "departure", type: "text" },
            { label: "Date", name: "date", type: "date" },
            { label: "Arrival", name: "arrival", type: "text" },
            { label: "Time", name: "time", type: "time" },
            { label: "Contact No.", name: "contactNum", type: "number" },
            { label: "Dispatch No.", name: "dispatchNum", type: "text" },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {field.label} <span className="text-red-500">*</span>
              </label>
              <input
                name={field.name}
                type={field.type}
                value={(borrow )[field.name]}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Vehicle to be used <span className="text-red-500">*</span></label>
            <select
              name="vehicle"
              onChange={handleChange}
              value={borrow.vehicle}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white outline-none focus:border-blue-500"
              required
            >
              <option value="">Select an Option</option>
              <option value="ambulance">Ambulance</option>
              <option value="rescue-truck">Rescue Truck</option>
              <option value="utility-van">Utility Van</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Requested By <span className="text-red-500">*</span></label>
              <input name="requestedBy" onChange={handleChange} value={borrow.requestedBy} className="p-3 border border-gray-300 rounded-xl outline-none" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Purpose <span className="text-red-500">*</span></label>
              <input name="purpose" onChange={handleChange} value={borrow.purpose} className="p-3 border border-gray-300 rounded-xl outline-none" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Destination <span className="text-red-500">*</span></label>
            <input name="destination" onChange={handleChange} value={borrow.destination} className="p-3 border border-gray-300 rounded-xl outline-none" required />
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          Submit ERVD
        </button>
      </form>
    </div>
  );
};

export default Borrow;