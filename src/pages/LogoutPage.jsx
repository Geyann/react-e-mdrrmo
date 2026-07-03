import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import { LogOut } from 'lucide-react';

export default function LogoutPage() {
  const [status, setStatus] = useState('logging-out');
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      // Clear any other local storage / state
      setStatus('logged-out');
      
      // Redirect after a brief moment
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    };

    logout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md text-center">
        {status === 'logging-out' ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <h2 className="text-xl font-bold text-gray-800 mt-6">Logging out...</h2>
            <p className="text-gray-500 mt-2">Please wait while we sign you out.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mt-6">Logged Out Successfully</h2>
            <p className="text-gray-500 mt-2">You have been signed out of your account.</p>
            <p className="text-gray-400 text-sm mt-1">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}