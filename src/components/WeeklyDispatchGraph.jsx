import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeeklyDispatchGraph = ({ data = [] }) => { // Default to empty array
  
  const processData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekMap = days.map(day => ({ name: day, count: 0 }));

    // SAFETY CHECK: Prevents crash if data is null/undefined
    if (!data || !Array.isArray(data)) return weekMap;

    data.forEach(item => {
      if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d)) {
          const dayName = days[d.getDay()];
          const dayObj = weekMap.find(dw => dw.name === dayName);
          if (dayObj) dayObj.count++;
        }
      }
    });
    return weekMap;
  };

  const chartData = processData();

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <h3 className="font-black text-gray-800 mb-4 uppercase text-sm tracking-widest">Weekly Activity</h3>
      {/* WRAPPER DIV WITH FIXED HEIGHT FIXES "height should be > 0" ERROR */}
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{borderRadius: '10px', border: 'none'}} />
            <Bar dataKey="count" fill="#10b981" radius={[5, 5, 0, 0]} barSize={40} />
            <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={3} dot={{r: 4}} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyDispatchGraph;