import React from 'react'
import { useState} from 'react';
import { supabase } from '../createClient';

const Borrow = () => {
   
    const [borrow, setBorrow] = useState({
        dispatchNum: "",
        departure: "",
        arrival: "",
        contactNum: "",
        vehicle: "",
        requestedBy: "",
        purpose: "",
        destination: "",
        date: "",
        time: "",
    });
    console.log(borrow)

    function handleChange(event) {

        setBorrow((prevFormData) => ({
            ...prevFormData, [event.target.name]:event.target.value
        }));
    }

    async function submitRequest(event) {
        event.preventDefault();

        const { data, error } = await supabase
            .from("borrow-vehicle")
            .insert([
                {
                    dispatchNum: borrow.dispatchNum,
                    departure: borrow.departure,
                    arrival: borrow.arrival,
                    contactNum: borrow.contactNum,
                    vehicle: borrow.vehicle,
                    requestedBy: borrow.requestedBy,
                    purpose: borrow.purpose,
                    destination: borrow.destination,
                    date: borrow.date,
                    time: borrow.time,
                },
            ]);

        if (error) {
            console.error("Insert error:", error);
            return;
        }

        console.log("Inserted successfully:", data);

        setBorrow({
            dispatchNum: "",
            departure: "",
            arrival: "",
            contactNum: "",
            vehicle: "",
            requestedBy: "",
            purpose: "",
            destination: "",
            date: "",
            time: "",
        });
    }
    return (
    
    <main className="borrow-container">
        <div className="borrow-form-card">
            <div className="borrow-form-header">
                <div className="borrow-vehicle-icon">🚗</div>
                <h1 id='borrow-h1'> Emergency Response Vehicle Dispatch</h1>
                <p id='borrow-p'>Please provide details below. All fields marked <span className="required">*</span> are required for immediate assessment.</p>
            </div>

            <form onSubmit={submitRequest}>
                <h3 className="borrow-section-title">Kilometer Reading <span className="required">*</span></h3>

                <div className="borrow-form-grid">
                    <div className="borrow-form-group">
                        <label  id='borrow-label'>Departure: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='departure' type="text"
                            placeholder='Enter Deptarture' 
                            onChange={handleChange}
                            />
                    </div>
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Date: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='date'
                            type="date"
                            onChange={handleChange}
                           />
                    </div>
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Arrival: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='arrival'
                            type="text"
                            placeholder='Enter Arrival'
                            onChange={handleChange}
                           />
                    </div>
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Time: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='time'
                            type="time"
                           onChange={handleChange}
                           />
                    </div>
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Contact no: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='contactNum'
                            type="number"
                            placeholder='Enter Contact No.'
                             onChange={handleChange}
                             />
                    </div>
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Dispatch No: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='dispatchNum'
                            type="text"
                            placeholder='Enter Dispatch No.'
                            onChange={handleChange}
                             />
                    </div>
                </div>

                <div className="full-width-fields">
                    <div className="borrow-form-group">
                        <label id='borrow-label'>Vehicle to be used: <span className="required">*</span></label>
                        <select 
                        id='borrow-select'
                        name='vehicle'
                        onChange={handleChange}
                        >
                            <option value="">Select an Option</option>
                            <option value="ambulance">Ambulance</option>
                            <option value="rescue-truck">Rescue Truck</option>
                            <option value="utility-van">Utility Van</option>
                        </select>
                    </div>

                    <div className="borrow-form-group">
                        <label id='borrow-label'>Requested By: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='requestedBy'
                            type="text"
                            onChange={handleChange}
                            />
                    </div>

                    <div className="borrow-form-group">
                        <label id='borrow-label'>Purpose: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='purpose'
                            type="text"
                            placeholder='Enter Purpose'
                            onChange={handleChange}/>
                    </div>

                    <div className="borrow-form-group">
                        <label id='borrow-label'>Destination: <span className="required">*</span></label>
                        <input id='borrow-input'
                            name='destination'
                            type="text"
                            placeholder='Enter Destination'
                            onChange={handleChange}/>
                    </div>
                </div>

                <div className="borrow-form-footer">
                    <button id='borrow-submit' type="submit" className="submit-btn">Submit ERVD</button>
                </div>
            </form>
        </div>
    </main>
    )
}

export default Borrow