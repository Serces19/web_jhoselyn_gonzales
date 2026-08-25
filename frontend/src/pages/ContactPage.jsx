import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, MessageCircle, Globe, AtSign, Send } from 'lucide-react';

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const whatsappBase = 'https://wa.me/59169512921';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Send to WhatsApp with pre-filled message as fallback (no email configured yet)
    const msg = encodeURIComponent(
      `Consulta desde web\n\n👤 Nombre: ${form.name}\n📧 Correo: ${form.email}\n📱 Teléfono: ${form.phone}\n📋 Asunto: ${form.subject}\n\n${form.message}`
    );
    setTimeout(() => {
      setSending(false);
      setSent(true);
      window.open(`${whatsappBase}?text=${msg}`, '_blank');
    }, 600);
  };

  const contacts = [
    { icon: <Phone size={20} />, label: 'Teléfono / WhatsApp', value: '+591 69512921', href: whatsappBase },
    { icon: <Mail size={20} />, label: 'Correo Electrónico', value: 'scope.estudio@gmail.com', href: 'mailto:scope.estudio@gmail.com' },
    { icon: <MapPin size={20} />, label: 'Oficina', value: 'Heroínas y Oquendo, Cochabamba, Bolivia', href: 'https://maps.google.com/?q=Heroinas+y+Oquendo+Cochabamba+Bolivia' },
  ];

  const socials = [
    { icon: <AtSign size={22} />, label: 'Instagram', href: 'https://www.instagram.com/jhoselyn.gonzales.abogada', handle: '@jhoselyn.gonzales.abogada' },
    { icon: <Globe size={22} />, label: 'Facebook', href: 'https://www.facebook.com/jhoselyn.gonzales.abogada', handle: 'Jhoselyn Gonzales Abogada' },
    { icon: <MessageCircle size={22} />, label: 'TikTok', href: 'https://tiktok.com/@jhos.gonzales.abogada', handle: '@jhos.gonzales.abogada' },
    { icon: <Globe size={22} />, label: 'LinkedIn', href: 'https://www.linkedin.com/in/jhoselyn-gonzales-abogada', handle: 'Jhoselyn Gonzales · LinkedIn' },
    { icon: <MessageCircle size={22} />, label: 'WhatsApp', href: whatsappBase, handle: 'Consulta directa' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,249,246,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="container nav">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <nav className="nav-links">
            <a href="/sobre-mi" className="nav-link">Sobre Mí</a>
            <a href="/#servicios" className="nav-link">Servicios</a>
            <a href="/faq" className="nav-link">FAQ</a>
            <a href="/pagos" className="nav-link">Pagos</a>
            <a href="/contacto" className="nav-link" style={{ color: 'var(--color-primary-dark)', fontWeight: '700' }}>Contacto</a>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          {/* Hero */}
          <div style={{ marginBottom: '4rem' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1rem', fontWeight: 700 }}>
              Estamos aquí<br />para escucharte
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.15rem', maxWidth: '520px', lineHeight: 1.7 }}>
              Contáctanos por el canal que prefieras. Respondemos todos los mensajes a la brevedad posible.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '4rem', alignItems: 'start' }}>
            {/* Left column */}
            <div>
              {/* Contact info */}
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-primary-dark)', marginBottom: '1.5rem' }}>Información de Contacto</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {contacts.map((c, i) => (
                    <a key={i} href={c.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', textDecoration: 'none', padding: '1.2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }}>{c.icon}</div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{c.label}</div>
                        <div style={{ color: 'var(--color-primary-dark)', fontWeight: '500', fontSize: '0.95rem' }}>{c.value}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Social media */}
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-primary-dark)', marginBottom: '1.5rem' }}>Redes Sociales</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {socials.map((s, i) => (
                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', padding: '1rem 1.2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>{s.label}</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{s.handle}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <iframe
                  title="Ubicación"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.2!2d-66.1561!3d-17.3895!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93e371e1e1e1e1e1%3A0x0!2sHero%C3%ADnas+y+Oquendo%2C+Cochabamba!5e0!3m2!1ses!2sbo!4v1"
                  width="100%"
                  height="220"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen=""
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right column — Form */}
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>✅</div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>¡Mensaje enviado!</h3>
                  <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Se abrirá WhatsApp con tu mensaje listo. Nos pondremos en contacto a la brevedad posible.
                  </p>
                  <button onClick={() => setSent(false)} className="btn-secondary">Enviar otro mensaje</button>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Envíanos un mensaje</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>Respuesta garantizada en menos de 24 horas hábiles.</p>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Nombre *</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                          onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Teléfono</label>
                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+591 XXXXXXXX" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Correo Electrónico *</label>
                      <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@correo.com" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Asunto *</label>
                      <select required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                        <option value="">Selecciona un área...</option>
                        <option>Derecho Familiar (Divorcio, Asistencia)</option>
                        <option>Niñez y Adolescencia</option>
                        <option>Derecho Civil y Patrimonial</option>
                        <option>Servicios desde el Exterior (EEUU)</option>
                        <option>Pro Bono</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Mensaje *</label>
                      <textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Cuéntanos brevemente sobre tu situación..." rows={5} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                    <button type="submit" disabled={sending} style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s' }}>
                      {sending ? 'Enviando...' : <><Send size={18} /> Enviar por WhatsApp</>}
                    </button>
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Tu información es confidencial y está protegida.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
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
