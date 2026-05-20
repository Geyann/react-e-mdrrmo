import React, { useEffect, useState } from 'react';
import { supabase } from "../createClient";
import { Truck, Users, MapPinned, CalendarCheck } from 'lucide-react';

const BorrowStats = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBorrowStats = async () => {
      const { data: logs, error } = await supabase
        .from('borrow-vehicle')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching borrow stats:", error);
      } else {
        setData(logs);
      }
      setLoading(false);
    };

    fetchBorrowStats();
  }, []);

  if (loading) return <div className="p-6 text-gray-500 font-medium italic">Syncing fleet data...</div>;

  // --- Logic Mapped to your "borrow-vehicle" SQL Table ---
  
  // Total number of borrow transactions
  const totalDispatches = data.length;

  // Unique vehicles currently being tracked in the logs
  const uniqueVehicles = [...new Set(data.map(item => item.vehicle).filter(Boolean))].length;

  // Unique personnel who have requested vehicles
  const totalRequesters = [...new Set(data.map(item => item.requestedBy).filter(Boolean))].length;

  // Most recent destination from the logs
  const latestDestination = data[0]?.destination || 'N/A';

  const stats = [
    { 
      label: 'Total Dispatches', 
      value: totalDispatches, 
      icon: <Truck className="text-emerald-500" size={24} />, 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Vehicles Used', 
      value: uniqueVehicles, 
      icon: <CalendarCheck className="text-blue-500" size={24} />, 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Last Destination', 
      value: latestDestination, 
      icon: <MapPinned className="text-purple-500" size={24} />, 
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
          <div className="overflow-hidden">
            <p className="text-sm text-gray-500 font-medium truncate">{stat.label}</p>
            <h3 className="text-xl font-bold text-gray-800 truncate">
              {stat.value}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BorrowStats;