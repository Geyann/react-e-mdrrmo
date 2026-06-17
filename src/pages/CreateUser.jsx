import { useState } from "react";
import { supabase } from "../createClient";
import imlogo from '../Images/icon.png';

export default function CreateUser() {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  
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

      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
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
    <div className="min-h-screen  py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={imlogo} alt="Logo" className="w-50 h-40 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
        </div>
        
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="firstName" placeholder="First Name" onChange={handleChange} required />
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="middleName" placeholder="Middle Name" onChange={handleChange} />
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="lastName" placeholder="Last Name" onChange={handleChange} required />
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" name="password" type="password" placeholder="Password" onChange={handleChange} required />
          
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="age" type="number" placeholder="Age" onChange={handleChange} required />
          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" name="birthdate" type="date" onChange={handleChange} required />

          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" name="idNumber" placeholder="Valid ID Number" onChange={handleChange} required />
          
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Upload ID Picture:</label>
            <input className="p-2 border rounded-lg cursor-pointer" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>

          <input className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" name="mobileNumber" type="tel" placeholder="Mobile Number" onChange={handleChange} required />
          <textarea className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2 h-24" name="address" placeholder="Full Address" onChange={handleChange} required />

          <button 
            type="submit" 
            className="md:col-span-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? 'TRANSMITTING...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}