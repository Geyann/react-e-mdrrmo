import React from 'react'
import { useState, useEffect } from 'react';
import { supabase } from '../createClient';

const viewCheckUp = () => {
     const [checkUp, setCheckUp] = useState([]);
        
        useEffect(() => {
            fetchUser();
          }, []);
        
          async function fetchUser() {
            const { data, error } = await supabase
              .from("outPatientCheckUp")
              .select("*");
        
            if (error) {
              console.error("Error fetching reports:", error);
              return;
            }
        
            setCheckUp(data || []);
            console.log(data);
          }
  return (
    <div className="admin-container">
        <table className="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Date & Time Created</th>
                    <th>Patient Name</th>
                    <th>Location</th>
                    <th>Hospital Name</th>
                    <th>Contact Details</th>
                    <th>Preferred Date</th>
                    <th>Preferred Time</th>
                    <th>Mobility</th>
                    <th>Patient for</th>
                    <th>Escort</th>
                </tr>
            </thead>
            <tbody>
                {checkUp.map((item)=>(
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.created_at}</td>
                        <td>{item.patientName}</td>
                        <td>{item.location}</td>
                        <td>{item.hospitalName}</td>
                        <td>{item.contactDetails}</td>
                        <td>{item.preferredDate}</td>
                        <td>{item.preferredTime}</td>
                        <td>{item.mobility}</td>
                        <td>{item.patientFor}</td>
                        <td>{item.escort}</td>


                </tr>
                ))}
                
            </tbody>
        </table>
    </div>
  )
}

export default viewCheckUp