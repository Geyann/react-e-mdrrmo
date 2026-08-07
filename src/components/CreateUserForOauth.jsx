import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useNavigate, useLocation } from "react-router-dom";
import imlogo from '../Images/icon.png';
import { UserPlus, Mail, User, Calendar, Phone, MapPin, IdCard, Camera, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

// Normalizes profile fields coming from Google / Facebook / any OAuth provider
function extractProfile(user) {
  const meta = user?.user_metadata || {};
  const fullName = meta.full_name || meta.name || '';
  const given = meta.given_name || meta.first_name || fullName.split(' ')[0] || '';
  const family = meta.family_name || meta.last_name || fullName.split(' ').slice(1).join(' ') || '';
  const email = user?.email || meta.email || '';
  return {
    email,
    provider: user?.app_metadata?.provider || 'OAuth',
    firstName: given,
    lastName: family,
    username: (email.split('@')[0] || '').replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase(),
    avatar: meta.avatar_url || meta.picture || '',
  };
}

export default function CreateUserForOauth() {
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialFormState = {
    username: '', firstName: '', middleName: '', lastName: '',
    age: '', address: '', mobileNumber: '', birthdate: '', idNumber: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          navigate('/login', { state: { error: 'Session expired. Please sign in with Google or Facebook again.' } });
          return;
        }

        const userId = session.user.id;

        // Already registered? (look up by user_id, fall back to id)
        let existing = null;
        const { data: byUserId } = await supabase
          .from('pending_registrations').select('id, status').eq('user_id', userId).maybeSingle();
        if (byUserId) existing = byUserId;
        else {
          const { data: byId } = await supabase
            .from('pending_registrations').select('id, status').eq('id', userId).maybeSingle();
          existing = byId;
        }

        if (existing) {
          await supabase.auth.signOut();
          navigate('/login', {
            state: existing.status === 'approved'
              ? { error: 'Your account is already approved. Please sign in with Google/Facebook again to continue.' }
              : existing.status === 'rejected'
                ? { error: 'Your registration was rejected by the admin.' }
                : { message: 'Your registration is already submitted. Please wait for admin approval.' }
          });
          return;
        }

        // Auto-fill from the OAuth provider
        const p = extractProfile(session.user);
        setProfile(p);
        setFormData(prev => ({
          ...prev,
          username: p.username || prev.username,
          firstName: p.firstName,
          lastName: p.lastName,
        }));
        setSessionReady(true);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setSessionReady(true);
      }
    };
    checkSession();
  }, [navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setIdFile(e.target.files[0]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (!profile) { setError("Session expired. Please sign in again."); setLoading(false); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session. Please sign in again.");
      const userId = session.user.id;

      // Username uniqueness
      const { data: existingUser } = await supabase
        .from('pending_registrations').select('username').eq('username', formData.username).maybeSingle();
      if (existingUser) throw new Error("Username is already taken. Please choose another.");

      // Email uniqueness (OAuth email must not collide with an existing row)
      const { data: existingEmail } = await supabase
        .from('pending_registrations').select('email').eq('email', profile.email).maybeSingle();
      if (existingEmail) throw new Error("This email is already registered.");

      let idPublicUrl = '';
      if (idFile) {
        const fileExt = idFile.name.split('.').pop();
        const fileName = `ids/${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('pending_ids').upload(fileName, idFile);
        if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);
        idPublicUrl = supabase.storage.from('pending_ids').getPublicUrl(fileName).data.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('pending_registrations')
        .insert([{
          id: userId,                    // = the OAuth auth UUID so AuthCallback can find it
          user_id: userId,
          username: formData.username,
          email: profile.email,          // real email from provider
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
          role: 'user',
        }]);

      if (dbError) {
        if (dbError.message?.includes('username')) throw new Error("Username is already taken.");
        if (dbError.message?.includes('email')) throw new Error("This email is already registered.");
        throw new Error(dbError.message);
      }

      // Submitted -> sign out so the admin-approval gate applies
      await supabase.auth.signOut();
      navigate('/login', { state: { message: 'Account submitted! Wait for admin approval, then sign in with Google/Facebook.' } });
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-semibold ml-3">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
       <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-purple-600 transition font-semibold z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>
      <div className="max-w-3xl mx-auto py-10 px-4">
       

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
            <img src={imlogo} alt="Logo" className="w-30 h-30 object-contain mx-auto mb-4 bg-slate-700 rounded-full p-5 shadow-lg" />
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" /> Complete Your Profile
            </h2>
            <p className="text-purple-200 text-sm mt-1">
              Signed in with <span className="font-semibold capitalize">{profile?.provider}</span> — finish verification to continue
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
            {notice && (
              <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-purple-700 text-sm font-medium">{notice}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Auto-filled username */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><User className="w-4 h-4 inline mr-1 text-purple-600" />Username <span className="text-red-500">*</span></label>
                <input className={inputClass} name="username" placeholder="Choose a unique username"
                  value={formData.username} onChange={handleChange} required minLength={3} />
              </div>

              {/* Auto-filled from OAuth */}
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><User className="w-4 h-4 inline mr-1 text-purple-600" />First Name <span className="text-red-500">*</span></label>
                <input className={inputClass} name="firstName" placeholder="First Name"
                  value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Middle Name</label>
                <input className={inputClass} name="middleName" placeholder="Middle Name"
                  value={formData.middleName} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><User className="w-4 h-4 inline mr-1 text-purple-600" />Last Name <span className="text-red-500">*</span></label>
                <input className={inputClass} name="lastName" placeholder="Last Name"
                  value={formData.lastName} onChange={handleChange} required />
              </div>

              {/* Auto-filled email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Mail className="w-4 h-4 inline mr-1 text-purple-600" />Email (from {profile?.provider})</label>
                <div className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-medium">
                  {profile?.email || 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Managed by your OAuth provider. No password needed.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1 text-purple-600" />Age <span className="text-red-500">*</span></label>
                <input className={inputClass} name="age" type="number" min="1" max="150" placeholder="Age"
                  value={formData.age} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1 text-purple-600" />Birthdate <span className="text-red-500">*</span></label>
                <input className={inputClass} name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><IdCard className="w-4 h-4 inline mr-1 text-purple-600" />Valid ID Number <span className="text-red-500">*</span></label>
                <input className={inputClass} name="idNumber" placeholder="e.g., Passport No., Driver's License No." value={formData.idNumber} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><Camera className="w-4 h-4 inline mr-1 text-purple-600" />Upload ID Picture <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-500 transition cursor-pointer bg-gray-50">
                  <input className="hidden" id="file-upload" type="file" accept="image/*" onChange={handleFileChange} required />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">{idFile ? idFile.name : "Click to upload a photo of your valid ID"}</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><Phone className="w-4 h-4 inline mr-1 text-purple-600" />Mobile Number <span className="text-red-500">*</span></label>
                <input className={inputClass} name="mobileNumber" type="tel" placeholder="e.g., 09123456789" value={formData.mobileNumber} onChange={handleChange} required />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelClass}><MapPin className="w-4 h-4 inline mr-1 text-purple-600" />Full Address <span className="text-red-500">*</span></label>
                <textarea className={`${inputClass} h-24 resize-none`} name="address" placeholder="House No., Street, Barangay, City, Province" value={formData.address} onChange={handleChange} required />
              </div>

              <button
                type="submit"
                className="md:col-span-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
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
                  <><UserPlus className="w-5 h-5" /> Submit for Verification</>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                Your OAuth account ({profile?.email}) will be linked to this profile upon admin approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}