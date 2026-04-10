import React, { useState } from 'react';
import { supabase } from '../createClient';

const CheckUp = () => {
    const [checkUp, setCheckUp] = useState({
        patientName: "",
        location: "",
        hospitalName: "",
        contactDetails: "",
        preferredDate: "",
        preferredTime: "",
        mobility: "",
        patientFor: "",
        specificVehicle: "",
        escort: "",
    });

    function submitCheckUp(event) {
        setCheckUp((prevFormData) => ({
            ...prevFormData, [event.target.name]: event.target.value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        
        // If "other" is picked, we send the text from 'specificVehicle' to the 'escort' column
        const finalEscort = checkUp.escort === "other" ? checkUp.specificVehicle : checkUp.escort;

        const { data, error } = await supabase
            .from("outPatientCheckUp")
            .insert([{
                patientName: checkUp.patientName,
                location: checkUp.location,
                hospitalName: checkUp.hospitalName,
                contactDetails: checkUp.contactDetails,
                preferredDate: checkUp.preferredDate,
                preferredTime: checkUp.preferredTime,
                mobility: checkUp.mobility,
                patientFor: checkUp.patientFor,
                escort: finalEscort 
            }]);

        if (error) {
            console.error("Error:", error);
        } else {
            alert("Submitted!");
            setCheckUp({
                patientName: "", location: "", hospitalName: "", contactDetails: "",
                preferredDate: "", preferredTime: "", mobility: "", patientFor: "",
                specificVehicle: "", escort: ""
            });
        }
    }

    return (
        <div> 
            <main className="checkup-container">
                <section className="form-header">
                    <div className="plus-icon">+</div>
                    <h1 id='checkup'>Out Patient Check Up</h1>
                    <p id='checkup'>Please provide details below. All fields marked <span className="required">*</span> are required for immediate assessment.</p>
                </section>

                <form className="assessment-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Patient Name:<span className="required">*</span></label>
                        <input type="text" name='patientName' value={checkUp.patientName} onChange={submitCheckUp} required />
                    </div>

                    <div className="input-group">
                        <label>Location / Address:<span className="required">*</span></label>
                        <input type="text" name='location' value={checkUp.location} onChange={submitCheckUp} required />
                    </div>

                    <div className="input-group">
                        <label>Hospital Name:<span className="required">*</span></label>
                        <input type="text" name='hospitalName' value={checkUp.hospitalName} onChange={submitCheckUp} required />
                    </div>

                    <div className="input-group">
                        <label>Contact Details of Person Reporting:<span className="required">*</span></label>
                        <input type="text" name='contactDetails' value={checkUp.contactDetails} onChange={submitCheckUp} required />
                    </div>

                    <div className="input-group">
                        <div className="checkup-row">
                            <div>
                                <label>Preferred Date:<span>*</span></label>
                                <input id='date' name='preferredDate' value={checkUp.preferredDate} type="date" onChange={submitCheckUp}/>
                            </div>
                            <div>
                                <label>Preferred Time:<span>*</span></label>
                                <input id='time' name='preferredTime' value={checkUp.preferredTime} type="time" onChange={submitCheckUp}/>
                            </div>
                        </div>
                    </div>

                    {/* Mobility Section */}
                    <div className="checkbox-row">
                        <label id='borrow-label'>Mobility: <span className="required">*</span></label>
                        <select id='borrow-select' name='mobility' value={checkUp.mobility} onChange={submitCheckUp}>
                            <option value="">Select an Option</option>
                            <option value="stretcher">Stretcher</option>
                            <option value="wheel-chair">Wheel Chair</option>
                            <option value="walker">Walker</option>
                        </select>
                    </div>

                    {/* Patient For Section */}
                    <div className="checkbox-row">
                        <label id='borrow-label'>Patient for: <span className="required">*</span></label>
                        <select id='borrow-select' name='patientFor' value={checkUp.patientFor} onChange={submitCheckUp}>
                            <option value="">Select an Option</option>
                            <option value="Admission">Admission</option>
                            <option value="Discharge">Discharge</option>
                            <option value="Check Up">Check Up</option>
                        </select>
                    </div>

                    {/* Vehicle Selection Section */}
                    <div className="checkbox-row">
                        <label id='borrow-label'>Vehicle to be used: <span className="required">*</span></label>
                        <select 
                            id='borrow-select'
                            name='escort'
                            value={checkUp.escort}
                            onChange={submitCheckUp}
                        >
                            <option value="">Select an Option</option>
                            <option value="ambulance">Medical</option>
                            <option value="rescue-truck">Family</option>
                            <option value="other">Other</option>
                        </select>
                        
                        {/* Matching your original structure for the conditional input */}
                        {checkUp.escort === "other" && (
                            <label>If Specific: 
                                <input 
                                    type="text" 
                                    id='specific' 
                                    name="specificVehicle"
                                    value={checkUp.specificVehicle} 
                                    onChange={submitCheckUp} 
                                />
                            </label>
                        )}
                    </div>

                    <button type="submit" className="submit-btn">Submit Incident Report</button>
                </form>
            </main>
        </div>
    );
}

export default CheckUp;