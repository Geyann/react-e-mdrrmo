"use client";

import React, { useState } from "react";
import AdminAppointmentAnalytics from "./AdminAppointmentAnalytics"; // Your existing chart component
import AvailabilityCalendar from "./AvailabilityCalendar"; // Your availability component

const AdminCalendar = () => {
  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black text-slate-800 mb-8">ADMIN DASHBOARD</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Section - Spans 2 columns */}
        <div className="lg:col-span-2">
          <AdminAppointmentAnalytics />
        </div>

        {/* Availability Calendar - Sidebar */}
        <div className="lg:col-span-1">
          <AvailabilityCalendar />
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;