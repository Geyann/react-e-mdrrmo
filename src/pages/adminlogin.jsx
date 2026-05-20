import { useState } from 'react';
import { supabase } from '../createClient';
<<<<<<< HEAD
import { useNavigate, Link } from 'react-router-dom'; 
=======
import { useNavigate } from 'react-router-dom'; 
import { Link } from 'react-router-dom';
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
import imlogo from '../Images/icon.png';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
<<<<<<< HEAD
  const [error, setError] = useState('');
=======
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
  const navigate = useNavigate();

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    setError('');
=======
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d

    // 1. Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

<<<<<<< HEAD
    if (authError) {
      setError(authError.message);
      return;
    }

    // 2. Check if the user is an Admin in your 'profiles' table.
    // Note: server-side RLS policies should also protect admin-only data.
=======
    if (authError) return alert(authError.message);

    // 2. Check if the user is an Admin in your 'profiles' table
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

<<<<<<< HEAD
    if (profileError) {
      setError('Error checking user role.');
      await supabase.auth.signOut();
      return;
    }

=======
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
    if (profile?.role === 'admin') {
      alert("Welcome, Admin!");
      navigate('/admin/dashboard'); // Send them to the secret area
    } else {
      await supabase.auth.signOut(); // Kick them out if they aren't an admin
<<<<<<< HEAD
      setError("Access Denied: You are not an authorized administrator.");
=======
      alert("Access Denied: You are not an authorized administrator.");
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
      navigate('/'); // Redirect back to regular login
    }
  };

  return (
    <div className='access-portal-container' style={{marginTop:"-170px"}}>
        <img id='loginimg' src={imlogo} alt="logo" />
      <h2>Admin Login</h2>
<<<<<<< HEAD
      {error && <p style={{color: 'red'}}>{error}</p>}
      <form onSubmit={handleAdminSignIn}>
        <label htmlFor="email" style={{textAlign:"left", fontWeight:"bold"}}>Email Address: </label>
        <input 
          className='portal-input-field'
          type="email" 
          placeholder="admin@email.com" 
          value={email}
=======
      <form  onSubmit={handleAdminSignIn}>
        <label htmlFor="email" style={{textAlign:"left", fontWeight:"bold"}}>Email Address: </label>
        <input 
        className='portal-input-field'
          type="email" 
          placeholder="admin@email.com" 
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
          onChange={(e) => setEmail(e.target.value)} 
        />
        <br />
        <label htmlFor="password" style={{textAlign:"left", fontWeight:"bold"}}>Password: </label>
        <input 
<<<<<<< HEAD
          className='portal-input-field'
          type="password" 
          placeholder="***********" 
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
        />
        <br />
        <button type="submit" className='btn-execute-login'>Login as Admin</button>
=======
        className='portal-input-field'
          type="password" 
          placeholder="***********" 
          onChange={(e) => setPassword(e.target.value)} 
        /><button type="submit" className='btn-execute-login'>Login as Admin</button>
>>>>>>> 069ec22db9121d0fa171a5c361c57358f0b5703d
      </form>
    </div>
  );
}