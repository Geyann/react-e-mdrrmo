import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { Clock, User, Mail, Phone, MapPin, AlertCircle, CheckCircle, XCircle, ArrowLeft, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
          navigate('/login');
          return;
        }

        const currentUser = JSON.parse(storedUser);
        const userEmail = currentUser.email;

        // Try querying by multiple possible column names
        let { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("email", userEmail)
          .order("created_at", { ascending: false });

        // Fallback: try user_id column
        if (!data || data.length === 0) {
          const { data: data2, error: err2 } = await supabase
            .from("appointments")
            .select("*")
            .eq("user_id", currentUser.id || currentUser.user_id)
            .order("created_at", { ascending: false });
          
          if (!err2) data = data2;
        }

        // Fallback: try userId column
        if (!data || data.length === 0) {
          const { data: data3, error: err3 } = await supabase
            .from("appointments")
            .select("*")
            .eq("userId", currentUser.id || currentUser.user_id)
            .order("created_at", { ascending: false });
          
          if (!err3) data = data3;
        }

        if (error && !data) {
          console.error("Supabase error:", error);
          setError("Failed to load appointments.");
        } else {
          setAppointments(data || []);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [navigate]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "confirmed":
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Confirmed</span>;
      case "pending":
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      case "cancelled":
      case "rejected":
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status || "Unknown"}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen ">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto">

 <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-5xl mx-auto bg-white rounded-t-3xl shadow-xl border border-gray-200">
        <div className="flex flex-col items-center mb-3 pt-5 ">
        <CalendarDays className="w-15 h-auto text-white" />
          <h1 className="text-3xl text-white font-bold "> My Appointments</h1>
            <p className="text-white/80 text-sm ">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found</p>
         
        </div>
      </div>

          <div className="p-10  bg-white rounded-b-3xl shadow-xl border border-t-transparent border-gray-200">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {appointments.length === 0 && !error ? (
              <div className="text-center py-16">
                <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-500">No Appointments Yet</h3>
                <p className="text-gray-400 mt-2">Book your first appointment to get started.</p>
                <button onClick={() => navigate('/book-appointment')} className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg">
                  Book Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id} className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(appt.appointment_date || appt.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                          <span className="mx-1">|</span>
                          <Clock className="w-4 h-4" />
                          {appt.appointment_time || appt.time || "N/A"}
                        </div>
                        {appt.service && (
                          <p className="font-bold text-gray-800">{appt.service}</p>
                        )}
                        {appt.notes && (
                          <p className="text-sm text-gray-500 italic">{appt.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(appt.status)}
                        {appt.doctor_name && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> {appt.doctor_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
};

export default MyAppointments;