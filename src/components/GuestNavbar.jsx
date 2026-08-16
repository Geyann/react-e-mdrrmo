import { Link } from 'react-router-dom';
import imgLogo from '../Images/icon.png';

export default function GuestNavbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 w-full border-b border-gray-500 bg-gradient-to-r from-blue-600 to-purple-600 p-2">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="z-50">
          <img src={imgLogo} alt="logo" className="w-16 h-12" />
        </Link>

        {/* Desktop Links */}
        <div className="flex items-center gap-6">
          <Link
            to="/login"
            className="group relative inline-block px-4 py-2 text-lg font-semibold text-white uppercase transition-colors"
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-gray-800">
              Log in
            </span>
            <span className="absolute top-[2px] left-0 h-full w-full origin-top scale-0 rounded-md bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
          </Link>
        </div>
      </div>
    </header>
  );
}