import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../createClient";
import imlogo from '../Images/icon.png';
import { 
  User, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft 
} from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // ---- SHA-256 hash (legacy registration used this + a hardcoded salt) ----
  const hashPassword = async (password, salt = 'hackerai-salt-2024') => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ---- Store session in the same shape ProtectedRoute/Navbar expect ----
  const storeSession = (user) => {
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim(),
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      role: user.role || 'user',
      status: user.status,
      user_id: user.user_id || user.id,
    }));
  };

  // ---- Legacy lookup on pending_registrations ----
  const lookupLegacyUser = async (identifier) => {
    const isEmail = identifier.includes('@');
    const column = isEmail ? 'email' : 'username';
    const { data, error } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq(column, identifier)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };

  // ---- Try to migrate a legacy user INTO Supabase Auth on successful login ----
  const migrateToSupabase = async (user, plainPassword) => {
    try {
      // Create the auth user if they don't already have one
      const { data: existing } = await supabase.auth.admin
        ? await supabase.auth.admin.getUserById(user.user_id)
        : { data: null };

      if (!existing?.user) {
        // Only works server-side with service_role — skip silently in browser
        return;
      }
    } catch {
      // Browser lacks admin permission — migration handled by backend script.
      // Login still works via the legacy path below.
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const hashedPassword = await hashPassword(password);

      // ---------- PATH 1: Supabase Auth (migrated / OAuth users) ----------
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: identifier.includes('@') ? identifier : `${identifier}@placeholder.invalid`,
        password,
      });

      // If Supabase authenticated them, use the session directly
      if (authData?.session && !authError) {
        const meta = authData.user?.user_metadata || {};
        // Pull the legacy profile if one exists for this email
        let legacy = null;
        if (authData.user?.email) {
          legacy = await lookupLegacyUser(authData.user.email).catch(() => null);
        }

        storeSession({
          id: authData.user.id,
          username: meta.username || legacy?.username || authData.user.email?.split('@')[0],
          email: authData.user.email,
          first_name: meta.first_name || legacy?.first_name || '',
          middle_name: meta.middle_name || legacy?.middle_name || '',
          last_name: meta.last_name || legacy?.last_name || '',
          role: meta.role || legacy?.role || 'user',
          status: 'approved',
          user_id: authData.user.id,
        });
        navigate("/home");
        return;
      }

      // ---------- PATH 2: Legacy users in pending_registrations ----------
      const user = await lookupLegacyUser(identifier);

      if (!user) {
        setError(
          identifier.includes('@')
            ? "Email not found. Please check your email or create an account."
            : "Username not found. Please check your username or create an account."
        );
        return;
      }

      // Compare salted hash, then unsalted as a fallback
      const matches = 
        user.password === hashedPassword ||
        user.password === await hashPassword(password, '');

      if (!matches) {
        setError("Incorrect password. Please try again.");
        return;
      }

      // Account status gates
      if (user.status === 'pending') {
        setError("Your account is still pending admin approval. Please wait for confirmation.");
        return;
      }
      if (user.status === 'rejected') {
        setError("Your registration was rejected by the admin. Please contact support.");
        return;
      }
      if (user.status !== 'approved') {
        setError("Unable to login. Unknown account status.");
        return;
      }

      // Migrate silently in the background (best-effort)
      if (!user.user_id) {
        migrateToSupabase(user, password); // non-blocking
      }

      storeSession(user);
      navigate("/home");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
      // Browser redirects to Google — no navigation needed here
    } catch (err) {
      setError(err.message || "Google login failed. Please try again.");
      setGoogleLoading(false);
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
                disabled={loading || googleLoading}
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full border border-gray-300 rounded-xl py-3 font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {googleLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.1a7.06 7.06 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
</svg>
              )}
              Continue with Google
            </button>

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