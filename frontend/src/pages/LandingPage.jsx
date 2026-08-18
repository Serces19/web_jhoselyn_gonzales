import React from 'react';
import { Scale, Users, Shield, CheckCircle, MessageCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const whatsappMessage = encodeURIComponent("Hola, me gustaría información sobre sus servicios legales.");
  const whatsappUrl = `https://wa.me/591XXXXXXXXX?text=${whatsappMessage}`; // Reemplazar con número real

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container nav">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo Jhoselyn Gonzales" style={{ height: '100px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <nav className="nav-links">
            <a href="#servicios" className="nav-link">Servicios</a>
            <a href="#nosotros" className="nav-link">Sobre Mí</a>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero animate-fade-in">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Protección legal con humanidad y empatía</h1>
            <p>
              Brindamos acompañamiento y asesoría legal integral a familias en conflicto y a personas que necesitan respaldo en la protección de su patrimonio.
            </p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/booking')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Agendar Consulta Online <ArrowRight size={18} />
              </button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Contactar por WhatsApp
              </a>
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

      {/* Services Section */}
      <section id="servicios" className="services" style={{ padding: '6rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          
          <div className="editorial-grid">
            
            {/* Column 1 */}
            <div className="editorial-col">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '4rem', color: 'var(--color-primary-dark)', lineHeight: 1, marginBottom: '4rem', fontWeight: 600 }}>
                Áreas<br/>
                <span style={{ display: 'inline-block', width: '50px', height: '24px', backgroundColor: 'var(--color-primary-light)', borderRadius: '40px', verticalAlign: 'middle', margin: '0 0.5rem' }}></span>
                de<br/>
                Práctica
              </h2>

              <div style={{ marginTop: 'auto' }}>
                <Users size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-primary-dark)', marginBottom: '1rem', fontWeight: 600, lineHeight: 1.1 }}>Derecho Familiar</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>Asesoría y representación en procesos de divorcio, asistencia familiar, guarda y visitas, buscando siempre la solución más justa y humana.</p>
              </div>
            </div>

            {/* Column 2 (Highlighted) */}
            <div className="editorial-col" style={{ padding: 0, background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)', color: '#fff', justifyContent: 'flex-end' }}>
              <div style={{ padding: '3rem 2rem', marginTop: 'auto' }}>
                <Shield size={32} style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#fff', marginBottom: '1rem', fontWeight: 600, lineHeight: 1.1 }}>Niñez y Adolescencia</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.6 }}>Protección prioritaria de los derechos de menores. Acompañamiento en procesos de filiación, adopción y restitución internacional.</p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="editorial-col">
              <p style={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 500, fontStyle: 'italic', marginBottom: '3rem' }}>
                No perseguimos tendencias — respaldamos causas justas. Aquí es donde aportamos mayor firmeza, experiencia y empatía profunda:
              </p>

              <div style={{ marginTop: 'auto' }}>
                <Scale size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-primary-dark)', marginBottom: '1rem', fontWeight: 600, lineHeight: 1.1 }}>Derecho Civil y Patrimonial</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>Defensa y saneamiento de propiedades, sucesiones, elaboración de contratos y resolución de conflictos sobre bienes y patrimonio familiar.</p>
              </div>
            </div>

            {/* Column 4 */}
            <div className="editorial-col">
              <div style={{ flex: 1 }}></div>
              <div style={{ marginTop: 'auto' }}>
                <MessageCircle size={32} style={{ color: 'var(--color-primary-light)', marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-primary-dark)', marginBottom: '1rem', fontWeight: 600, lineHeight: 1.1 }}>Solución de Conflictos</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>Estrategias de mediación y negociación extrajudicial para resolver disputas de forma pacífica, ahorrando tiempo y desgaste emocional.</p>
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
          <div className="logo footer-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <p>© 2026 Jhoselyn Gonzales Abogada. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* WhatsApp Widget */}
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-widget" aria-label="Contactar por WhatsApp">
        <MessageCircle size={32} />
      </a>
    </div>
  );
}
