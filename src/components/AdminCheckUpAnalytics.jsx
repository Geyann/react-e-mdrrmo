import React, { useEffect, useState } from "react";
import { supabase } from "../createClient";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const AdminCheckUpAnalytics = () => {
  const [typeData, setTypeData] = useState([]);
  const [mobilityData, setMobilityData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAnalytics = async () => {
    let query = supabase.from("outPatientCheckUp").select("patientFor, mobility, preferredDate");

    if (startDate) query = query.gte("preferredDate", startDate);
    if (endDate) query = query.lte("preferredDate", endDate);

    const { data, error } = await query;

    if (error || !data) return;

    // Process "Patient For" Distribution (Pie Chart)
    const typeCounts = data.reduce((acc, curr) => {
      const type = curr.patientFor || "Other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    setTypeData(Object.keys(typeCounts).map(name => ({ name, value: typeCounts[name] })));

    // Process Mobility Requirements (Bar Chart)
    const mobilityCounts = data.reduce((acc, curr) => {
      const mode = curr.mobility || "Not Specified";
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    setMobilityData(Object.keys(mobilityCounts).map(name => ({ name, count: mobilityCounts[name] })));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div style={{ padding: "60px", backgroundColor: "#e5e7eb", borderRadius: "25px", border: "1px solid #f1f5f9" }}>
      
      {/* Filters Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "900" }}>MEDICAL SERVICE ANALYTICS</h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Logistics and Mobility Overview</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* Service Type Distribution (Pie Chart) */}
        <div style={{ height: "350px", textAlign: "center" }}>
          <h4 style={{ fontSize: "12px", color: "#000000", marginBottom: "20px" }}>SERVICE TYPE</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Mobility Mode Counts (Bar Chart) */}
        <div style={{ height: "350px", textAlign: "center" }}>
          <h4 style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>MOBILITY REQUIREMENTS</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mobilityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default AdminCheckUpAnalytics;