import React from 'react'
import { useState, useEffect} from 'react';
import { supabase } from '../createClient';

const trackAppointment = () => {
     const [appointment, setAppointment] = useState([]);
        
        useEffect(() => {
            fetchUser();
          }, []);
        
          async function fetchUser() {
            const { data, error } = await supabase
              .from("appointments")
              .select("*");
        
            if (error) {
              console.error("Error fetching reports:", error);
              return;
            }
        
            setAppointment(data || []);
            console.log(data);
          }
  return (
    <div>
        <table className="admin-table">
            <thead>
               <tr>
                <th>Appointment ID</th>
                <th>Time Submitted</th>
                <th>Full Name</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Time</th>
                <th>Specific Reason</th>
               </tr>
            </thead>
            <tbody>
                {appointment.map((item) => (
                <tr key={item.appointmentId}>
                   <td>{item.appointmentId}</td>
                   <td>{item.created_at}</td>
                   <td>{item.fullName}</td>
                   <td>{item.purpose}</td>
                   <td>{item.date}</td>
                   <td>{item.date}</td>
                   <td>{item.reason}</td>
                </tr>   ))}
            </tbody>
        </table>

    </div>
  )
}

export default trackAppointment