import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import BookingApp from './pages/BookingApp';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import BlogPage from './pages/BlogPage';
import BlogPost from './pages/BlogPost';
import ContactPage from './pages/ContactPage';
import ProBonoPage from './pages/ProBonoPage';
import FaqPage from './pages/FaqPage';
import PagosPage from './pages/PagosPage';
import ChatPage from './pages/ChatPage';
import PrivacyPage from './pages/PrivacyPage';
import './App.css';
const DespachoPage = lazy(() => import('./pages/DespachoPage'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sobre-mi" element={<AboutPage />} />
        <Route path="/booking" element={<BookingApp />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/admin/despacho" element={<Suspense fallback={<p>Cargando despacho…</p>}><DespachoPage/></Suspense>} />
        <Route path="/login" element={<Login />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/probono" element={<ProBonoPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
