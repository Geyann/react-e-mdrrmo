import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import imgLogo from '../Images/logo.png';
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft, Users } from 'lucide-react';

const StaffRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_id: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    role: 'staff',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // SHA-256 hash function (must match login)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackerai-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const { user_id, email, password, confirmPassword, fullName, department, role } = formData;

    if (!user_id || !email || !password || !confirmPassword || !fullName) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (user_id.length < 3) {
      setError('Work ID must be at least 3 characters.');
      return;
    }

    setLoading(true);

    try {
      // Check if user_id or email already exists
      const { data: existingUserId } = await supabase
        .from('staff_users')
        .select('user_id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (existingUserId) {
        throw new Error('Work ID is already registered. Please use a different ID.');
      }

      const { data: existingEmail } = await supabase
        .from('staff_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error('Email is already registered. Please use a different email.');
      }

      const hashedPassword = await hashPassword(password);

      const { error: insertError } = await supabase
        .from('staff_users')
        .insert([{
          user_id: user_id,
          email: email,
          password: hashedPassword,
          full_name: fullName,
          role: role,
          department: department,
          is_active: true,
        }]);

      if (insertError) {
        if (insertError.message?.includes('user_id')) {
          throw new Error('Work ID is already taken. Please choose another.');
        }
        if (insertError.message?.includes('email')) {
          throw new Error('Email is already registered.');
        }
        throw new Error(insertError.message);
      }

      alert(`${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully! You can now log in with your Work ID.`);
      navigate('/admin/login');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50";
  const labelClass = "text-sm font-bold text-gray-700";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/admin/login')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-purple-400 transition font-semibold z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Login
      </button>

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
          <img src={imgLogo} className="w-22 h-20 mx-auto text-white mb-2" alt="logo" />
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Shield className="w-6 h-6" />
            Staff &amp; Admin Registration
          </h2>
          <p className="text-purple-200 text-sm mt-1">Create a new account</p>
        </div>

        {/* Body */}
        <form onSubmit={handleRegister} className="p-8 flex flex-col gap-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Work ID (user_id) - Primary login field */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <Users className="w-4 h-4 inline mr-1 text-purple-600" />
              Work ID Number
            </label>
            <input
              className={inputClass}
              name="user_id"
              type="text"
              placeholder="Enter your assigned Work ID (used for login)"
              value={formData.user_id}
              onChange={handleChange}
              required
              minLength={3}
            />
            <p className="text-xs text-gray-400 mt-1">
              This will be your <span className="font-semibold">primary login identifier</span>
            </p>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <User className="w-4 h-4 inline mr-1 text-purple-600" />
              Full Name
            </label>
            <input
              className={inputClass}
              name="fullName"
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <Mail className="w-4 h-4 inline mr-1 text-purple-600" />
              Email Address
            </label>
            <input
              className={inputClass}
              name="email"
              type="email"
              placeholder="you@emdrrmo.gov"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Department</label>
            <input
              className={inputClass}
              name="department"
              type="text"
              placeholder="e.g. IT, Operations, Admin"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <Shield className="w-4 h-4 inline mr-1 text-purple-600" />
              Role
            </label>
            <select
              className={inputClass}
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <Lock className="w-4 h-4 inline mr-1 text-purple-600" />
              Password
            </label>
            <div className="relative">
              <input
                className={`${inputClass} pr-12`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
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

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              <Lock className="w-4 h-4 inline mr-1 text-purple-600" />
              Confirm Password
            </label>
            <div className="relative">
              <input
                className={`${inputClass} pr-12`}
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Account...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Register {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pb-6 text-center">
          <span className="text-sm text-gray-500">Already have an account?</span>
          <button
            onClick={() => navigate('/admin/login')}
            className="ml-1 text-purple-600 font-bold hover:text-purple-700 hover:underline transition"
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffRegister;