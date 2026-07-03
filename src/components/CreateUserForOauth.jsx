import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useNavigate, useLocation } from "react-router-dom";
import imlogo from '../Images/icon.png';
import { UserPlus, Mail, User, Calendar, Phone, MapPin, IdCard, Camera, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

export default function CreateUserForOauth() {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userProvider, setUserProvider] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const initialFormState = {
    firstName: '', middleName: '',
    lastName: '', age: '', address: '', mobileNumber: '',
    birthdate: '', idNumber: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          navigate('/login', { 
            state: { error: 'Session expired. Please sign in with Google or Facebook again.' } 
          });
          return;
        }

        const user = session.user;

        // Check if already has registration
        const { data: existingReg } = await supabase
          .from('pending_registrations')
          .select('id, status')
          .eq('id', user.id)
          .maybeSingle();

        if (existingReg) {
          await supabase.auth.signOut();
          navigate('/login', { 
            state: { 
              message: existingReg.status === 'approved' 
                ? 'Your account is already approved. Please login.' 
                : 'Your registration is already submitted. Please wait for admin approval.' 
            } 
          });
          return;
        }

        const provider = user.app_metadata?.provider || 'oauth';
        setUserProvider(provider);
        setUserEmail(user.email || '');
        setSessionReady(true);

        if (location.state?.message) {
          setError(location.state.message);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError('Failed to verify your session. Please try logging in again.');
      }
    };

    checkSession();
  }, [navigate, location.state]);

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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session expired. Please sign in again with your OAuth account.");
      }

      const userId = session.user.id;

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
          email: userEmail,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          age: parseInt(formData.age),
          address: formData.address,
          mobile_number: formData.mobileNumber,
          birthdate: formData.birthdate,
          id_number: formData.idNumber,
          id_image_url: idPublicUrl,
          status: 'pending',
          role: 'user'
        }]);

      if (dbError) throw dbError;

      await supabase.auth.signOut();

      setFormData(initialFormState);
      setIdFile(null);
      if (e.target) e.target.reset();

      alert('Registration submitted successfully! Please wait for admin approval.');

      navigate('/login', {
        state: { message: 'Your OAuth registration has been submitted for admin approval.' }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50";
  const labelClass = "text-sm font-bold text-gray-700";

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Verifying your OAuth session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-center">
            <img src={imlogo} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-4 bg-white rounded-full p-2 shadow-lg" />
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />
              Complete Your Registration
            </h2>
            <p className="text-green-200 text-sm mt-1">Final step — provide your details for account verification</p>
          </div>

          <div className="p-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 text-sm font-bold">OAuth Authentication Verified</p>
                  <p className="text-green-700 text-sm mt-1">
                    You are signed in with <strong className="capitalize">{userProvider}</strong>.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">{userEmail}</span>
                  </div>
                  <p className="text-green-600 text-xs mt-2">
                    Your email and authentication are already handled by {userProvider}. 
                    Just fill in the form below for identity verification.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <User className="w-4 h-4 inline mr-1 text-green-600" />
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="firstName" 
                  placeholder="Enter your first name" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Middle Name</label>
                <input 
                  className={inputClass} 
                  name="middleName" 
                  placeholder="Enter your middle name (optional)" 
                  value={formData.middleName} 
                  onChange={handleChange} 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <User className="w-4 h-4 inline mr-1 text-green-600" />
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="lastName" 
                  placeholder="Enter your last name" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              {/* Email display only */}
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <Mail className="w-4 h-4 inline mr-1 text-green-600" />
                  Email (from OAuth)
                </label>
                <div className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-500" />
                  {userEmail}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Managed by your OAuth provider ({userProvider}). No password needed.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1 text-green-600" />
                  Age <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="age" 
                  type="number" 
                  min="1" 
                  max="150"
                  placeholder="Your age" 
                  value={formData.age} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1 text-green-600" />
                  Birthdate <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="birthdate" 
                  type="date" 
                  value={formData.birthdate} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}>
                  <IdCard className="w-4 h-4 inline mr-1 text-green-600" />
                  Valid ID Number <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="idNumber" 
                  placeholder="e.g., Passport No., Driver's License No., National ID" 
                  value={formData.idNumber} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}>
                  <Camera className="w-4 h-4 inline mr-1 text-green-600" />
                  Upload ID Picture <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-500 transition cursor-pointer bg-gray-50">
                  <input className="hidden" id="file-upload" type="file" accept="image/*" onChange={handleFileChange} required />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">
                      {idFile ? idFile.name : "Click to upload a photo of your valid ID"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}>
                  <Phone className="w-4 h-4 inline mr-1 text-green-600" />
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input 
                  className={inputClass} 
                  name="mobileNumber" 
                  type="tel" 
                  placeholder="e.g., 09123456789" 
                  value={formData.mobileNumber} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}>
                  <MapPin className="w-4 h-4 inline mr-1 text-green-600" />
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className={`${inputClass} h-24 resize-none`} 
                  name="address" 
                  placeholder="House No., Street, Barangay, City/Municipality, Province" 
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="md:col-span-2 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-green-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SUBMITTING FOR VERIFICATION...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Submit for Verification
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                By submitting, you agree that the information provided will be used for account verification purposes.
                <br />
                Your OAuth account ({userEmail}) will be linked to this profile upon admin approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}