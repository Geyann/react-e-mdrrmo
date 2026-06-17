import { Link } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState } from "react";
import { supabase } from "../createClient";

const Report = () => {
  const [report, setReport] = useState({
    patientName: "",
    address: "",
    landMark: "",
    reporterContact: "",
    date: "",
    time: "",
    incidentType: "",
    priorityLevel: "",
    pictureOfIncident: null,
    specialNeeds: "",
    requiredTools: "",
  });

  function handleChange(event) {
    const { name, value, type, files } = event.target;

    setReport((prevFormData) => ({
      ...prevFormData,
      [name]: type === "file" ? files[0] : value,
    }));
  }

  async function createUser(event) {
    event.preventDefault();

    let uploadedFileName = "";

    // 1. UPLOAD THE PHYSICAL IMAGE FILE TO SUPABASE STORAGE FIRST
    if (report.pictureOfIncident) {
      const file = report.pictureOfIncident;
      
      // Create a completely unique filename using a timestamp to prevent overwrites
      const fileExt = file.name.split('.').pop();
      uploadedFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("incidents") // ⚠️ Must match your bucket ID precisely
        .upload(uploadedFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        alert(`Failed to upload photo proof: ${uploadError.message}`);
        return; // Halt form submission if upload fails
      }
      
      console.log("File uploaded successfully to bucket:", uploadData);
    }

    // 2. INSERT ROW INTO THE SUPABASE DATABASE TABLE
    // Note: I saved the unique filename string wrapped in an array [uploadedFileName]
    // because your Admin Dashboard code reads it via ".length" property as an array.
    const { data, error } = await supabase
      .from("hazard_reports") // ⚠️ Standardized to your active "hazard_reports" table
      .insert([
        {
          reporter_name: report.patientName, // Maps to table data schema
          address: report.address,
          landmark: report.landMark,
          reporter_contact: report.reporterContact,
          date_observed: report.date || null,
          time_observed: report.time || null,
          hazard_category: report.incidentType,
          risk_level: report.priorityLevel,
          hazard_photos: uploadedFileName ? [uploadedFileName] : [], 
          hazard_description: report.specialNeeds,
          recommended_action: report.requiredTools,
          report_status: "pending"
        },
      ]);

    if (error) {
      console.error("Insert error:", error);
      alert(`Database insert failed: ${error.message}`);
      return;
    }

    alert("Incident Report Submitted Successfully!");

    // Reset Form Fields after successful completion
    setReport({
      patientName: "",
      address: "",
      landMark: "",
      reporterContact: "",
      date: "",
      time: "",
      incidentType: "",
      priorityLevel: "",
      pictureOfIncident: null,
      specialNeeds: "",
      requiredTools: "",
    });
    
    // Clear out the file input DOM explicitly
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  }

  return (
    <form onSubmit={createUser} style={{backgroundColor:'#e5e7eb', borderRadius:'40px', padding:'50px', boxShadow:'0 5px 10px gray', maxWidth:'600px', margin:'40px auto'}}>
      <main className="report-page">
        <div className="form-wrapper">
          <div className="icon"><img src="https://cdn-icons-png.flaticon.com/128/2668/2668417.png" loading="lazy" alt="Emergency " title="Emergency " width="64" height="64" /></div>
          <h1>Report an Incident</h1>

          <p className="subtitle">
            Please provide details below. All fields marked{" "}
            <span id="required">*</span> are required for immediate assessment.
          </p>

          <label htmlFor="patientName">
            Patient Name:<span id="required">*</span>
          </label>
          <input
            id="report-input"
            onChange={handleChange}
            name="patientName"
            type="text"
            placeholder="Please Enter Patient Name"
            value={report.patientName}
            required
          />

          <label>
            Location / Address:<span id="required">*</span>
          </label>
          <input
            id="report-input"
            onChange={handleChange}
            name="address"
            type="text"
            placeholder="Enter Address"
            value={report.address}
            required
          />

          <label>
            Land Mark:<span id="required">*</span>
          </label>
          <input
            id="report-input"
            onChange={handleChange}
            name="landMark"
            type="text"
            placeholder="Enter Land mark"
            value={report.landMark}
            required
          />

          <label>
            Contact Details of Person Reporting:<span>*</span>
          </label>
          <input
            id="report-input"
            onChange={handleChange}
            name="reporterContact"
            type="text"
            placeholder="Enter your Contact Details"
            value={report.reporterContact}
            required
          />

          <div className="date-time-grid">
            <label>
              Date:<span id="required">*</span>
            </label>
            <input
              id="report-input"
              onChange={handleChange}
              name="date"
              type="date"
              value={report.date}
              required
            />

            <label>
              Time:<span id="required">*</span>
            </label>
            <input
              id="report-input"
              onChange={handleChange}
              name="time"
              type="time"
              value={report.time}
              required
            />
          </div>

          <div className="row">
            <div>
              <label>
                Incident Type:<span id="required">*</span>
              </label>
              <select
                name="incidentType"
                onChange={handleChange}
                id="report-select"
                value={report.incidentType}
                required
              >
                <option value="">Select an Option</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Fire">Fire</option>
                <option value="Accident">Accident</option>
                <option value="Natural Disaster">Natural Disaster</option>
              </select>
            </div>

            <div>
              <label>
                Priority Level:<span id="required">*</span>
              </label>
              <select
                name="priorityLevel"
                onChange={handleChange}
                id="report-select"
                value={report.priorityLevel}
                required
              >
                <option value="">Select an Option</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <label>
            Picture of Incident:<span id="required">*</span>
          </label>
          <div className="upload-box">
            <img src={reportImg} alt="photo-icon" /> <span>{report.pictureOfIncident ? report.pictureOfIncident.name : "PNG / JPEG"}</span>
            <input
              id="report-input"
              onChange={handleChange}
              name="pictureOfIncident"
              type="file"
              accept="image/png, image/jpeg"
              required
            />
          </div>

          <label>
            Special Needs of Patient:<span id="required">*</span>
          </label>
          <input
            name="specialNeeds"
            type="text"
            onChange={handleChange}
            placeholder="e.g., allergies, mobility issues"
            value={report.specialNeeds}
            required
          />

          <label>
            Required Tools / Resources:<span id="required">*</span>
          </label>
          <input
            name="requiredTools"
            type="text"
            onChange={handleChange}
            placeholder="e.g., first aid kit, stretcher"
            value={report.requiredTools}
            required
          />

          <div className="terms">
            <input id="report-input" type="checkbox" required />
            <p>
              I agree to the <Link to="#">Terms & Conditions</Link> and
              understand that location access is required.
            </p>
          </div>

          <button id="report-submit" type="submit">
            Submit Incident Report
          </button>
        </div>
      </main>
    </form>
  );
};

export default Report;