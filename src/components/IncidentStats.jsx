import React, { useEffect, useState } from 'react';
import { supabase } from "../createClient";
import { AlertTriangle, Clock, Flame, ShieldAlert } from 'lucide-react';

const IncidentStats = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: reports, error } = await supabase
        .from('reportIncident')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching stats:", error);
      } else {
        setData(reports);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Updating statistics...</div>;

  // --- Logic Mapped to Your SQL Table ---
  const totalIncidents = data.length;

  // Corrected: Uses 'priorityLevel' and checks for 'High' or 'Critical'
  const highPriority = data.filter(item => 
    item.priorityLevel === 'High' || item.priorityLevel === 'Critical'
  ).length;

  // Corrected: Uses 'incidentType'
  const uniqueIncidentTypes = [...new Set(data.map(item => item.incidentType).filter(Boolean))].length;

  // Uses the most recent 'date' from the ordered query
  const recentReport = data[0]?.date || 'N/A';

  const stats = [
    { 
      label: 'Total Reports', 
      value: totalIncidents, 
      icon: <Clock className="text-blue-500" size={24} />, 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Urgent/High', 
      value: highPriority, 
      icon: <AlertTriangle className="text-red-500" size={24} />, 
      bg: 'bg-red-50' 
    },
    { 
      label: 'Incident Types', 
      value: uniqueIncidentTypes, 
      icon: <Flame className="text-orange-500" size={24} />, 
      bg: 'bg-orange-50' 
    },
    { 
      label: 'Latest Incident', 
      value: recentReport, 
      icon: <ShieldAlert className="text-purple-500" size={24} />, 
      bg: 'bg-purple-50' 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${stat.bg}`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncidentStats;