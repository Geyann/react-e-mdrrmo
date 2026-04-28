import React from 'react'
import { useState } from 'react';
import { supabase } from '../createClient';

const appointment = () => {
   const [appointment, setAppointment] = useState({
         fullName:"",
         purpose:"",
         date:"",
         time:"",
         reason:""

      });
      console.log(appointment)
  
      function handleChange(event) {
  
          setAppointment((prevFormData) => ({
              ...prevFormData, [event.target.name]:event.target.value
          }));
      }
  
      async function submitRequest(event) {
          event.preventDefault();
  
          const { data, error } = await supabase
              .from("appointments")
              .insert([
                  {
                     fullName:appointment.fullName,
                     purpose:appointment.purpose,
                     date: appointment.date,
                     time:appointment.time,
                     reason:appointment.reason
                  },
              ]);
  
          if (error) {
              console.error("Insert error:", error);
              return;
          }
  
          console.log("Inserted successfully:", data);
  
          setAppointment({
             
          });
      }
  return (
    <main className="appointment-page">
      <div className="form-card">

        <div className="icon-circle"><img src="https://cdn-icons-png.flaticon.com/128/7322/7322293.png" loading="lazy" alt="Appointment " title="Appointment " width="64" height="64" /></div>
        <h2>Book An Appointment</h2>
        <p className="subtitle">
          Please provide details below. All fields marked <span id='required'>*</span> are required for immediate assessment.
        </p>

        <form id='appointment-form' onSubmit={submitRequest}>
          <label>Full Name:<span id='required'>*</span></label>
          <input id='appointment-input' 
          name='fullName' 
          type="text" 
          placeholder="Enter full name" 
          onChange={handleChange}/>

          <label>Purpose:<span id='required'>*</span></label>
          <input id='appointment-input' 
          name='purpose' 
          type="text" 
          placeholder="Enter purpose" 
          onChange={handleChange}/>

          <div className="appointmentt-row">
            <div>
              <label>Preferred Date:<span id='required'>*</span></label>
              <input id='appointment-input' 
              name='date' 
              type="date" 
              onChange={handleChange}/>
            </div>

            <div>
              <label>Preferred Time:<span id='required'>*</span></label>
              <input id='appointment-input' 
              name='time' 
              type="time" 
              onChange={handleChange}/>
            </div>
          </div>

          <label>Specific Reason:<span id='required'>*</span></label>
          <textarea placeholder="Enter specific reason" 
          name='reason'
          onChange={handleChange}></textarea>

          <button id='appointment-submit' type="submit" >Submit ERVD</button>
        </form>

      </div>
    </main>
  )
}

export default appointment