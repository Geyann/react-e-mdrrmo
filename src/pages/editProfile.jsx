import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import { 
  User, Phone, MapPin, 
  ArrowLeft, Save, AlertCircle,
  CheckCircle, Camera, Upload, X
} from "lucide-react";

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  const [form, setForm] = useState({
    mobile_number: "",
    address: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [existingPicture, setExistingPicture] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);

      // Get existing profile data from both tables
      const { data: pendingData } = await supabase
        .from("pending_registrations")
        .select("mobile_number, address, id_image_url")
        .eq("email", parsedUser.email)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("mobile_number, address, id_image_url")
        .eq("email", parsedUser.email)
        .maybeSingle();

      setForm({
        mobile_number: pendingData?.mobile_number || profileData?.mobile_number || parsedUser.mobile_number || "",
        address: pendingData?.address || profileData?.address || parsedUser.address || "",
      });

      const picUrl = pendingData?.id_image_url || profileData?.id_image_url || parsedUser.id_image_url || "";
      if (picUrl) {
        setExistingPicture(picUrl);
      }

    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) return null;

    const fileExt = profilePicture.name.split('.').pop();
    const fileName = `profile_${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Delete old picture if exists
    if (existingPicture) {
      const oldPath = existingPicture.split('/').pop();
      await supabase.storage.from('images').remove([`profiles/${oldPath}`]).catch(() => {});
    }

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, profilePicture);

    if (uploadError) {
      throw new Error('Failed to upload image: ' + uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      let idImageUrl = existingPicture;

      // Upload new picture if changed
      if (profilePicture) {
        idImageUrl = await uploadProfilePicture();
      }

      const updateData = {
        mobile_number: form.mobile_number,
        address: form.address,
        id_image_url: idImageUrl,
        updated_at: new Date().toISOString(),
      };

      // Update pending_registrations
      const { error: pendingError } = await supabase
        .from("pending_registrations")
        .update(updateData)
        .eq("email", currentUser.email);

      // Update profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("email", currentUser.email);

      if (pendingError && pendingError.code !== 'PGRST116') {
        console.warn("pending_registrations update:", pendingError.message);
      }
      if (profileError && profileError.code !== 'PGRST116') {
        console.warn("profiles update:", profileError.message);
      }

      // Update localStorage
      const updatedUser = { ...currentUser, ...updateData };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate('/profile'), 1500);

    } catch (err) {
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    setExistingPicture(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition mb-6 font-semibold">
          <ArrowLeft className="w-5 h-5" /> Back to Profile
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-center text-white">
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="text-white/80 text-sm mt-1">Update your information</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {success && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" /> Profile Picture
              </label>
              
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-100 shadow-lg">
                  {(profilePicturePreview || existingPicture) ? (
                    <img src={profilePicturePreview || existingPicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <User className="w-12 h-12 text-purple-400" />
                    </div>
                  )}
                </div>
                
                {(profilePicturePreview || existingPicture) && (
                  <button type="button" onClick={removeProfilePicture} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-md">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition font-medium text-sm border border-purple-200">
                  <Upload className="w-4 h-4" />
                  {existingPicture || profilePicturePreview ? "Change Photo" : "Upload Photo"}
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400">JPG, PNG or GIF. Max 5MB.</p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-5">
              {/* Read-only Info */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">Account Email</p>
                <p className="text-gray-800 font-bold">{currentUser?.email}</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Full Name</p>
                <p className="text-gray-800 font-bold">{currentUser?.full_name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}</p>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1.5">
                    <Phone className="w-4 h-4 inline mr-1 text-purple-600" /> Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="mobile_number"
                    value={form.mobile_number}
                    onChange={handleChange}
                    placeholder="e.g. 09123456789"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1.5">
                    <MapPin className="w-4 h-4 inline mr-1 text-purple-600" /> Address
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter your complete address"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <><Save className="w-5 h-5" /> Save Changes</>
                )}
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2" disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;