import React, { useState } from 'react';
import { supabase } from '../createClient';
import imlogo from '../Images/icon.png';

const CreateUser = () => {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  
  // Initial state object for easy resetting
  const initialFormState = {
    email: '', password: '', firstName: '', middleName: '',
    lastName: '', age: '', address: '', mobileNumber: '',
    birthdate: '', idNumber: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setIdFile(e.target.files[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let idPublicUrl = '';

      // 1. Upload ID Image to 'id-previews' bucket
      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
        // Standardize file path
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `pending_ids/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('id-previews')
          .upload(filePath, idFile);

        if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from('id-previews')
          .getPublicUrl(filePath);
        
        idPublicUrl = urlData.publicUrl;
      }

      // 2. Insert into Pending Table
      const { error: dbError } = await supabase
        .from('pending_registrations')
        .insert([{
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          age: parseInt(formData.age),
          address: formData.address,
          mobile_number: formData.mobileNumber,
          birthdate: formData.birthdate,
          id_number: formData.idNumber,
          id_image_url: idPublicUrl
        }]);

      if (dbError) throw dbError;

      alert('Application submitted! Please wait for admin approval.');
      
      // 3. Proper Reset: Clear state and the file input
      setFormData(initialFormState);
      setIdFile(null);
      e.target.reset(); 

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="access-portal-container" style={{minWidth:'100vh', maxHeight: '160vh', overflowY: 'auto' }}>
        <img src={imlogo} id="loginimg" alt="Logo" />
        <h2>Create Account</h2>
        
        <form onSubmit={handleRegister}>      
          <input className="portal-input-field" name="firstName" value={formData.firstName} placeholder="First Name" onChange={handleChange} required />
          {/* Ensure name="middleName" matches your state key */}
          <input className="portal-input-field" name="middleName" value={formData.middleName} type="text" placeholder="Middle Name" onChange={handleChange} />
          <input className="portal-input-field" name="lastName" value={formData.lastName} placeholder="Last Name" onChange={handleChange} required />
          <input className="portal-input-field" name="email" value={formData.email} type="email" placeholder="Email" onChange={handleChange} required />
          <input className="portal-input-field" name="password" value={formData.password} type="password" placeholder="Password" onChange={handleChange} required />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input className="portal-input-field" name="age" value={formData.age} type="number" placeholder="Age" onChange={handleChange} required />
            <input className="portal-input-field" name="birthdate" value={formData.birthdate} type="date" onChange={handleChange} required />
          </div>

          <input className="portal-input-field" name="idNumber" value={formData.idNumber} placeholder="Valid ID Number" onChange={handleChange} required />
          
          <div style={{ textAlign: 'left', margin: '10px 0' }}>
            <label style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>Upload ID Picture:</label>
            <input className="portal-input-field" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>

          <input className="portal-input-field" name="mobileNumber" value={formData.mobileNumber} type="tel" placeholder="Mobile Number" onChange={handleChange} required />
          <textarea className="portal-input-field" name="address" value={formData.address} placeholder="Full Address" onChange={handleChange} required style={{ height: '60px' }} />

          <button type="submit" className="btn-execute-login" disabled={loading}>
            {loading ? 'TRANSMITTING...' : 'REGISTER'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;