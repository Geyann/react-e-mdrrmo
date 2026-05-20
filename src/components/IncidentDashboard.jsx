import React, { useEffect, useState } from 'react';
import { supabase } from "../createClient";
// ADDED MISSING CLOCK IMPORT
import { Shield, MapPin, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const IncidentDashboard = () => {
  const [allData, setAllData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reportIncident')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllData(data);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formatted = months.map(m => ({ name: m, count: 0 }));
      data.forEach(item => {
        const mIdx = new Date(item.date).getMonth();
        if (formatted[mIdx]) formatted[mIdx].count++;
      });
      setChartData(formatted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-10 font-mono text-blue-600">LOADING_SYSTEM...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black">MDRRMO INCIDENTS</h1>
        <button onClick={fetchData} className="p-2 bg-white rounded-full shadow-sm"><RefreshCw size={20}/></button>
      </div>

      {/* GRAPH CONTAINER WITH FIXED HEIGHT TO FIX CONSOLE WARNINGS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
            <tr>
              <th className="p-4">Incident</th>
              <th className="p-4">Location</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody>
            {allData.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50">
                <td className="p-4 font-bold">{item.incidentType}</td>
                <td className="p-4 text-gray-500">{item.address}</td>
                <td className="p-4 text-sm text-gray-400 flex items-center gap-1">
                  <Clock size={14} /> {item.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentDashboard;