import React, { useState, useEffect } from 'react';
import { supabase } from '../createClient';

// Import DataTables
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

// Initialize DataTables
DataTable.use(DT);

const TrackAppointment = () => {
  const [appointment, setAppointment] = useState([]);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const { data, error } = await supabase
      .from("appointments")
      .select("*");

    if (error) {
      console.error("Error fetching reports:", error);
      return;
    }

    setAppointment(data || []);
  }

  // Define table columns
  const columns = [
    { title: "Appointment ID", data: "appointmentId" },
    { title: "Time Submitted", data: "created_at" },
    { title: "Full Name", data: "fullName" },
    { title: "Purpose", data: "purpose" },
    { title: "Date", data: "date" },
    { title: "Time", data: "time" }, // Fixed from item.date to item.time
    { title: "Specific Reason", data: "reason" },
  ];

  return (
    <div className="container p-4">
      <DataTable
        data={appointment}
        columns={columns}
        className="display admin-table"
        options={{
          responsive: true,
          pageLength: 10,
          order: [[1, 'desc']], // Sort by "Time Submitted" by default
        }}
      >
        <thead>
          <tr>
            <th>Appointment ID</th>
            <th>Time Submitted</th>
            <th>Full Name</th>
            <th>Purpose</th>
            <th>Date</th>
            <th>Time</th>
            <th>Specific Reason</th>
          </tr>
        </thead>
      </DataTable>
    </div>
  );
};

export default TrackAppointment;