import React, { useState } from 'react';
import { supabase } from '../createClient';
import imlogo from '../Images/icon.png';

const CreateUser = () => {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null); // State for the image file
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', middleName: '',
    lastName: '', age: '', address: '', mobileNumber: '',
    birthdate: '', idNumber: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setIdFile(e.target.files[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    const user = authData.user;
    if (user) {
      let idPublicUrl = '';

      // 2. Upload ID Image if selected
      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `ids/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('id-previews')
          .upload(filePath, idFile);

        if (uploadError) {
          alert("ID Upload Error: " + uploadError.message);
        } else {
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('id-previews')
            .getPublicUrl(filePath);
          idPublicUrl = urlData.publicUrl;
        }
      }

      // 3. Insert into Profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          age: parseInt(formData.age),
          address: formData.address,
          mobile_number: formData.mobileNumber,
          birthdate: formData.birthdate,
          id_number: formData.idNumber,
          id_image_url: idPublicUrl // New column for the image link
        }]);

      if (profileError) alert(profileError.message);
      else alert('Account created! Check your email for verification.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="access-portal-container" style={{ maxHeight: 'none', overflowY: 'auto' }}>
        <img src={imlogo} id="loginimg" alt="Logo" />
        <h2>Create Account</h2>
        
        <form onSubmit={handleRegister}>
          <input className="portal-input-field" name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input className="portal-input-field" name="password" type="password" placeholder="Password" onChange={handleChange} required />
          
          <input className="portal-input-field" name="firstName" placeholder="First Name" onChange={handleChange} required />
          <input className="portal-input-field" name="lastName" placeholder="Last Name" onChange={handleChange} required />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input className="portal-input-field" name="age" type="number" placeholder="Age" onChange={handleChange} required />
            <input className="portal-input-field" name="birthdate" type="date" onChange={handleChange} required />
          </div>

          <input className="portal-input-field" name="idNumber" placeholder="Valid ID Number" onChange={handleChange} required />
          
          {/* File Input for ID Picture */}
          <div style={{ textAlign: 'left', margin: '10px 0' }}>
            <label style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>Upload ID Picture:</label>
            <input className="portal-input-field" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>

          <input className="portal-input-field" name="mobileNumber" type="tel" placeholder="Mobile Number" onChange={handleChange} required />
          <textarea className="portal-input-field" name="address" placeholder="Full Address" onChange={handleChange} required style={{ height: '60px' }} />

          <button type="submit" className="btn-execute-login" disabled={loading}>
            {loading ? 'Uploading & Creating...' : 'REGISTER'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;
