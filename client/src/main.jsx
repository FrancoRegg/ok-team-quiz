import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import HostView from './HostView.jsx'
import AdminView from './AdminView.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />    
      <Route path="/admin" element={<AdminView />}/>        
      <Route path="/host" element={<HostView />} />
    </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)