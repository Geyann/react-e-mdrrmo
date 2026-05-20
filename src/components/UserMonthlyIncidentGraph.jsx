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

const UserMonthlyIncidentGraph = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidentData();
  }, []);

  const fetchIncidentData = async () => {
    try {
      const { data: incidents, error } = await supabase
        .from("reportIncident")
        .select("date");

      if (error) throw error;

      processData(incidents);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const processData = (incidents) => {
    // 1. Initialize an object for all 12 months
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    const countMap = months.reduce((acc, month) => {
      acc[month] = 0;
      return acc;
    }, {});

    // 2. Count incidents per month
    incidents.forEach((item) => {
      if (item.date) {
        const monthIndex = new Date(item.date).getMonth();
        const monthName = months[monthIndex];
        countMap[monthName]++;
      }
    });

    // 3. Format for Recharts
    const chartData = months.map((month) => ({
      name: month,
      incidents: countMap[month],
    }));

    setData(chartData);
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading Chart...</p>;

  return (
    <div style={{ 
      width: "100%", 
      height: 400, 
      backgroundColor: "white", 
      padding: "20px", 
      borderRadius: "20px", 
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)" 
    }}>
      <h3 style={{ textAlign: "center", marginBottom: "20px", color: "#333" }}>
        Monthly Incident Reports
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip 
             cursor={{fill: '#f5f5f5'}} 
             contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}
          />
          <Legend />
          <Bar 
            dataKey="incidents" 
            fill="#ff4d4f" 
            radius={[4, 4, 0, 0]} 
            name="Total Incidents"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserMonthlyIncidentGraph;