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