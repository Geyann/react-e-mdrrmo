import { useEffect, useState } from "react";
import { supabase } from "../createClient";

const incidentReported = () => {
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
    console.log(data);
  }

  return (
    <>
      <table className="admin-table">
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

        <tbody>
          {report.map((item) => (
            <tr key={item.reportIncidentId}>
              <td>{item.reportIncidentId}</td>
              <td>{item.patientName}</td>
              <td>{item.address}</td>
              <td>{item.landMark}</td>
              <td>{item.reporterContact}</td>
              <td>{item.date}</td>
              <td>{item.time}</td>
              <td>{item.incidentType}</td>
              <td>{item.priorityLevel}</td>
              <td>{item.pictureOfIncident}</td>
              <td>{item.specialNeeds}</td>
              <td>{item.requiredTools}</td>
              <td>{item.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default incidentReported;