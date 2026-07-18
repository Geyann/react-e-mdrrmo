import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../createClient";
import imlogo from '../Images/icon.png';
import { User, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // SHA-256 hash function
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackerai-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const hashedPassword = await hashPassword(password);

      // Determine if input is an email (contains @) or username
      const isEmail = identifier.includes('@');
      let user = null;

      if (isEmail) {
        const { data, error: lookupError } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('email', identifier)
          .maybeSingle();

        if (lookupError) throw new Error(lookupError.message);
        user = data;
      } else {
        const { data, error: lookupError } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('username', identifier)
          .maybeSingle();

        if (lookupError) throw new Error(lookupError.message);
        user = data;
      }

      if (!user) {
        setError(
          isEmail 
            ? "Email not found. Please check your email or create an account."
            : "Username not found. Please check your username or create an account."
        );
        setLoading(false);
        return;
      }

      // --- DEBUG: Log password comparison ---
      console.log("Stored password hash:", user.password);
      console.log("Computed hash:", hashedPassword);
      console.log("Match:", user.password === hashedPassword);

      // Verify password hash
      if (user.password !== hashedPassword) {
        // Also try without salt as fallback (in case registration used different method)
        const encoder = new TextEncoder();
        const dataNoSalt = encoder.encode(password);
        const hashBufferNoSalt = await crypto.subtle.digest('SHA-256', dataNoSalt);
        const hashNoSalt = Array.from(new Uint8Array(hashBufferNoSalt))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log("Hash without salt:", hashNoSalt);
        console.log("Match without salt:", user.password === hashNoSalt);

        if (user.password !== hashNoSalt) {
          setError("Incorrect password. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Check account status
      if (user.status === 'pending') {
        setError("Your account is still pending admin approval. Please wait for confirmation.");
        setLoading(false);
        return;
      }

      if (user.status === 'rejected') {
        setError("Your registration was rejected by the admin. Please contact support.");
        setLoading(false);
        return;
      }

      if (user.status === 'approved') {
        // Store user session
        localStorage.setItem('currentUser', JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          role: user.role || 'user',
          status: user.status,
          user_id: user.user_id
        }));

        navigate("/home");
        return;
      } else {
        setError("Unable to login. Unknown account status.");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isEmailInput = identifier.includes('@');

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-purple-600 transition font-semibold z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
            <img src={imlogo} alt="logo" className="w-25 h-25 object-contain mx-auto mb-4 bg-indigo-600 rounded-4xl p-2 shadow-lg" />
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <LogIn className="w-6 h-6" />
              User Login
            </h2>
            <p className="text-blue-200 text-sm mt-1">Sign in with your username or email</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="text-sm font-bold text-gray-700">
                  {isEmailInput ? (
                    <Mail className="w-4 h-4 inline mr-1 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 inline mr-1 text-blue-600" />
                  )}
                  Username or Email
                </label>
                <input 
                  id="identifier"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50"
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter username or email address"
                  required
                  autoComplete="username"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use your <span className="font-semibold">username</span> or <span className="font-semibold">email address</span> to login
                </p>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-bold text-gray-700">
                  <Lock className="w-4 h-4 inline mr-1 text-blue-600" />
                  Password
                </label>
                <div className="relative">
                  <input 
                    id="password"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50"
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" 
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    LOGGING IN...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Login
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}