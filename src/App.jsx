import React from 'react'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Report from './pages/Report'
import Navbar from './components/navbar'
import Admin from './pages/Admin'
import Borrow from './pages/Borrow'
import Appointment from './pages/appointment'
import CheckUp from './pages/CheckUp'
import LoginPage from './pages/login'
import Adminlogin from './pages/adminlogin'
import RegisterAdmin from './pages/register-admin'
import AdminNavbar from './components/adminNavbar'

function App() {
  // Kunin ang kasalukuyang path/URL
  const location = useLocation();
  const ProtectedAdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);

  // Run a check when the component loads
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
      setIsAdmin(data?.role === 'admin');
    }
    checkRole();
  }, []);

  if (isAdmin === null) return <p>Checking permissions...</p>;
  return isAdmin ? children : <Navigate to="/login" />;
};
  
  return (
    <div className="app">

  {location.pathname !== '/'  && <Navbar /> 
  && location.pathname !== '/admin'  && <Navbar />
  && location.pathname !== '/register-admin'  && <Navbar />
  && location.pathname !== '/admin/dashboard'  &&  <Navbar /> }
  
  
      

      <div className="content">
        <Routes>
          <Route path="/register-admin" element={<RegisterAdmin />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<Adminlogin />} />
          <Route path="/admin/dashboard" element={<Admin />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/checkup" element={<CheckUp />} />
          
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App