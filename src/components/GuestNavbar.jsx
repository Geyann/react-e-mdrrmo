import {
  Link,
  useLocation,
} from "react-router-dom";
import {
  LogIn,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import imgLogo from "../Images/logo.png";

export default function GuestNavbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[1000] h-16 border-b border-white/20 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 shadow-xl shadow-purple-950/15">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
          {/* Brand */}
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <img
                src={imgLogo}
                alt="MDRRMO logo"
                className="h-10 w-10 object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white sm:text-base">
                SafeResponse
              </p>

             
            </div>
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-2 md:flex">
          

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-purple-700 shadow-lg transition hover:bg-blue-50"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() =>
              setMenuOpen((open) => !open)
            }
            aria-label={
              menuOpen
                ? "Close public menu"
                : "Open public menu"
            }
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Close public menu overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 top-16 z-[1010] bg-slate-950/65 backdrop-blur-sm md:hidden"
        />
      )}

      {menuOpen && (
        <nav className="fixed left-3 right-3 top-[4.5rem] z-[1020] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-blue-600 to-purple-700 p-3 shadow-2xl md:hidden">
         

          <Link
            to="/register"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            <UserPlus className="h-5 w-5" />
            Create Account
          </Link>

          <Link
            to="/login"
            className="mt-1 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-black text-purple-700 shadow-lg"
          >
            <LogIn className="h-5 w-5" />
            Login
          </Link>

          <div className="mt-2 flex items-center gap-2 border-t border-white/15 px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">
            <ShieldCheck className="h-4 w-4" />
            Public Safety Information
          </div>
        </nav>
      )}
    </>
  );
}
