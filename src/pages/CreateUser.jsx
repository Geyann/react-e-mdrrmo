import { useState } from "react";
import { supabase } from "../createClient";
import { useNavigate } from "react-router-dom";
import imlogo from '../Images/icon.png';
import { UserPlus, Mail, Lock, User, Calendar, Phone, MapPin, IdCard, Camera, AlertCircle, ArrowLeft } from 'lucide-react';

export default function CreateUser() {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
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
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);

      const userId = authData.user?.id;
      if (!userId) throw new Error("Failed to create user account.");

      let idPublicUrl = '';
      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
        const fileName = `ids/${userId}-${Date.now()}.${fileExt}`;
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
          id: userId,
          email: formData.email,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          age: parseInt(formData.age),
          address: formData.address,
          mobile_number: formData.mobileNumber,
          birthdate: formData.birthdate,
          id_number: formData.idNumber,
          id_image_url: idPublicUrl,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      alert('Account created! Please check your email for a confirmation link, then wait for admin approval.');
      setFormData(initialFormState);
      setIdFile(null);
      e.target.reset();
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50";
  const labelClass = "text-sm font-bold text-gray-700";

  return (
    <div className="min-h-screen  from-blue-50 to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center">
            <img src={imlogo} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-4 bg-white rounded-full p-2 shadow-lg" />
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />
              Create Account
            </h2>
            <p className="text-purple-200 text-sm mt-1">Fill in your details to register</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><User className="w-4 h-4 inline mr-1 text-purple-600" />First Name</label>
                <input className={inputClass} name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Middle Name</label>
                <input className={inputClass} name="middleName" placeholder="Middle Name" value={formData.middleName} onChange={handleChange} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><User className="w-4 h-4 inline mr-1 text-purple-600" />Last Name</label>
                <input className={inputClass} name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Mail className="w-4 h-4 inline mr-1 text-purple-600" />Email</label>
                <input className={inputClass} name="email" type="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><Lock className="w-4 h-4 inline mr-1 text-purple-600" />Password</label>
                <input className={inputClass} name="password" type="password" placeholder="Create a strong password" value={formData.password} onChange={handleChange} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1 text-purple-600" />Age</label>
                <input className={inputClass} name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1 text-purple-600" />Birthdate</label>
                <input className={inputClass} name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><IdCard className="w-4 h-4 inline mr-1 text-purple-600" />Valid ID Number</label>
                <input className={inputClass} name="idNumber" placeholder="e.g., Passport, Driver's License No." value={formData.idNumber} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><Camera className="w-4 h-4 inline mr-1 text-purple-600" />Upload ID Picture</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-500 transition cursor-pointer bg-gray-50">
                  <input className="hidden" id="file-upload" type="file" accept="image/*" onChange={handleFileChange} required />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">
                      {idFile ? idFile.name : "Click to upload your ID image"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><Phone className="w-4 h-4 inline mr-1 text-purple-600" />Mobile Number</label>
                <input className={inputClass} name="mobileNumber" type="tel" placeholder="09123456789" value={formData.mobileNumber} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><MapPin className="w-4 h-4 inline mr-1 text-purple-600" />Full Address</label>
                <textarea className={`${inputClass} h-24 resize-none`} name="address" placeholder="House No., Street, Barangay, City, Province" value={formData.address} onChange={handleChange} required />
              </div>

              <button 
                type="submit" 
                className="md:col-span-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    CREATING ACCOUNT...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-purple-600 font-bold hover:text-purple-700 hover:underline transition"
                >
                  Login here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}