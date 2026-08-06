import { Link, useNavigate } from 'react-router-dom';
import imgLogo from '../Images/icon.png';
import { supabase } from '../createClient';

export default function GuestNavbar() {
  const navigate = useNavigate();          // <-- ADDED: was used but never created

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.clear();
      navigate('/admin');
    }
  };

  return (
    <header className="absolute bg-gradient-to-r from-blue-600 to-purple-600 inset-x-0 top-0 z-50 w-full p-4 border-b border-gray-500">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="z-50">
          <img src={imgLogo} alt="logo" className="w-16 h-12" />
        </Link>

        {/* Desktop Links */}
        <div className="flex items-center gap-6">
          <Link
            to="/login"
            className="group text-white relative inline-block px-4 py-2 text-lg font-semibold uppercase transition-colors"
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-800">
              Log in
            </span>
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 rounded-md" />
          </Link>
        </div>
      </div>
    </header>
  );
}