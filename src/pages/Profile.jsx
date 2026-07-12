import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import { 
  User, Mail, Calendar, Phone, MapPin, 
  IdCard, Shield, ArrowLeft, LogOut, 
  Camera, CheckCircle, XCircle, Clock,
  Building, BadgeCheck
} from "lucide-react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // ===== 1. Check localStorage for STAFF/ADMIN (highest priority) =====
        const storedStaff = localStorage.getItem('currentStaff');
        if (storedStaff) {
          const parsed = JSON.parse(storedStaff);
          setUserType(parsed.role); // 'staff' or 'admin'
          setProfile({
            type: parsed.role,
            id: parsed.id,
            user_id: parsed.user_id,
            email: parsed.email,
            full_name: parsed.full_name,
            role: parsed.role,
            department: parsed.department,
            is_active: parsed.is_active,
            created_at: parsed.created_at,
          });
          return;
        }

        // ===== 2. Check localStorage for REGULAR USER =====
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserType('user');

          // Get additional details from pending_registrations or profiles
          const { data: pendingData } = await supabase
            .from("pending_registrations")
            .select("*")
            .eq("email", parsedUser.email)
            .maybeSingle();

          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", parsedUser.email)
            .maybeSingle();

          setProfile({
            type: 'user',
            id: parsedUser.id || parsedUser.user_id,
            user_id: parsedUser.user_id || parsedUser.id,
            email: parsedUser.email,
            full_name: parsedUser.full_name || `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`,
            first_name: pendingData?.first_name || profileData?.first_name || parsedUser.first_name || '',
            middle_name: pendingData?.middle_name || profileData?.middle_name || parsedUser.middle_name || '',
            last_name: pendingData?.last_name || profileData?.last_name || parsedUser.last_name || '',
            username: pendingData?.username || profileData?.username || parsedUser.username || '',
            mobile_number: pendingData?.mobile_number || profileData?.mobile_number || '',
            address: pendingData?.address || profileData?.address || '',
            birthdate: pendingData?.birthdate || profileData?.birthdate || '',
            age: pendingData?.age || profileData?.age || '',
            id_number: pendingData?.id_number || profileData?.id_number || '',
            id_image_url: pendingData?.id_image_url || profileData?.id_image_url || '',
            status: pendingData?.status || parsedUser.status || 'approved',
            created_at: pendingData?.created_at || parsedUser.created_at,
          });
          return;
        }

        // ===== 3. No authentication found =====
        navigate('/login');

      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    // Clear both possible sessions
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentStaff');
    navigate('/login');
  };

  // ... rest of your component (getStatusBadge, loading/error renders, return JSX) stays exactly the same ...

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
      case true:
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "rejected":
      case false:
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            Unknown
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <p className="text-red-600 font-bold text-lg">{error}</p>
          <button onClick={() => navigate("/home")} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">Go Home</button>
        </div>
      </div>
    );
  }

  const isStaffOrAdmin = userType === 'staff' || userType === 'admin';
  const gradientFrom = isStaffOrAdmin ? 'from-purple-600' : 'from-blue-600';
  const gradientTo = isStaffOrAdmin ? 'to-indigo-600' : 'to-purple-600';

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} p-8 text-white`}>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center relative">
                {profile?.id_image_url ? (
                  <img src={profile.id_image_url} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
                {isStaffOrAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`}</h1>
                <p className="text-white/80 mt-1 flex items-center gap-2">
                  {isStaffOrAdmin ? <><Shield className="w-4 h-4" /> {profile?.role === 'admin' ? 'Administrator' : 'Staff Member'}</> : <><User className="w-4 h-4" /> Resident</>}
                </p>
                {isStaffOrAdmin && profile?.department && (
                  <p className="text-white/60 text-sm mt-0.5 flex items-center gap-1"><Building className="w-3 h-3" /> {profile.department}</p>
                )}
                <div className="mt-2">{getStatusBadge(profile?.is_active !== undefined ? profile.is_active : profile?.status)}</div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">{isStaffOrAdmin ? 'Staff Information' : 'Account Information'}</h2>

            {/* Staff/Admin Specific */}
            {isStaffOrAdmin && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">Role:</span>
                    <span className="text-sm font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-lg capitalize">{profile?.role}</span>
                  </div>
                </div>
                {profile?.department && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-700">Department:</span>
                      <span className="text-sm font-bold text-indigo-900">{profile.department}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User/Staff ID */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">{isStaffOrAdmin ? 'Staff ID:' : 'User ID:'}</span>
                <span className="text-sm font-mono font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-lg">{profile?.user_id || profile?.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-gray-800 font-medium">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</p>
                  <p className="text-gray-800 font-medium">{profile?.full_name || `${profile?.first_name || ''} ${profile?.middle_name || ''} ${profile?.last_name || ''}`}</p>
                </div>
              </div>

              {!isStaffOrAdmin && profile?.username && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</p>
                    <p className="text-gray-800 font-medium">@{profile.username}</p>
                  </div>
                </div>
              )}

              {profile?.mobile_number && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</p>
                    <p className="text-gray-800 font-medium">{profile.mobile_number}</p>
                  </div>
                </div>
              )}

              {profile?.address && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                    <p className="text-gray-800 font-medium">{profile.address}</p>
                  </div>
                </div>
              )}

              {!isStaffOrAdmin && profile?.age && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</p>
                    <p className="text-gray-800 font-medium">{profile.age} years old</p>
                  </div>
                </div>
              )}

              {!isStaffOrAdmin && profile?.birthdate && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Birthdate</p>
                    <p className="text-gray-800 font-medium">{profile.birthdate}</p>
                  </div>
                </div>
              )}

              {!isStaffOrAdmin && profile?.id_number && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <IdCard className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Number</p>
                    <p className="text-gray-800 font-medium">{profile.id_number}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Type</p>
                  <p className="text-gray-800 font-medium capitalize">{userType === 'admin' ? 'Administrator' : userType === 'staff' ? 'Staff Member' : 'Regular User'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Since</p>
                  <p className="text-gray-800 font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</p>
                </div>
              </div>
            </div>

            {/* ID Image Preview (user only) */}
            {!isStaffOrAdmin && profile?.id_image_url && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Camera className="w-5 h-5 text-purple-600" /> Submitted ID</h3>
                <img src={profile.id_image_url} alt="Submitted ID" className="w-full max-w-md rounded-xl border border-gray-200 shadow-sm" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {userType === 'user' && (
                <button onClick={() => navigate("/edit-profile")} className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg">
                  Edit Profile
                </button>
              )}
              {isStaffOrAdmin && (
                <button onClick={() => navigate(userType === 'admin' ? '/admin/dashboard' : '/staff/dashboard')} className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg">
                  Back to Dashboard
                </button>
              )}
              <button onClick={handleLogout} className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;