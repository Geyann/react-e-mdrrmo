import React, { useState, useEffect } from 'react'
import { supabase } from '../createClient';

const borrowedVehicles = () => {
    const [borrow, setBorrow] = useState([]);
    
    useEffect(() => {
        fetchUser();
      }, []);
    
      async function fetchUser() {
        const { data, error } = await supabase
          .from("borrow-vehicle")
          .select("*");
    
        if (error) {
          console.error("Error fetching reports:", error);
          return;
        }
    
        setBorrow(data || []);
        console.log(data);
      }
    
  return (
    <div>
        
            <table className='admin-table'>
                <thead>
                    <tr>
                        <th>Time Submitted</th>
                        <th>Borrow ID</th>
                        <th>Dispatch No.</th>
                        <th>Departure</th>
                        <th>Arrival</th>
                        <th>Contact No.</th>
                        <th>Vehicle Borrowed</th>
                        <th>Requested By</th>
                        <th>Purpose</th>
                        <th>Destination</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        {borrow.map((item) => (
            <tr key={item.borrowerId}>
                <td>{item.created_at}</td>
                <td>{item.borrowerId}</td>
                <td>{item.dispatchNum}</td>
                <td>{item.departure}</td>
                <td>{item.arrival}</td>
                <td>{item.contactNum}</td>
                <td>{item.vehicle}</td>
                <td>{item.requestedBy}</td>
                <td>{item.purpose}</td>
                <td>{item.destination}</td>
                <td>{item.date}</td>
                <td>{item.time}</td>
                <td id='action'><button id='approve' type="button" >Approved</button> <button type='button' id='decline'>Decline</button></td>
            </tr>
        ))}
        </tbody>
</table>
    </div>
  )
}

export default borrowedVehicles