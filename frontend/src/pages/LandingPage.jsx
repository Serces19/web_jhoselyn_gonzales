import React, { useState } from 'react';
import { Scale, Users, Shield, CheckCircle, MessageCircle, ArrowRight, ChevronDown, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeArea, setActiveArea] = useState(null);

  const whatsappMessage = encodeURIComponent("Hola, me gustaría información sobre sus servicios legales.");
  const whatsappUrl = `https://wa.me/59169512921?text=${whatsappMessage}`;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container nav">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo Jhoselyn Gonzales" style={{ height: '100px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <nav className="nav-links">
            <a href="/#servicios" className="nav-link">Servicios</a>
            <a href="/blog" className="nav-link">Blog</a>
            <a href="/faq" className="nav-link">FAQ</a>
            <a href="/pagos" className="nav-link">Pagos</a>
            <a href="/contacto" className="nav-link">Contacto</a>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero animate-fade-in">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>¿Tienes un problema legal y no sabes por donde empezar?</h1>
            <p>
              Encontrar una solución jurídica no debería ser tan complicada. Recibe una atención personalizada y una explicación clara de tu situación. 
            </p>
            <div className="hero-buttons">
              <button
                onClick={() => navigate('/chat')}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', padding: '1rem 2rem' }}
              >
                Cuéntame tu problema
              </button>
              <button onClick={() => navigate('/booking')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Agendar Cita <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="hero-image-container" style={{ textAlign: 'center', overflow: 'visible', boxShadow: 'none' }}>
            <div className="hero-decorative-circle"></div>
            <img 
              src="/profile photo 1x1 vertical.png" 
              alt="Abogada Jhoselyn Gonzales" 
              className="hero-image"
              style={{ objectFit: 'contain', borderRadius: '16px', maxHeight: '600px', width: 'auto', display: 'inline-block', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            />
          </div>
        </div>
      </section>

      {/* International Services Banner */}
      <div style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', padding: '0.9rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', textAlign: 'center' }}>
          <Globe size={18} style={{ color: 'var(--color-accent-light)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
            🇺🇸 <strong>Se atiende a bolivianos residentes en el extranjero.</strong> Consultas online · Pago internacional (AirTM / ACH / Tarjeta)
          </span>
          <a href="/contacto" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary-dark)', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem', whiteSpace: 'nowrap', textDecoration: 'none' }}>
            Contactar ahora →
          </a>
        </div>
      </div>

      {/* Services Section */}
      <section id="servicios" className="services" style={{ padding: '6rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div className="editorial-grid">

            {/* Column 1 — Label + Area 1 */}
            <div className="editorial-col">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '4rem', color: 'var(--color-primary-dark)', lineHeight: 1, marginBottom: '4rem', fontWeight: 600 }}>
                Áreas<br/>
                <span style={{ display: 'inline-block', width: '50px', height: '24px', backgroundColor: 'var(--color-primary-light)', borderRadius: '40px', verticalAlign: 'middle', margin: '0 0.5rem' }}></span>
                de<br/>
                Práctica
              </h2>
              <div style={{ marginTop: 'auto' }}>
                <Users size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3
                  onClick={() => setActiveArea(activeArea === 'familiar' ? null : 'familiar')}
                  style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem', fontWeight: 600, lineHeight: 1.1, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', userSelect: 'none' }}>
                  Derecho Familiar
                  <ChevronDown size={20} style={{ marginTop: '6px', flexShrink: 0, transition: 'transform 0.3s', transform: activeArea === 'familiar' ? 'rotate(180deg)' : 'none' }} />
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>Asesoría y representación en procesos de divorcio, asistencia familiar y guarda.</p>
                {activeArea === 'familiar' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Casos comunes</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {['Divorcio por mutuo acuerdo', 'Divorcio contencioso', 'Asistencia familiar (pensión)', 'Guarda y custodia de hijos', 'Régimen de visitas', 'Separación de bienes'].map(c => (
                        <li key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontSize: '0.88rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', flexShrink: 0 }}></span>{c}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate('/booking')} style={{ marginTop: '1.25rem', backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Agendar consulta <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2 — Highlighted */}
            <div
              className="editorial-col"
              style={{ padding: 0, background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)', color: '#fff', justifyContent: 'flex-end', cursor: 'pointer' }}
              onClick={() => setActiveArea(activeArea === 'ninez' ? null : 'ninez')}>
              <div style={{ padding: '3rem 2rem', marginTop: 'auto' }}>
                <Shield size={32} style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.75rem', fontWeight: 600, lineHeight: 1.1, display: 'flex', alignItems: 'flex-start', gap: '0.5rem', userSelect: 'none' }}>
                  Niñez y Adolescencia
                  <ChevronDown size={20} style={{ marginTop: '6px', flexShrink: 0, transition: 'transform 0.3s', transform: activeArea === 'ninez' ? 'rotate(180deg)' : 'none', color: 'rgba(255,255,255,0.7)' }} />
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>Protección prioritaria de los derechos de menores.</p>
                {activeArea === 'ninez' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Casos comunes</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {['Filiación y reconocimiento de hijos', 'Adopción nacional', 'Restitución internacional de menores', 'Violencia intrafamiliar (menores)', 'Tutela y curatela'].map(c => (
                        <li key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.6)', flexShrink: 0 }}></span>{c}
                        </li>
                      ))}
                    </ul>
                    <button onClick={(e) => { e.stopPropagation(); navigate('/booking'); }} style={{ marginTop: '1.25rem', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Agendar consulta <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3 */}
            <div className="editorial-col">
              <p style={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 500, fontStyle: 'italic', marginBottom: '3rem' }}>
                No perseguimos tendencias — respaldamos causas justas.
              </p>
              <div style={{ marginTop: 'auto' }}>
                <Scale size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3
                  onClick={() => setActiveArea(activeArea === 'civil' ? null : 'civil')}
                  style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem', fontWeight: 600, lineHeight: 1.1, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', userSelect: 'none' }}>
                  Derecho Civil y Patrimonial
                  <ChevronDown size={20} style={{ marginTop: '6px', flexShrink: 0, transition: 'transform 0.3s', transform: activeArea === 'civil' ? 'rotate(180deg)' : 'none' }} />
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>Defensa y saneamiento de propiedades, sucesiones y contratos.</p>
                {activeArea === 'civil' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Casos comunes</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {['Saneamiento de propiedades', 'Sucesiones y herencias', 'Testamentos', 'Elaboración de contratos', 'Partición de bienes', 'Conflictos de copropiedad'].map(c => (
                        <li key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontSize: '0.88rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', flexShrink: 0 }}></span>{c}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate('/booking')} style={{ marginTop: '1.25rem', backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Agendar consulta <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column 4 */}
            <div className="editorial-col">
              <div style={{ flex: 1 }}></div>
              <div style={{ marginTop: 'auto' }}>
                <MessageCircle size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3
                  onClick={() => setActiveArea(activeArea === 'conflictos' ? null : 'conflictos')}
                  style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem', fontWeight: 600, lineHeight: 1.1, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', userSelect: 'none' }}>
                  Solución de Conflictos
                  <ChevronDown size={20} style={{ marginTop: '6px', flexShrink: 0, transition: 'transform 0.3s', transform: activeArea === 'conflictos' ? 'rotate(180deg)' : 'none' }} />
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>Mediación y negociación extrajudicial para resolver disputas pacíficamente.</p>
                {activeArea === 'conflictos' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Casos comunes</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {['Conflictos de vecindad', 'Disputas comerciales', 'Acuerdos extrajudiciales', 'Mediación familiar', 'Conciliación previa al juicio'].map(c => (
                        <li key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontSize: '0.88rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', flexShrink: 0 }}></span>{c}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate('/booking')} style={{ marginTop: '1.25rem', backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Agendar consulta <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="statistics" style={{ padding: '6rem 0', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '7rem', maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Chart 1: Horizontal */}
          <div style={{ width: '100%' }}>
            <h2 style={{ fontSize: '3.5rem', color: 'var(--color-primary-dark)', marginBottom: '3rem', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Resolución de Divorcios en Bolivia
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '68%', height: '80px', backgroundColor: '#e2e8f0', borderRadius: '0 40px 40px 0', transition: 'width 1s ease' }}></div>
                <div style={{ marginLeft: '1.5rem' }}>
                  <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary-dark)', lineHeight: 1 }}>68.4%</span>
                  <span style={{ display: 'block', fontSize: '1.2rem', color: '#64748b', fontWeight: '500', marginTop: '0.4rem' }}>mutuo acuerdo</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '31%', height: '80px', backgroundColor: 'var(--color-primary-dark)', borderRadius: '0 40px 40px 0', transition: 'width 1s ease' }}></div>
                <div style={{ marginLeft: '1.5rem' }}>
                  <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary-dark)', lineHeight: 1 }}>31.6%</span>
                  <span style={{ display: 'block', fontSize: '1.2rem', color: '#64748b', fontWeight: '500', marginTop: '0.4rem' }}>contencioso</span>
                </div>
              </div>

            </div>
          </div>

          {/* Chart 2: Vertical */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '3.5rem', color: 'var(--color-primary-dark)', marginBottom: '1rem', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Casos resueltos con éxito!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '1.25rem', maxWidth: '600px', lineHeight: 1.6 }}>
              Efectividad comprobada en procesos de asistencia familiar, civil y sucesiones. Crecimiento sostenido en resoluciones favorables a lo largo de los años.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3rem', height: '280px', paddingLeft: '1rem' }}>
              
              {/* Bar 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', height: '55%' }}>
                <span style={{ marginBottom: '12px', fontWeight: '800', color: '#94a3b8', fontSize: '1.8rem' }}>142</span>
                <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', borderRadius: '60px 60px 0 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '15px', width: '80px', height: '80px', border: '2px solid rgba(255,255,255,0.8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '700', fontSize: '1.2rem' }}>
                    2023
                  </div>
                </div>
              </div>

              {/* Bar 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', height: '70%' }}>
                <span style={{ marginBottom: '12px', fontWeight: '800', color: 'var(--color-primary)', fontSize: '1.8rem' }}>215</span>
                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '60px 60px 0 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '15px', width: '80px', height: '80px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1.2rem' }}>
                    2024
                  </div>
                </div>
              </div>

              {/* Bar 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', height: '100%' }}>
                <span style={{ marginBottom: '12px', fontWeight: '800', color: 'var(--color-primary-dark)', fontSize: '2.2rem' }}>380</span>
                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-primary-dark)', borderRadius: '60px 60px 0 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '15px', width: '80px', height: '80px', border: '3px solid #fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '1.2rem' }}>
                    2025
                  </div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="about">
        <div className="container about-content">
          <div className="about-image">
             <img 
              src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Justicia y Derecho" 
              style={{ width: '100%', borderRadius: '8px', opacity: 0.9 }}
            />
          </div>
          <div className="about-text">
            <h2 className="section-title" style={{ textAlign: 'left', color: '#fff' }}>Por qué elegirnos</h2>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              Nuestra propuesta de valor va más allá de la simple asesoría legal. Ofrecemos un acompañamiento cercano y humano en procesos jurídicos que suelen ser difíciles, alejándonos de los clichés tradicionales.
            </p>
            <div className="values-grid">
              <div className="value-item">
                <CheckCircle size={24} className="value-icon" />
                <span>Transparencia</span>
              </div>
              <div className="value-item">
                <CheckCircle size={24} className="value-icon" />
                <span>Empatía</span>
              </div>
              <div className="value-item">
                <CheckCircle size={24} className="value-icon" />
                <span>Ética Profesional</span>
              </div>
              <div className="value-item">
                <CheckCircle size={24} className="value-icon" />
                <span>Compromiso</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <a href="/#servicios" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Servicios</a>
            <a href="/blog" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Blog</a>
            <a href="/faq" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>FAQ Legal</a>
            <a href="/pagos" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Opciones de Pago</a>
            <a href="/contacto" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Contacto</a>
            <a href="/probono" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Pro Bono</a>
            <a href="/booking" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem' }}>Agendar Cita</a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>© 2026 Jhoselyn Gonzales Abogada · Cochabamba, Bolivia · Hernínas y Oquendo</p>
        </div>
      </footer>

      {/* Chat CTA Floating Button */}
      <a
        href="/chat"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: 'var(--color-primary-dark)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '50px',
          padding: '0.85rem 1.5rem',
          fontWeight: '700',
          fontSize: '0.92rem',
          boxShadow: '0 8px 24px rgba(65,85,54,0.28)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 998,
          fontFamily: 'var(--font-sans)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(65,85,54,0.38)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(65,85,54,0.28)'; }}
      >
        <MessageCircle size={18} />
        Cuéntame tu problema
      </a>
    </div>
  );
}
