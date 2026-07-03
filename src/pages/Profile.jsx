import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import { 
  User, Mail, Calendar, Phone, MapPin, 
  IdCard, Shield, ArrowLeft, LogOut, 
  Camera, CheckCircle, XCircle, Clock 
} from "lucide-react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // Get the currently logged-in user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        if (!user) {
          navigate("/login");
          return;
        }

        setAuthUser(user);

        // Check if user is an admin (from admin_users table or similar)
        const { data: adminData, error: adminError } = await supabase
          .from("admin_users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (adminData) {
          // User is an admin
          setProfile({
            type: "admin",
            ...adminData,
            email: user.email,
          });
        } else {
          // User is a regular user - fetch from pending_registrations or users table
          const { data: userData, error: userError } = await supabase
            .from("pending_registrations")
            .select("*")
            .eq("id", user.id)
            .single();

          if (userError && userError.code !== "PGRST116") {
            // Try alternative table names
            const { data: altData, error: altError } = await supabase
              .from("users")
              .select("*")
              .eq("id", user.id)
              .single();

            if (!altError && altData) {
              setProfile({
                type: "user",
                ...altData,
                email: user.email,
              });
            } else {
              // Still no profile found — create minimal profile from auth data
              setProfile({
                type: "user",
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
                last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
                status: "approved",
                created_at: user.created_at,
              });
            }
          } else {
            setProfile({
              type: "user",
              ...userData,
              email: user.email,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100= text-green-700">
            <CheckCircle className="w-3 h-3" />
            Approved
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
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rejected
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
          <button
            onClick={() => navigate("/home")}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  from-blue-50 to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white">
            <div className="flex items-center gap-6">
              {/* Avatar Placeholder */}
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                {profile?.id_image_url ? (
                  <img
                    src={profile.id_image_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {profile?.first_name} {profile?.middle_name} {profile?.last_name}
                </h1>
                <p className="text-white/80 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {profile?.type === "admin" ? "Administrator" : "Resident"}
                </p>
                <div className="mt-2">
                  {getStatusBadge(profile?.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Account Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-gray-800 font-medium">{profile?.email}</p>
                </div>
              </div>

              {/* Full Name */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</p>
                  <p className="text-gray-800 font-medium">
                    {profile?.first_name} {profile?.middle_name} {profile?.last_name}
                  </p>
                </div>
              </div>

              {/* Age */}
              {profile?.age && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</p>
                    <p className="text-gray-800 font-medium">{profile.age} years old</p>
                  </div>
                </div>
              )}

              {/* Birthdate */}
              {profile?.birthdate && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Birthdate</p>
                    <p className="text-gray-800 font-medium">{profile.birthdate}</p>
                  </div>
                </div>
              )}

              {/* Mobile Number */}
              {profile?.mobile_number && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</p>
                    <p className="text-gray-800 font-medium">{profile.mobile_number}</p>
                  </div>
                </div>
              )}

              {/* Address */}
              {profile?.address && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                    <p className="text-gray-800 font-medium">{profile.address}</p>
                  </div>
                </div>
              )}

              {/* ID Number */}
              {profile?.id_number && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <IdCard className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Number</p>
                    <p className="text-gray-800 font-medium">{profile.id_number}</p>
                  </div>
                </div>
              )}

              {/* Account Type */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Type</p>
                  <p className="text-gray-800 font-medium">
                    {profile?.type === "admin" ? "Administrator" : "Regular User"}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Since</p>
                  <p className="text-gray-800 font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* ID Image Preview */}
            {profile?.id_image_url && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  Submitted ID
                </h3>
                <img
                  src={profile.id_image_url}
                  alt="Submitted ID"
                  className="w-full max-w-md rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {profile?.type === "user" && (
                <button
                  onClick={() => navigate("/settings")}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg"
                >
                  Edit Profile
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;