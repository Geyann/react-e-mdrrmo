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
  Cell
} from "recharts";

const AdminAppointmentAnalytics = () => {
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAppointmentData = async () => {
    // 1. Build query with date range filters
    let query = supabase
      .from("appointments")
      .select("date, purpose");

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching appointment data:", error);
      return;
    }

    // 2. Process data to count occurrences of each 'purpose'
    const purposeCounts = data.reduce((acc, curr) => {
      const p = curr.purpose || "Unspecified";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    // 3. Format for Recharts
    const formattedData = Object.keys(purposeCounts).map(key => ({
      purpose: key.toUpperCase(),
      count: purposeCounts[key]
    })).sort((a, b) => b.count - a.count); // Show highest volume first

    setChartData(formattedData);
  };

  useEffect(() => {
    fetchAppointmentData();
  }, [startDate, endDate]);

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b"];

  return (
    <div style={{ 
      padding: "30px", 
      borderRadius: "25px", 
      backgroundColor: "#e5e7eb",
      border: "1px solid #f1f5f9",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
    }}>
      
      {/* Header & Filter Controls */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontWeight: "900" }}>APPOINTMENT VOLUME</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 0 0" }}>
            Analysis of booking purposes by date range
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }}
          />
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }}
          />
          <button 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            style={{ padding: "8px 15px", borderRadius: "10px", border: "none", backgroundColor: "#f1f5f9", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="purpose" 
              type="category" 
              stroke="#64748b" 
              fontSize={11} 
              fontWeight={700}
              width={100}
            />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Footer */}
      <div style={{ marginTop: "20px", display: "flex", gap: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
         <div>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold", uppercase: "true" }}>TOTAL REQUESTS</span>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#1e293b" }}>
              {chartData.reduce((a, b) => a + b.count, 0)}
            </div>
         </div>
         <div>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold", uppercase: "true" }}>TOP PURPOSE</span>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#6366f1" }}>
              {chartData[0]?.purpose || "N/A"}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminAppointmentAnalytics;