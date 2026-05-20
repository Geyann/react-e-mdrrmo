import { useState, useEffect } from "react";
import { supabase } from "../createClient";

const AdminApproval = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null); // For detailed modal view

  // Fetch pending or all hazard reports from Supabase
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    // Assumes your table has a status column. Defaulting to retrieve all rows ordered by newest.
    const { data, error } = await supabase
      .from("hazard_reports")
      .select("*")
      .order("date_observed", { ascending: false });

    if (error) {
      console.error("Error fetching data:", error);
      alert(`Error fetching reports: ${error.message}`);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  // Quick Action Handler to update status (e.g., 'Approved', 'Rejected')
  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from("hazard_reports")
      .update({ status: newStatus }) // Requires an added 'status' text column in your table structure
      .eq("id", id); // Assumes 'id' is your primary key

    if (error) {
      alert(`Update Failed: ${error.message}`);
    } else {
      alert(`Report marked as ${newStatus}`);
      if (selectedReport?.id === id) setSelectedReport(null);
      fetchReports();
    }
  };

  // Priority badge color mapper
  const getPriorityStyle = (level) => {
    switch (level) {
      case "Critical": return { backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: "bold" };
      case "High": return { backgroundColor: "#ffedd5", color: "#c2410c", fontWeight: "bold" };
      case "Medium": return { backgroundColor: "#fef9c3", color: "#854d0e" };
      default: return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Hazard Reports Approval Dashboard</h2>
       
      </div>
 <button onClick={fetchReports} style={{ padding: "8px 16px",marginLeft:'700px', cursor: "pointer", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px" }}>
          Refresh Data
        </button>
        <br /><br />
      {loading ? (
        <p>Loading hazard incident reports...</p>
      ) : reports.length === 0 ? (
        <p>No hazard reports found in database.</p>
      ) : (
        <div style={{ overflowX: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", borderRadius: "8px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px" }}>Reporter Details</th>
                <th style={{ padding: "12px 16px" }}>Location & Landmark</th>
                <th style={{ padding: "12px 16px" }}>Date / Time</th>
                <th style={{ padding: "12px 16px" }}>Category</th>
                <th style={{ padding: "12px 16px" }}>Priority</th>
                <th style={{ padding: "12px 16px" }}>Files</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => (
                <tr key={report.id || idx} style={{ borderBottom: "1px solid #e2e8f0", hover: { backgroundColor: "#f1f5f9" } }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: "600" }}>{report.reporter_name || "Anonymous"}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{report.department || "No Department"}</div>
                  </td>
                  <td style={{ padding: "12px 16px", maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div>{report.address}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>📌 {report.landmark}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div>{report.date_observed}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{report.time_observed}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>{report.hazard_category}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", ...getPriorityStyle(report.risk_level) }}>
                      {report.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    📁 {report.hazard_photos ? report.hazard_photos.length : 0} item(s)
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button 
                      onClick={() => setSelectedReport(report)}
                      style={{ padding: "6px 12px", marginRight: "6px", backgroundColor: "#0f172a", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAILED INSPECTION MODAL PANEL */}
      {selectedReport && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "12px", maxWidth: "650px", width: "90%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin:'0'}}>Reviewing Hazard Incident Report</h3>
              <button onClick={() => setSelectedReport(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px", marginBottom: "20px" }}>
              <div><strong>Reporter Name:</strong> {selectedReport.reporter_name || "Anonymous"}</div>
              <div><strong>Contact:</strong> {selectedReport.reporter_contact || "N/A"}</div>
              <div><strong>Department:</strong> {selectedReport.department || "N/A"}</div>
              <div><strong>Category / Risk:</strong> {selectedReport.hazard_category} ({selectedReport.risk_level})</div>
              <div style={{ gridColumn: "span 2" }}><strong>Address Location:</strong> {selectedReport.address}</div>
              <div style={{ gridColumn: "span 2" }}><strong>Exact Landmark:</strong> {selectedReport.landmark}</div>
              <div><strong>Date Logged:</strong> {selectedReport.date_observed}</div>
              <div><strong>Time Logged:</strong> {selectedReport.time_observed}</div>
              <div><strong>Latitude:</strong> {selectedReport.latitude || "N/A"}</div>
              <div><strong>Longitude:</strong> {selectedReport.longitude || "N/A"}</div>
            </div>

            <div style={{ marginBottom: "15px", fontSize: "14px" }}>
              <strong>Hazard Description:</strong>
              <p style={{ margin: "5px 0", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", borderLeft: "4px solid #cbd5e1" }}>
                {selectedReport.hazard_description}
              </p>
            </div>

            {selectedReport.recommended_action && (
              <div style={{ marginBottom: "15px", fontSize: "14px" }}>
                <strong>Reporter Recommendation:</strong>
                <p style={{ margin: "5px 0", padding: "10px", backgroundColor: "#f0fdf4", borderRadius: "6px", borderLeft: "4px solid #86efac" }}>
                  {selectedReport.recommended_action}
                </p>
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <strong>Submitted Photo Proofs ({selectedReport.hazard_photos?.length || 0}):</strong>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
                {selectedReport.hazard_photos?.map((imgName, index) => (
                  <div key={index} style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: "4px", fontSize: "12px", border: "1px dashed #cbd5e1" }}>
                    📄 {imgName}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                *Verify files inside your dedicated Supabase Storage bucket linked with these string references.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "15px" }}>
              <button 
                onClick={() => handleUpdateStatus(selectedReport.id, "Rejected")}
                style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Reject / Dismiss
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedReport.id, "Approved")}
                style={{ padding: "8px 16px", backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Approve & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApproval;