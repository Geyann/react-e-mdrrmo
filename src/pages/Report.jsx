
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
  console.log(report)

  function handleChange(event) {
    const { name, value, type, files } = event.target;

    setReport((prevFormData) => ({
      ...prevFormData,
      [name]: type === "file" ? files[0] : value,
    }));
  }

  async function createUser(event) {
    event.preventDefault();

    let imageName = "";

    if (report.pictureOfIncident) {
      imageName = report.pictureOfIncident.name;
    }

    const { data, error } = await supabase
      .from("reportIncident")
      .insert([
        {
          patientName: report.patientName,
          address: report.address,
          landMark: report.landMark,
          reporterContact: report.reporterContact,
          date: report.date,
          time: report.time,
          incidentType: report.incidentType,
          priorityLevel: report.priorityLevel,
          pictureOfIncident: imageName,
          specialNeeds: report.specialNeeds,
          requiredTools: report.requiredTools,
        },
      ]);

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    console.log("Inserted successfully:", data);

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
  }

  return (
    <form onSubmit={createUser}>
      <main className="report-page">
        <div className="form-wrapper">
          <div className="icon">+</div>
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
            <img src={reportImg} alt="photo-icon" /> <span> PNG / JPEG</span>
            <input
              id="report-input"
              onChange={handleChange}
              name="pictureOfIncident"
              type="file"
              accept="image/png, image/jpeg"
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
          />

          <div className="terms">
            <input id="report-input" type="checkbox" />
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
