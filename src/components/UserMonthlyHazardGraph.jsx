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

const UserHazardMonthlyGraph = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHazardData();
  }, []);

  const fetchHazardData = async () => {
    try {
      // Pulls from 'hazard_reports' using 'date_observed' to match your form schema
      const { data: hazards, error } = await supabase
        .from("hazard_reports")
        .select("date_observed");

      if (error) throw error;

      processData(hazards);
    } catch (error) {
      console.error("Error fetching hazard metrics:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const processData = (hazards) => {
    // 1. Initialize an object for all 12 months
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    const countMap = months.reduce((acc, month) => {
      acc[month] = 0;
      return acc;
    }, {});

    // 2. Count hazards per month using the date_observed field
    hazards.forEach((item) => {
      if (item.date_observed) {
        const monthIndex = new Date(item.date_observed).getMonth();
        const monthName = months[monthIndex];
        countMap[monthName]++;
      }
    });

    // 3. Format data structure for Recharts rendering
    const chartData = months.map((month) => ({
      name: month,
      hazards: countMap[month],
    }));

    setData(chartData);
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading Hazard Analytics...</p>;

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
        Monthly Hazard & Risk Reports
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
            dataKey="hazards" 
            fill="#fa8c16" // Warning Amber Orange tint matching risk monitoring standards
            radius={[4, 4, 0, 0]} 
            name="Total Tracked Hazards"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserHazardMonthlyGraph;