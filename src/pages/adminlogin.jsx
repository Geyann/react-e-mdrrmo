import { useState } from 'react';
import { supabase } from '../createClient';
import { useNavigate, Link } from 'react-router-dom'; 
import imlogo from '../Images/icon.png';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    // 2. Check if the user is an Admin in your 'profiles' table.
    // Note: server-side RLS policies should also protect admin-only data.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      setError('Error checking user role.');
      await supabase.auth.signOut();
      return;
    }

    if (profile?.role === 'admin') {
      alert("Welcome, Admin!");
      navigate('/admin/dashboard'); // Send them to the secret area
    } else {
      await supabase.auth.signOut(); // Kick them out if they aren't an admin
      setError("Access Denied: You are not an authorized administrator.");
      navigate('/'); // Redirect back to regular login
    }
  };

  return (
    <div className='access-portal-container' style={{marginTop:"-170px"}}>
        <img id='loginimg' src={imlogo} alt="logo" />
      <h2>Admin Login</h2>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <form onSubmit={handleAdminSignIn}>
        <label htmlFor="email" style={{textAlign:"left", fontWeight:"bold"}}>Email Address: </label>
        <input 
          className='portal-input-field'
          type="email" 
          placeholder="admin@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)} 
        />
        <br />
        <label htmlFor="password" style={{textAlign:"left", fontWeight:"bold"}}>Password: </label>
        <input 
          className='portal-input-field'
          type="password" 
          placeholder="***********" 
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
        />
        <br />
        <button type="submit" className='btn-execute-login'>Login as Admin</button>
      </form>
    </div>
  );
}