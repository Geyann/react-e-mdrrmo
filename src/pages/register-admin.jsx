<<<<<<< HEAD
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
      // 1. Sign up user and inject the 'admin' role directly into raw_user_meta_data
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin', // Passed securely to user metadata
          },
        },
      });

      if (authError) throw authError;

      if (authData?.user) {
        // Check if user needs to confirm email or if they are auto-logged in
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
    <div>
      <div>
        <div>
          <div><span>E</span></div>
          <h2>Create Admin Account</h2>
        </div>

        <form onSubmit={handleRegister}>
          <div>
            <div>
              <label>First Name:</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label>Last Name:</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label>Email Address:</label>
            <input
              type="email"
              placeholder="admin@emdrrmo.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label>Password:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label>Confirm Password:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Admin Account...' : 'Register Admin'}
          </button>
        </form>

        <div>
          <span>Already have an admin account?</span>
          <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
=======
import { useState } from 'react';
import { supabase } from '../createClient';
import imlogo from '../Images/icon.png';

export default function CreateAdminAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create the user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      alert(signUpError.message);
    } else if (data.user) {
      // 2. Add the 'admin' role to the profiles table for this new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { id: data.user.id, email: email, role: 'admin' }
        ]);

      if (profileError) {
        alert("Account created, but failed to set admin role: " + profileError.message);
      } else {
        alert("Admin account created successfully! Please check your email for verification.");
      }
    }
    setLoading(false);
  };

  return (
    <div className='access-portal-container'>
        <img src={imlogo} alt="" />
      <h3>Register New Admin</h3>
      <form onSubmit={handleAdminSignUp}>
        <div style={{ marginBottom: '10px' }}>
          <label>Admin Email:</label><br />
          <input 
          className='portal-input-field'
            type="email" 
            placeholder='Admin Email'
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        
          <input 
          className='portal-input-field'
            type="password"
            placeholder='Password' 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button className='btn-execute-login' type="submit" disabled={loading} to='/admin'>
          {loading ? 'Creating...' : 'Register Admin'}
        </button>
      </form>
    </div>
  );
}
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
