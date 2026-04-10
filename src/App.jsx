import React, { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Report from './pages/Report'
import Navbar from './components/navbar'
import Homepage from './Homepage'
import Admin from './pages/Admin'
import Borrow from './pages/Borrow'
import Appointment from './pages/appointment'
import CheckUp from './pages/CheckUp'



function App() {

  return (
    <div className="app">
      <Navbar />
      <div className="content">
        <Routes>
          <Route  path="/admin" element = {<Admin />}/> 
          <Route  path="/login" element = {<Homepage />}/> 
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/report" element={<Report />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/appointment" element={<Appointment />} />
           <Route path="/checkup" element={<CheckUp />} />
        </Routes>
      </div>
    </div>

  )
}

export default App