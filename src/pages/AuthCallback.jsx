import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError('Failed to complete authentication.');
        return;
      }

      const session = data?.session;
      if (!session) {
        setError('No session found.');
        return;
      }

      const userId = session.user.id;

      // Check if this user has a pending_registrations record
      const { data: registration, error: regError } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      if (regError) {
        console.error('Error checking registration:', regError);
      }

      if (!registration) {
        // OAuth user with no registration — send to OAuth-specific form
        navigate('/register/oauth', { 
          state: { 
            message: 'Please complete your profile to verify your account.' 
          } 
        });
        return;
      }

      if (registration.status === 'pending') {
        await supabase.auth.signOut();
        navigate('/login', { 
          state: { error: 'Your account is pending admin approval.' } 
        });
        return;
      }

      if (registration.status === 'rejected') {
        await supabase.auth.signOut();
        navigate('/login', { 
          state: { error: 'Your registration was rejected.' } 
        });
        return;
      }

      // Approved — go to home
      navigate('/home');
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Authentication Failed</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-semibold">Completing authentication...</p>
      </div>
    </div>
  );
}