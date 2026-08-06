import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { setError('Failed to complete authentication.'); return; }

      const session = data?.session;
      if (!session) { setError('No session found.'); return; }

      const userId = session.user.id;

      // Lookup by user_id FIRST (how OAuth rows are linked), fall back to id.
      let registration = null;
      const { data: byUserId } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (byUserId) {
        registration = byUserId;
      } else {
        const { data: byId } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        registration = byId;
      }

      if (!registration) {
        // Brand-new OAuth user -> pre-filled profile form
        navigate('/register/oauth', {
          state: { message: 'Please complete your profile to verify your account.' }
        });
        return;
      }

      if (registration.status === 'pending') {
        await supabase.auth.signOut();
        navigate('/login', { state: { message: 'Your registration is still pending admin approval.' } });
        return;
      }

      if (registration.status === 'rejected') {
        await supabase.auth.signOut();
        navigate('/login', { state: { error: 'Your registration was rejected by the admin.' } });
        return;
      }

      // Approved -> write localStorage session so ProtectedRoute/Home accept it
      localStorage.setItem('currentUser', JSON.stringify({
        id: registration.id,
        username: registration.username,
        email: registration.email,
        full_name: `${registration.first_name} ${registration.middle_name || ''} ${registration.last_name}`,
        first_name: registration.first_name,
        middle_name: registration.middle_name,
        last_name: registration.last_name,
        role: registration.role || 'user',
        status: registration.status,
        user_id: registration.user_id || userId
      }));

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