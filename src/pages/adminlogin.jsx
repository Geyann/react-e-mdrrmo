import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import imlogo from '../Images/icon.png';
import { Shield, Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff, Users } from 'lucide-react';

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // SHA-256 hash function (must match registration)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackerai-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const hashedPassword = await hashPassword(password);

      const isEmail = identifier.includes('@');
      let user = null;

      // Look up in staff_users by email or user_id (work ID)
      if (isEmail) {
        const { data, error: lookupError } = await supabase
          .from('staff_users')
          .select('*')
          .eq('email', identifier)
          .maybeSingle();

        if (lookupError) throw new Error(lookupError.message);
        user = data;
      } else {
        // Identifier is their user_id (work ID number)
        const { data, error: lookupError } = await supabase
          .from('staff_users')
          .select('*')
          .eq('user_id', identifier)
          .maybeSingle();

        if (lookupError) throw new Error(lookupError.message);
        user = data;
      }

      if (!user) {
        setError(
          isEmail
            ? 'Email not found. Please check your email or contact admin.'
            : 'Work ID not found. Please check your ID or contact admin.'
        );
        return;
      }

      // Verify password hash
      if (user.password !== hashedPassword) {
        // Fallback: try without salt
        const encoder = new TextEncoder();
        const dataNoSalt = encoder.encode(password);
        const hashBufferNoSalt = await crypto.subtle.digest('SHA-256', dataNoSalt);
        const hashNoSalt = Array.from(new Uint8Array(hashBufferNoSalt))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        if (user.password !== hashNoSalt) {
          setError('Incorrect password. Please try again.');
          return;
        }
      }

      // Check if account is active
      if (!user.is_active) {
        setError('Access Denied: Your account has been deactivated. Contact your administrator.');
        return;
      }

      // Store session in localStorage (same pattern as reference LoginPage)
      localStorage.setItem('currentStaff', JSON.stringify({
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
        created_at: user.created_at,
      }));

      // Route based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'moderator') {
        navigate('/moderator/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailInput = identifier.includes('@');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-purple-400 transition font-semibold z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
            <img
              src={imlogo}
              alt="logo"
              className="w-24 h-24 object-contain mx-auto mb-4 bg-indigo-600 rounded-full p-2 shadow-lg"
            />
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              Admin &amp; Staff Portal
            </h2>
            <p className="text-purple-200 text-sm mt-1">Authorized personnel only</p>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignIn} className="flex flex-col gap-5">
              {/* Identifier Field (Work ID or Email) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="text-sm font-bold text-gray-700">
                  {isEmailInput ? (
                    <Mail className="w-4 h-4 inline mr-1 text-purple-600" />
                  ) : (
                    <Users className="w-4 h-4 inline mr-1 text-purple-600" />
                  )}
                  Work ID or Email
                </label>
                <input
                  id="identifier"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
                  type="text"
                  placeholder="Enter your Work ID or email address"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use your <span className="font-semibold">Work ID number</span> or <span className="font-semibold">email address</span>
                </p>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-bold text-gray-700">
                  <Lock className="w-4 h-4 inline mr-1 text-purple-600" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    VERIFYING...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Login
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Regular user?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-purple-600 font-bold hover:text-purple-700 hover:underline transition"
                >
                  User Login
                </button>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                No account yet?{' '}
                <button
                  onClick={() => navigate('/admin/register')}
                  className="text-purple-600 font-bold hover:text-purple-700 hover:underline transition"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}