import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../createClient';
import imgLogo from '../Images/logo.png';
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft, Check } from 'lucide-react';

const StaffRegister = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword || !firstName || !lastName) {
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

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
            department: department,
          },
        },
      });

      if (authError) throw authError;

      if (!authData?.user) {
        throw new Error('Failed to create user account.');
      }

      // Insert into staff_users
      const { error: staffInsertError } = await supabase
        .from('staff_users')
        .insert([{
          user_id: authData.user.id,
          email: email,
          full_name: `${firstName} ${lastName}`,
          role: role,
          department: department,
          is_active: true,
        }]);

      if (staffInsertError) {
        console.warn('staff_users insert failed, trying profiles:', staffInsertError.message);
        
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: email,
            full_name: `${firstName} ${lastName}`,
            role: role,
            department: department,
            is_active: true,
          }]);

        if (profileInsertError) {
          console.error('Profile insert also failed:', profileInsertError);
        }
      }

      const needsConfirmation = authData.session === null;

      if (needsConfirmation) {
        alert(`Registration initiated! Please check ${email} to confirm your account before logging in.`);
      } else {
        alert(`${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully! You can now log in.`);
      }

      navigate('/admin/login');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
          <img src={imgLogo} className="w-22 h-20 mx-auto text-white mb-2" />
          <h2 className="text-2xl font-bold text-white">Staff &amp; Admin Registration</h2>
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

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-700">
                <User className="w-4 h-4 inline mr-1 text-purple-600" />
                First Name
              </label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-700">
                <User className="w-4 h-4 inline mr-1 text-purple-600" />
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">
              <Mail className="w-4 h-4 inline mr-1 text-purple-600" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@emdrrmo.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
            />
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">
              Department
            </label>
            <input
              type="text"
              placeholder="e.g. IT, Operations, Admin"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
            />
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">
              <Shield className="w-4 h-4 inline mr-1 text-purple-600" />
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">
              <Lock className="w-4 h-4 inline mr-1 text-purple-600" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
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
            <label className="text-sm font-bold text-gray-700">
              <Lock className="w-4 h-4 inline mr-1 text-purple-600" />
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-gray-50"
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
                
                Register {role.charAt(0).toUpperCase() + role.slice(1)}
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