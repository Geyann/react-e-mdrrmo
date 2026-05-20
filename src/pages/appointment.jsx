import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../createClient';
import reportImg from "../Images/photo-icon.png";

const HazardReport = () => {
  const [report, setReport] = useState({
    reporterName: "",
    department: "",
    address: "",
    landMark: "",
    reporterContact: "",
    dateObserved: "",
    timeObserved: "",
    hazardCategory: "",
    riskLevel: "",
    hazardPhotos: [], // Array for multiple pictures
    hazardDescription: "",
    recommendedAction: "",
    latitude: null,    // GPS
    longitude: null,   // GPS
  });

  const [geoError, setGeoError] = useState(null);

  // Automatically track GPS location on initialization
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setReport((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.error("Error fetching GPS location:", error);
          setGeoError("GPS location unavailable.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoError("Geolocation not supported.");
    }
  }, []);

  function handleChange(event) {
    const { name, value, type, files } = event.target;

    if (type === "file") {
      // Accept up to 4 files maximum
      const selectedFiles = Array.from(files).slice(0, 4);
      setReport((prevFormData) => ({
        ...prevFormData,
        hazardPhotos: selectedFiles,
      }));
    } else {
      setReport((prevFormData) => ({
        ...prevFormData,
        [name]: value,
      }));
    }
  }

  async function createHazardReport(event) {
    event.preventDefault();

    // Restrict proof to 2-4 pictures
    if (report.hazardPhotos.length < 2) {
      alert("Please upload at least 2-4 proof pictures.");
      return;
    }

    try {
      const uploadedFilePaths = [];
      
      // Upload each file to the Supabase Storage Bucket
      for (const file of report.hazardPhotos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
        const filePath = `hazard-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("hazard-media") 
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        uploadedFilePaths.push(filePath);
      }

      // Insert record to DB table with 'pending' status for admin approval
      const { data, error } = await supabase
        .from("hazard_reports")
        .insert([
          {
            reporter_name: report.reporterName,
            department: report.department,
            address: report.address,
            landmark: report.landMark,
            reporter_contact: report.reporterContact,
            date_observed: report.dateObserved,
            time_observed: report.timeObserved,
            hazard_category: report.hazardCategory,
            risk_level: report.riskLevel,
            hazard_photos: uploadedFilePaths, // Stores array of file paths
            hazard_description: report.hazardDescription,
            recommended_action: report.recommendedAction,
            latitude: report.latitude,
            longitude: report.longitude,
            status: 'pending', // Awaiting admin intervention
          },
        ]);

      if (error) throw error;

      console.log("Hazard reported successfully:", data);
      alert("Hazard reported successfully! Pending Admin Approval.");

      // Clear form
      setReport({
        reporterName: "",
        department: "",
        address: "",
        landMark: "",
        reporterContact: "",
        dateObserved: "",
        timeObserved: "",
        hazardCategory: "",
        riskLevel: "",
        hazardPhotos: [],
        hazardDescription: "",
        recommendedAction: "",
        latitude: report.latitude,
        longitude: report.longitude,
      });

    } catch (err) {
      console.error("Insert error:", err);
      alert("Failed to submit report.");
    }
  }

  return (
    <main className="appointment-page">
      <form 
        id="appointment-form" 
        onSubmit={createHazardReport} 
        style={{
          backgroundColor: '#e5e7eb', 
          borderRadius: '40px', 
          padding: '50px 160px 20px 40px', 
          boxShadow: '0 5px 10px gray', 
          maxWidth: '600px', 
          margin: '40px auto'
        }}
      >
        <div className="appointment-form-card">
          <div className="icon-circle">
            <img 
              src="https://cdn-icons-png.flaticon.com/128/4151/4151111.png" 
              loading="lazy" 
              alt="Hazard Report" 
              title="Hazard Report" 
              width="64" 
              height="64" 
            />
          </div>
          <h2>Hazard & Risk Report</h2>
          <p className="subtitle">
            Please provide details below. All fields marked <span id="required">*</span> are required for immediate assessment.
          </p>

          <label>Reporter Name:</label>
          <input 
            id="appointment-input" 
            name="reporterName" 
            type="text" 
            placeholder="Enter your name" 
            value={report.reporterName}
            onChange={handleChange}
          />

          <label>Location / Address:<span id="required">*</span></label>
          <input 
            id="appointment-input" 
            name="address" 
            type="text" 
            placeholder="Enter physical address" 
            value={report.address}
            onChange={handleChange}
            required
          />

          <label>Landmark:<span id="required">*</span></label>
          <input 
            id="appointment-input" 
            name="landMark" 
            type="text" 
            placeholder="e.g., Near the main gate, 2nd floor lobby" 
            value={report.landMark}
            onChange={handleChange}
            required
          />

          <div className="appointmentt-row">
            <div>
              <label>Date Observed:<span id="required">*</span></label>
              <input 
                id="appointment-input" 
                name="dateObserved" 
                type="date" 
                value={report.dateObserved}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Time Observed:<span id="required">*</span></label>
              <input 
                id="appointment-input" 
                name="timeObserved" 
                type="time" 
                value={report.timeObserved}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="appointmentt-row">
            <div>
              <label>Hazard Category:<span id="required">*</span></label>
              <select
                id="appointment-input"
                name="hazardCategory"
                value={report.hazardCategory}
                onChange={handleChange}
                style={{ width: '100%', height: '42px', borderRadius: '5px', border: '1px solid #ccc', padding: '5px' }}
                required
              >
                <option value="">Select Category</option>
                <option value="Physical">Physical (Trip/Slip)</option>
                <option value="Chemical">Chemical/Biological</option>
                <option value="Electrical">Electrical</option>
                <option value="Natural Disaster">Natural Disaster</option>
                <option value="Procedural">Procedural/Safety Practice</option>
              </select>
            </div>

            <div>
              <label>Priority Level:<span id="required">*</span></label>
              <select
                id="appointment-input"
                name="riskLevel"
                value={report.riskLevel}
                onChange={handleChange}
                style={{ width: '100%', height: '42px', borderRadius: '5px', border: '1px solid #ccc', padding: '5px' }}
                required
              >
                <option value="">Assess Risk</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <label>Hazard Description:<span id="required">*</span></label>
          <textarea 
            placeholder="Describe the hazard and potential danger..." 
            name="hazardDescription"
            value={report.hazardDescription}
            onChange={handleChange}
            required
          ></textarea>

          {/* Picture Proof Upload Block matching your structure elements */}
          <label>Photo Evidence (Upload 2-4 pictures):<span id="required">*</span></label>
          <div className="upload-box" style={{ position: 'relative', border: '2px dashed #aaa', padding: '15px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', cursor: 'pointer', marginBottom: '15px' }}>
            <img src={reportImg} alt="photo-icon" style={{ marginRight: '8px', verticalAlign: 'middle' }} /> 
            <span style={{ fontSize: '14px', color: '#555' }}>
              {report.hazardPhotos.length > 0 
                ? `${report.hazardPhotos.length} files selected` 
                : "Attach Proof Images"}
            </span>
            <input
              type="file"
              name="hazardPhotos"
              accept="image/png, image/jpeg"
              multiple
              onChange={handleChange}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
          </div>
          
          {report.hazardPhotos.length > 0 && (
            <div style={{ fontSize: '12px', color: '#555', margin: '-10px 0 15px 5px' }}>
              Files: {report.hazardPhotos.map(f => f.name).join(', ')}
            </div>
          )}

          {/* Coordinates tracking feedback indicator */}
          <div style={{ fontSize: '13px', fontWeight: '500', margin: '5px 0 15px 5px' }}>
            {report.latitude && report.longitude ? (
              <span style={{ color: 'green' }}>✓ GPS Coordinates captured successfully.</span>
            ) : geoError ? (
              <span style={{ color: 'red' }}>⚠ Location Error: {geoError}</span>
            ) : (
              <span style={{ color: 'orange' }}>⌛ Fetching active device location...</span>
            )}
          </div>

          <div className="terms" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '15px' }}>
            <input type="checkbox" required style={{ marginTop: '4px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>
              I agree to the <Link to="#">Terms & Conditions</Link> and understand that my 
              current coordinates <b>({report.latitude || "0.00"}, {report.longitude || "0.00"})</b> will be cataloged to verify this report site.
            </p>
          </div>

          <button id="appointment-submit" type="submit">Submit Hazard Report</button>
        </div>
      </form>
    </main>
  );
};

export default HazardReport;
