import { useState } from "react";
import { redirect, useNavigate } from "react-router-dom";
import { supabase } from "../createClient"; 
import imlogo from '../Images/icon.png';

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();

   
      const { data, error } = await supabase.auth.signInWithPassword({
      email : email,
      password : password,
    });

      if (error) {
        alert(error.message);
        
      } else {
        console.log("Login successful:", data);
        navigate("/home"); 
      }
    
  };

  return (
    
  <div className="access-portal-container"> 
    <img src={imlogo} alt="logo" />
    <form onSubmit={handleLogin}>
       
      <h2>User Login</h2>
      <br />
      <label htmlFor="email" style={{textAlign:"left", fontWeight:"bold"}}>Email Address: </label>
      <input 
        className="portal-input-field"
        type="email" 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your@email.com" 
      />
      <label htmlFor="password" style={{textAlign:"left" , fontWeight:"bold"}}>Password: </label>
      <input 
        className="portal-input-field"
        type="password" 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="***********" 
      />
     
      <button className="btn-execute-login" type="submit">
        Execute Login
      </button>
       
    </form>
    <br />
    <a href="" className="btn-execute-login" 
    style={{
      textDecoration:"none",
      padding:"10px 121px",
      background:"#ffff",
      color:"black",
      fontWeight:"bold",
      }}>Create New Account</a>
    <a href="" className="portal-link">Forgot password?</a>
  </div>
  );
};

export default LoginPage;