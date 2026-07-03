import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      alert('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
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
            role: 'admin',
          },
        },
      });

      if (authError) throw authError;

      if (authData?.user) {
        // Also insert into admin_users table
        const { error: adminInsertError } = await supabase
          .from('admin_users')
          .insert([{
            id: authData.user.id,
            email: email,
            full_name: `${firstName} ${lastName}`,
            role: 'admin'
          }]);

        if (adminInsertError) {
          console.error('Admin insert error:', adminInsertError);
        }

        const isEmailConfirmationRequired = authData.session === null;

        if (isEmailConfirmationRequired) {
          alert('Admin account initiated! Please check your email to confirm registration.');
        } else {
          alert('Admin account created successfully! Redirecting...');
        }
        
        navigate('/login');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Create Admin Account</h2>
          <p className="text-purple-200 text-sm mt-1">Register a new administrator</p>
        </div>

        <form onSubmit={handleRegister} className="p-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-700">First Name:</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-700">Last Name:</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">Email Address:</label>
            <input
              type="email"
              placeholder="admin@emdrrmo.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">Password:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">Confirm Password:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating Admin Account...' : 'Register Admin'}
          </button>
        </form>

        <div className="pb-6 text-center">
          <span className="text-sm text-gray-500">Already have an admin account?</span>
          <button
            onClick={() => navigate('/login')}
            className="ml-1 text-purple-600 font-bold hover:text-purple-700 hover:underline transition"
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;