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

const AdminBorrowAnalytics = () => {
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchBorrowData = async () => {
    // 1. Build query with conditional filters
    let query = supabase
      .from("borrow-vehicle")
      .select("date, vehicle");

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching borrow data:", error);
      return;
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // 2. Identify unique vehicle types
    const uniqueVehicles = [...new Set(data.map(item => item.vehicle).filter(Boolean))];

    // 3. Initialize monthly structure
    const formattedData = months.map(month => {
      const entry = { name: month };
      uniqueVehicles.forEach(v => { entry[v] = 0; });
      return entry;
    });

    // 4. Grouping logic
    data.forEach(log => {
      if (log.date) {
        const dateObj = new Date(log.date);
        const monthIndex = dateObj.getMonth();
        const vehicleName = log.vehicle;

        if (formattedData[monthIndex] && vehicleName) {
          formattedData[monthIndex][vehicleName] += 1;
        }
      }
    });

    setChartData(formattedData);
  };

  useEffect(() => {
    fetchBorrowData();
  }, [startDate, endDate]); // Refetch whenever date range changes

  const vehicleColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div style={{ padding: "30px", borderRadius: "15px", color: "#333" }}>
      
      {/* Filter Header Section */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "20px"
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Fleet Utilization Trends</h2>
          <p style={{ color: "#666", fontSize: "14px", margin: "5px 0 0 0" }}>
            Monthly dispatch volume by vehicle type
          </p>
        </div>

        {/* Date Filter Inputs */}
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "5px", color: "#666" }}>Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "5px", color: "#666" }}>End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
            />
          </div>
          <button 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            style={{ 
              alignSelf: "flex-end", 
              padding: "8px 12px", 
              borderRadius: "8px", 
              background: "#f0f0f0", 
              border: "none", 
              cursor: "pointer", 
              fontSize: "12px", 
              fontWeight: "600",
              color: "#333"
            }}
          >
            Reset
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
              contentStyle={{ backgroundColor: "#333", border: "none", borderRadius: "8px", color: "#fff" }}
              itemStyle={{ fontSize: "12px" }}
              cursor={{ fill: '#f5f5f5' }}
            />
            <Legend iconType="circle" />
            
            {chartData.length > 0 && Object.keys(chartData[0])
              .filter(key => key !== "name")
              .map((vehicle, index) => (
                <Bar 
                  key={vehicle}
                  dataKey={vehicle} 
                  stackId="a" 
                  fill={vehicleColors[index % vehicleColors.length]} 
                  radius={index === Object.keys(chartData[0]).length - 2 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminBorrowAnalytics;