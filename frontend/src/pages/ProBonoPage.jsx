import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, FileText, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

export default function ProBonoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', location: '', case_type: '', description: '', income: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const whatsappBase = 'https://wa.me/591XXXXXXXXX';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/probono`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // Fallback: WhatsApp
      const msg = encodeURIComponent(`Solicitud Pro Bono\n\n👤 ${form.name}\n📱 ${form.phone}\n📧 ${form.email}\n📍 ${form.location}\n📋 Tipo: ${form.case_type}\n\nDescripción: ${form.description}`);
      window.open(`${whatsappBase}?text=${msg}`, '_blank');
      setSubmitted(true);
    }
    setSending(false);
  };

  const criteria = [
    'No contar con recursos económicos suficientes para contratar un abogado',
    'Residir en Bolivia o ser ciudadano boliviano en situación vulnerable',
    'El caso debe ser de naturaleza familiar, civil o relacionado con niñez',
    'Disponer de documentación básica del caso',
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,249,246,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="container nav">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <nav className="nav-links">
            <a href="/#servicios" className="nav-link">Servicios</a>
            <a href="/contacto" className="nav-link">Contacto</a>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', backgroundColor: 'rgba(184,109,71,0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Heart size={34} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1rem', fontWeight: 700 }}>
              Pro Bono
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.15rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.7 }}>
              Creemos que el acceso a la justicia es un derecho fundamental. Por eso, destinamos parte de nuestro tiempo a casos de personas en situación de vulnerabilidad que no pueden costear una asesoría legal.
            </p>
          </div>

          {/* Criteria */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '2.5rem', marginBottom: '3rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Criterios de Elegibilidad</h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Para ser considerado en nuestro programa Pro Bono debes cumplir con los siguientes requisitos:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {criteria.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <CheckCircle size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>{c}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', backgroundColor: 'rgba(220,166,121,0.1)', borderRadius: '10px', borderLeft: '4px solid var(--color-accent)', display: 'flex', gap: '0.75rem' }}>
              <AlertCircle size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                Cada solicitud es evaluada individualmente. La aceptación al programa está sujeta a disponibilidad y criterio del equipo. Nos comprometemos a responder todas las solicitudes.
              </p>
            </div>
          </div>

          {/* Form */}
          {submitted ? (
            <div style={{ textAlign: 'center', backgroundColor: '#fff', borderRadius: '20px', padding: '4rem 2rem', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🙏</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>Solicitud Recibida</h3>
              <p style={{ color: '#64748b', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 2rem' }}>
                Hemos recibido tu solicitud. La revisaremos con cuidado y nos pondremos en contacto contigo dentro de 3 días hábiles para informarte sobre el estado.
              </p>
              <button onClick={() => navigate('/')} className="btn-primary">Volver al inicio</button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Solicitud de Asistencia Pro Bono</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>Completa el formulario con honestidad. Toda la información es confidencial.</p>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {[
                  { label: 'Nombre Completo *', key: 'name', placeholder: 'Tu nombre completo', required: true },
                  { label: 'Teléfono / WhatsApp *', key: 'phone', placeholder: '+591 XXXXXXXX', required: true },
                  { label: 'Correo Electrónico', key: 'email', placeholder: 'tu@correo.com', required: false, type: 'email' },
                  { label: 'Ciudad / Municipio *', key: 'location', placeholder: 'Ej. Cochabamba', required: true },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>{f.label}</label>
                    <input required={f.required} type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Tipo de Caso *</label>
                  <select required value={form.case_type} onChange={e => setForm({ ...form, case_type: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Selecciona el tipo de caso...</option>
                    <option>Divorcio o Separación</option>
                    <option>Asistencia Familiar (Pensión)</option>
                    <option>Guarda y Custodia de menores</option>
                    <option>Niñez y Adolescencia</option>
                    <option>Herencia / Sucesión</option>
                    <option>Violencia doméstica</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Describe tu situación *</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explica brevemente tu situación y por qué necesitas asistencia legal gratuita..." rows={5} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Situación económica (opcional)</label>
                  <input value={form.income} onChange={e => setForm({ ...form, income: e.target.value })} placeholder="Ej. desempleado/a, ingreso menor a X Bs/mes..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button type="submit" disabled={sending} style={{ width: '100%', backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {sending ? 'Enviando solicitud...' : <><FileText size={18} /> Enviar Solicitud Pro Bono</>}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 Jhoselyn Gonzales Abogada. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
