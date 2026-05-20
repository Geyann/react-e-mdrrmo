import React, { useState } from 'react';
import { supabase } from '../createClient';
import imlogo from '../Images/icon.png';

const CreateUser = () => {
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [idFile, setIdFile] = useState(null);
  
  // Initial state object for easy resetting
  const initialFormState = {
    email: '', password: '', firstName: '', middleName: '',
    lastName: '', age: '', address: '', mobileNumber: '',
    birthdate: '', idNumber: ''
  };

  const [formData, setFormData] = useState(initialFormState);
=======
  const [idFile, setIdFile] = useState(null); // State for the image file
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', middleName: '',
    lastName: '', age: '', address: '', mobileNumber: '',
    birthdate: '', idNumber: ''
  });
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setIdFile(e.target.files[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

<<<<<<< HEAD
    try {
      let idPublicUrl = '';

      // 1. Upload ID Image to 'id-previews' bucket
      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
        // Standardize file path
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `pending_ids/${fileName}`;
=======
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
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d

        const { error: uploadError } = await supabase.storage
          .from('id-previews')
          .upload(filePath, idFile);

<<<<<<< HEAD
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
=======
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
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          age: parseInt(formData.age),
          address: formData.address,
          mobile_number: formData.mobileNumber,
          birthdate: formData.birthdate,
          id_number: formData.idNumber,
<<<<<<< HEAD
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
=======
          id_image_url: idPublicUrl // New column for the image link
        }]);

      if (profileError) alert(profileError.message);
      else alert('Account created! Check your email for verification.');
    }
    setLoading(false);
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
  };

  return (
    <div className="login-page">
<<<<<<< HEAD
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
          
=======
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
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
          <div style={{ textAlign: 'left', margin: '10px 0' }}>
            <label style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>Upload ID Picture:</label>
            <input className="portal-input-field" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>

<<<<<<< HEAD
          <input className="portal-input-field" name="mobileNumber" value={formData.mobileNumber} type="tel" placeholder="Mobile Number" onChange={handleChange} required />
          <textarea className="portal-input-field" name="address" value={formData.address} placeholder="Full Address" onChange={handleChange} required style={{ height: '60px' }} />

          <button type="submit" className="btn-execute-login" disabled={loading}>
            {loading ? 'TRANSMITTING...' : 'REGISTER'}
=======
          <input className="portal-input-field" name="mobileNumber" type="tel" placeholder="Mobile Number" onChange={handleChange} required />
          <textarea className="portal-input-field" name="address" placeholder="Full Address" onChange={handleChange} required style={{ height: '60px' }} />

          <button type="submit" className="btn-execute-login" disabled={loading}>
            {loading ? 'Uploading & Creating...' : 'REGISTER'}
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
          </button>
        </form>
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default CreateUser;
=======
export default CreateUser;
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
