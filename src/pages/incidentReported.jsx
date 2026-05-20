import { useEffect, useState } from "react";
import { supabase } from "../createClient";

// Import DataTables
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

// Initialize DataTables
DataTable.use(DT);

const IncidentReported = () => {
  const [report, setReport] = useState([]);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const { data, error } = await supabase
      .from("reportIncident")
      .select("*");

    if (error) {
      console.error("Error fetching reports:", error);
      return;
    }

    setReport(data || []);
  }

  // Define columns based on your table headers
  const columns = [
    { title: "Report ID", data: "reportIncidentId" },
    { title: "Patient Name", data: "patientName" },
    { title: "Address / Location", data: "address" },
    { title: "Landmark", data: "landMark" },
    { title: "Reporter Contact Info", data: "reporterContact" },
    { title: "Date", data: "date" },
    { title: "Time", data: "time" },
    { title: "Incident Type", data: "incidentType" },
    { title: "Priority Level", data: "priorityLevel" },
    { 
        title: "Picture Of Incident", 
        data: "pictureOfIncident",
        render: (data) => data ? `<img src="${data}" width="50" alt="Incident"/>` : 'No Image'
    },
    { title: "Special Needs Of Patient", data: "specialNeeds" },
    { title: "Required Tools", data: "requiredTools" },
    { title: "Reporter UserID", data: "userId" },
  ];

  return (
    <div className="admin-container">
      <h1>Reported Incidents</h1>
      
      <DataTable
        data={report}
        columns={columns}
        className="display admin-table"
        options={{
          responsive: true,
          pageLength: 10,
          order: [[0, 'desc']], // Sort by Report ID descending by default
        }}
      >
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Patient Name</th>
            <th>Address / Location</th>
            <th>Landmark</th>
            <th>Reporter Contact Info</th>
            <th>Date</th>
            <th>Time</th>
            <th>Incident Type</th>
            <th>Priority Level</th>
            <th>Picture Of Incident</th>
            <th>Special Needs Of Patient</th>
            <th>Required Tools</th>
            <th>Reporter UserID</th>
          </tr>
        </thead>
      </DataTable>
    </div>
  );
};

export default IncidentReported;