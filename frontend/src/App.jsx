import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import BookingApp from './pages/BookingApp';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import BlogPage from './pages/BlogPage';
import BlogPost from './pages/BlogPost';
import ContactPage from './pages/ContactPage';
import ProBonoPage from './pages/ProBonoPage';
import FaqPage from './pages/FaqPage';
import PagosPage from './pages/PagosPage';
import ChatWidget from './components/ChatWidget';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking" element={<BookingApp />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/probono" element={<ProBonoPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/pagos" element={<PagosPage />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  );
}

export default App;
