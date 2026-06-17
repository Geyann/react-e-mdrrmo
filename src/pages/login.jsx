import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../createClient";
import imlogo from '../Images/icon.png';
// Add your background image import here if it's in your src folder
// import bgImage from '../Images/your-background.jpg'; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      navigate("/home");
    }
  };

  return (
    // Outer container acts as the full-screen background
    // Replace 'bg-gray-100' with 'bg-[url("/path-to-image.jpg")]' or an inline style
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center p-4" 
         style={{ backgroundImage: "url('/path-to-your-background-image.jpg')" }}>
      
      {/* Overlay to ensure the form is readable against the background */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center gap-6">
          <img src={imlogo} alt="logo" className="w-50 h-40 object-contain" />
          <h2 className="text-3xl font-bold text-gray-800">User Login</h2>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-gray-700">Email Address</label>
              <input 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                type="email" 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your@email.com" 
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-gray-700">Password</label>
              <input 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                type="password" 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="***********" 
                required
              />
            </div>

            <button className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg" type="submit">
              Login
            </button>
          </form>
          <div className="w-full flex flex-col gap-3 mt-4">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-white px-2 text-gray-500">Or continue with</span>
    </div>
  </div>

  <button 
    type="button"
    className="w-full flex items-center justify-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
  >
    {/* You can add your Google icon image here */}
    Continue with Google
  </button>

  <button 
    type="button"
    className="w-full flex items-center justify-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
  >
    {/* You can add your Facebook icon image here */}
    Continue with Facebook
  </button>
</div>

          <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
            <Link to="/register" className="hover:text-blue-600 font-bold hover:underline transition">Create New Account</Link>
            <a href="#" className="hover:text-blue-600 font-bold hover:underline transition">Forgot password?</a>
          </div>
          
        </div>
      </div>
    </div>
  );
}