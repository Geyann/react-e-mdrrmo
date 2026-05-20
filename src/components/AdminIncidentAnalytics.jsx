import React, { useEffect, useState } from "react";
import { supabase } from "../createClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const AdminIncidentAnalytics = () => {
  const [chartData, setChartData] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAdminData = async () => {
    let query = supabase
      .from("reportIncident")
      .select("date, incidentType");

    // Apply Supabase-side filtering if dates are selected
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error("Error:", error);
      return;
    }

    const uniqueTypes = [...new Set(data.map(item => item.incidentType).filter(Boolean))];
    setIncidentTypes(uniqueTypes);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const formattedData = months.map(month => {
      const entry = { name: month };
      uniqueTypes.forEach(type => { entry[type] = 0; });
      return entry;
    });

    data.forEach(incident => {
      if (incident.date) {
        const dateObj = new Date(incident.date);
        const monthIndex = dateObj.getMonth();
        const type = incident.incidentType;
        
        if (formattedData[monthIndex] && type) {
          formattedData[monthIndex][type] += 1;
        }
      }
    });

    setChartData(formattedData);
  };

  useEffect(() => {
    fetchAdminData();
  }, [startDate, endDate]); // Refresh data whenever dates change

  const typeColors = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div style={{ padding: "30px", borderRadius: "15px", color: "#000000" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "20px"
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Incident Type Distribution</h2>
          <p style={{ color: "#666", fontSize: "14px", margin: "5px 0 0 0" }}>
            Monthly breakdown of incident categories
          </p>
        </div>

        {/* Date Filter Inputs */}
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "5px" }}>From</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "5px" }}>To</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
            />
          </div>
          <button 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            style={{ alignSelf: "flex-end", padding: "8px 12px", borderRadius: "8px", background: "#f0f0f0", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis dataKey="name" stroke="#000000" tick={{fontSize: 12, fontWeight: 600}} />
            <YAxis stroke="#000000" tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#000000", border: "none", borderRadius: "8px", color: "#fff" }}
              itemStyle={{ fontSize: "12px" }}
            />
            <Legend iconType="circle" />
            {incidentTypes.map((type, index) => (
              <Bar 
                key={type}
                dataKey={type} 
                stackId="a" 
                fill={typeColors[index % typeColors.length]} 
                radius={index === incidentTypes.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminIncidentAnalytics;