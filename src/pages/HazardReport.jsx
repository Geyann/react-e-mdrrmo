import { Link } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState, useEffect } from "react";
import { supabase } from "../createClient";

const HazardReport = () => {
  // Explicit, descriptive naming convention for state management
  const [hazardReport, setHazardReport] = useState({
    reporterName: "",
    department: "",
    address: "",
    landMark: "",
    reporterContact: "",
    dateObserved: "",
    timeObserved: "",
    hazardCategory: "",
    riskLevel: "",
    hazardPhotos: [], // Holds file objects locally for UI validation
    hazardDescription: "",
    recommendedAction: "",
    latitude: null,    
    longitude: null,   
  });

  const [geoError, setGeoError] = useState(null);

  // Automatically fetch current GPS coordinates on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setHazardReport((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.error("Error fetching GPS location:", error);
          setGeoError("Unable to retrieve GPS location automatically.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoError("Geolocation is not supported by your browser.");
    }
  }, []);

  // Standard input changes processor
  function handleChange(event) {
    const { name, value, type, files } = event.target;

    if (type === "file") {
      // Convert FileList to Array and cap submission size between 2 and 4 files
      const selectedFiles = Array.from(files).slice(0, 4);
      setHazardReport((prevFormData) => ({
        ...prevFormData,
        hazardPhotos: selectedFiles,
      }));
    } else {
      setHazardReport((prevFormData) => ({
        ...prevFormData,
        [name]: value,
      }));
    }
  }

  // Database ingestion handler
  async function createHazardReport(event) {
    event.preventDefault();

    // Enforce matching minimum threshold criteria (2 images)
    if (hazardReport.hazardPhotos.length < 2) {
      alert("Please upload at least 2-4 proof pictures for verification.");
      return;
    }

    const uploadedImageNames = [];

    // 1. ITERATE & UPLOAD MULTIPLE IMAGES TO SUPABASE STORAGE BUCKET
    try {
      await Promise.all(
        hazardReport.hazardPhotos.map(async (file) => {
          // Create an entirely distinct hashed filename for each file to prevent overrides
          const fileExt = file.name.split(".").pop();
          const generatedName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

          const { data, error: uploadError } = await supabase.storage
            .from("hazard-photos") // ⚠️ Replace with your exact Supabase Storage bucket ID
            .upload(generatedName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Push the unique generated string key to save inside the text[] column array
          if (data) {
            uploadedImageNames.push(generatedName);
          }
        })
      );
    } catch (storageErr) {
      console.error("Storage Batch processing failure:", storageErr);
      alert(`Photo upload failed: ${storageErr.message || storageErr}`);
      return; // Stop form execution if any storage upload crashes
    }

    // 2. WRITE ARTIFACT DIRECTLY TO THE PUBLIC.HAZARD_REPORTS TABLE
    const { data, error } = await supabase
      .from("hazard_reports")
      .insert([
        {
          reporter_name: hazardReport.reporterName || null,
          reporter_contact: hazardReport.reporterContact || null,
          address: hazardReport.address,
          landmark: hazardReport.landMark, 
          date_observed: hazardReport.dateObserved,
          time_observed: hazardReport.timeObserved,
          hazard_category: hazardReport.hazardCategory,
          risk_level: hazardReport.riskLevel,
          hazard_description: hazardReport.hazardDescription,
          recommended_action: hazardReport.recommendedAction || null,
          hazard_photos: uploadedImageNames, // Storing array of file strings strings [ '123_a.png', '456_b.jpg' ]
          latitude: hazardReport.latitude,   
          longitude: hazardReport.longitude, 
          report_status: "pending" // Default to lowercase string enum target tracking
        },
      ]);

    if (error) {
      console.error("Insert error details:", error);
      alert(`Submission Failed: ${error.message} (Error Code: ${error.code})`);
      return;
    }

    console.log("Hazard reported successfully:", data);
    alert("Hazard reported successfully!");

    // Structural application state reset procedure
    setHazardReport({
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
      latitude: hazardReport.latitude, // Preserve location details for consecutive entries
      longitude: hazardReport.longitude,
    });

    // Clear out the file element from DOM explicitly
    const fileDomElement = document.querySelector('input[type="file"]');
    if (fileDomElement) fileDomElement.value = "";
  }

  return (
    <form onSubmit={createHazardReport} style={{backgroundColor:'#e5e7eb', borderRadius:'40px', padding:'50px', boxShadow:'0 5px 10px gray', maxWidth:'600px', margin:'40px auto'}}>
      <main className="report-page">
        <div className="form-wrapper">
          <div className="icon">
            <img src="https://cdn-icons-png.flaticon.com/128/4151/4151111.png" alt="Hazard Icon" width="64" height="64" />
          </div>
          <h1>Hazard & Risk Report</h1>

          <p className="subtitle">
            Identify potential risks or environmental hazards. Fields marked{" "}
            <span id="required">*</span> are required.
          </p>

          <label>Reporter Name:</label>
          <input
            id="report-input"
            onChange={handleChange}
            name="reporterName"
            type="text"
            placeholder="Enter your name (Optional)"
            value={hazardReport.reporterName}
          />

          <label>Reporter Contact Details:</label>
          <input
            id="report-input"
            onChange={handleChange}
            name="reporterContact"
            type="text"
            placeholder="Enter your contact number or email (Optional)"
            value={hazardReport.reporterContact}
          />

          <label>Location / Address:<span id="required">*</span></label>
          <input
            id="report-input"
            onChange={handleChange}
            name="address"
            type="text"
            placeholder="Enter physical address"
            value={hazardReport.address}
            required
          />

          <label>Landmark:<span id="required">*</span></label>
          <input
            id="report-input"
            onChange={handleChange}
            name="landMark"
            type="text"
            placeholder="e.g., Near the main gate, 2nd floor lobby"
            value={hazardReport.landMark}
            required
          />

          <div className="date-time-grid" >
            <div>
              <label>Date Observed:<span id="required">*</span></label>
              <input
                id="report-input"
                onChange={handleChange}
                name="dateObserved"
                type="date"
                value={hazardReport.dateObserved}
                required
              />
              </div>
          <div>
              <label>Time Observed:<span id="required">*</span></label>
              <input
                id="report-input"
                onChange={handleChange}
                name="timeObserved"
                type="time"
                value={hazardReport.timeObserved}
                required
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label>Hazard Category:<span id="required">*</span></label>
              <select
                name="hazardCategory"
                onChange={handleChange}
                id="report-select"
                value={hazardReport.hazardCategory}
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
                name="riskLevel"
                onChange={handleChange}
                id="report-select"
                value={hazardReport.riskLevel}
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
            id="report-input"
            style={{ minHeight: "100px", padding: "10px", width: "100%" }}
            name="hazardDescription"
            onChange={handleChange}
            placeholder="Describe the hazard and potential danger..."
            value={hazardReport.hazardDescription}
            required
          />

          <label>Recommended / Immediate Action Taken:</label>
          <input
            id="report-input"
            name="recommendedAction"
            type="text"
            onChange={handleChange}
            placeholder="e.g., Placed warning markers, bypassed route (Optional)"
            value={hazardReport.recommendedAction}
          />

          {/* Photo Evidence Section supporting multiple files */}
          <label>Photo Evidence (Upload 2-4 pictures):<span id="required">*</span></label>
          <div className="upload-box">
            <img src={reportImg} alt="photo-icon" /> 
            <span>
              {hazardReport.hazardPhotos.length > 0 
                ? `${hazardReport.hazardPhotos.length} images selected` 
                : "Attach Images (Min: 2, Max: 4)"}
            </span>
            <input
              id="report-input"
              onChange={handleChange}
              name="hazardPhotos"
              type="file"
              accept="image/png, image/jpeg"
              multiple 
              required
            />
          </div>
          {hazardReport.hazardPhotos.length > 0 && (
            <div style={{ fontSize: "12px", marginTop: "5px", color: "#4b5563" }}>
              Selected: {hazardReport.hazardPhotos.map(f => f.name).join(", ")}
            </div>
          )}

          {/* GPS status widget tracker */}
          <div style={{ margin: "15px 0", fontSize: "13px" }}>
            {hazardReport.latitude && hazardReport.longitude ? (
              <span style={{ color: "green" }}>✓ GPS Coordinates captured successfully.</span>
            ) : geoError ? (
              <span style={{ color: "red" }}>⚠ {geoError} Please enable location services.</span>
            ) : (
              <span style={{ color: "#d97706" }}>⌛ Fetching current GPS location...</span>
            )}
          </div>

          <div className="terms">
            <input id="report-input" type="checkbox" required />
            <p>
              I agree to the <Link to="#">Terms & Conditions</Link> and 
              understand that my <b>current GPS location ({hazardReport.latitude || "0.00"}, {hazardReport.longitude || "0.00"})</b> will be recorded 
              to verify the report site.
            </p>
          </div>

          <button id="report-submit" type="submit">
            Submit Hazard Report
          </button>
        </div>
      </main>
    </form>
  );
};

export default HazardReport;