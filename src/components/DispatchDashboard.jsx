import React, { useEffect, useState } from 'react';
import { supabase } from "../createClient";
import { 
  Truck, Navigation, Users, MapPinned, 
  RefreshCw, Clock, PhoneCall, Calendar
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const DispatchDashboard = () => {
  const [allData, setAllData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrow-vehicle')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setAllData(data);
      prepareWeeklyGraph(data);
    }
    setLoading(false);
  };

  const prepareWeeklyGraph = (dispatches) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Initialize current week
    const weekMap = days.map(day => ({ name: day, count: 0 }));

    dispatches.forEach(item => {
      if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          const dayName = days[d.getDay()];
          const dayObj = weekMap.find(dw => dw.name === dayName);
          if (dayObj) dayObj.count++;
        }
      }
    });
    setWeeklyData(weekMap);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-10 font-mono text-emerald-600">SYSTEM_SYNC_IN_PROGRESS...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">VEHICLE DISPATCH LOGS</h1>
          <p className="text-slate-500 font-medium">MDRRMO Fleet Management & Monitoring</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
          <RefreshCw size={18} /> Refresh Fleet
        </button>
      </div>

      {/* Weekly Detailed Graph */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Weekly Activity Overview</h3>
          <p className="text-sm text-slate-400">Dispatch frequency across the current week</p>
        </div>
        {/* Set a fixed height here to prevent the "Height should be > 0" error */}
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend verticalAlign="top" align="right" />
              <Bar name="Total Dispatches" dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              <Line name="Activity Trend" type="monotone" dataKey="count" stroke="#059669" strokeWidth={3} dot={{ r: 5, fill: '#059669' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-slate-800">Dispatch Masterlist</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4 text-center">Dispatch #</th>
                <th className="px-6 py-4">Vehicle & Personnel</th>
                <th className="px-6 py-4">Purpose / Destination</th>
                <th className="px-6 py-4">KM (Dep/Arr)</th>
                <th className="px-6 py-4">Date/Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allData.map((item) => (
                <tr key={item.borrowerId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600">#{item.dispatchNum || item.borrowerId}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.requestedBy}</div>
                    <div className="text-[10px] uppercase font-black text-slate-400">{item.vehicle}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-800">{item.purpose}</div>
                    <div className="text-xs text-slate-400 italic">{item.destination}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
                      {item.departure} → {item.arrival}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800"><Calendar size={12}/> {item.date}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1"><Clock size={10}/> {item.time}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispatchDashboard;