import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../createClient';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton({ className = "", variant = "default", children }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoading(true);
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error.message);
      setLoading(false);
      return;
    }

    // Clear any local state / redirect to login
    navigate('/login', { replace: true });
  };

  // Default button styling
  if (variant === "default") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        {children || "Logout"}
      </button>
    );
  }

  // Minimal link-style (for navbars, etc.)
  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`flex items-center gap-2 text-gray-600 hover:text-red-600 transition disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      {children || "Logout"}
    </button>
  );
}