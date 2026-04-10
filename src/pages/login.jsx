import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient"; // Siguraduhing tama ang path

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // Hook para sa pag-redirect

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert("Maling email o password: " + error.message);
      } else {
        // SUCCESS: Dito na natin siya papapuntahin sa Home Page
        console.log("Login successful:", data);
        navigate("/home"); 
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  return (
    <div >
      <form  onSubmit={handleLogin}>
        <h2>Login</h2>
        <label htmlFor="email">Username: </label>
        <input 
          type="email" 
          placeholder="your@email.com" 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        /> <br />
        <br />
        <label htmlFor="password">Password: </label>
        <input 
          type="password" 
          placeholder="********" 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <br />
        <br />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default LoginPage;