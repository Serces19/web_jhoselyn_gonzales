import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, GraduationCap, HeartHandshake, Shield, Star, Users, ArrowRight, ExternalLink, MessageCircle, Calendar } from 'lucide-react';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: 'var(--font-sans)', color: '#2c2c2c' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,249,246,0.96)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="container nav">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <nav className="nav-links">
            <a href="/sobre-mi" className="nav-link" style={{ color: 'var(--color-primary-dark)', fontWeight: '700' }}>Sobre Mí</a>
            <a href="/#servicios" className="nav-link">Servicios</a>
            <a href="/faq" className="nav-link">FAQ</a>
            <a href="/pagos" className="nav-link">Pagos</a>
            <a href="/contacto" className="nav-link">Contacto</a>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          
          {/* Hero Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3.5rem', alignItems: 'center', marginBottom: '5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(65,85,54,0.08)', color: 'var(--color-primary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Award size={14} /> Abogada Especialista & Conciliadora
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.4rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1.25rem', fontWeight: 700 }}>
                Dra. Jhoselyn Gonzales
              </h1>
              <p style={{ color: '#64748b', fontSize: '1.15rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                Abogada defensora, docente universitaria y especialista en <strong>Derecho de las Familias, Niñez, Adolescencia y Derecho Civil</strong> en Cochabamba, Bolivia.
              </p>
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                <em>"El ejercicio del derecho no consiste únicamente en aplicar normas; se trata de escuchar con empatía, proteger la estabilidad emocional de las familias y encontrar soluciones justas y duraderas."</em>
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/booking')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.6rem' }}>
                  <Calendar size={18} /> Agendar Consulta
                </button>
                <button onClick={() => navigate('/chat')} style={{ backgroundColor: '#fff', color: 'var(--color-primary-dark)', border: '1.5px solid #d4cdbf', padding: '0.85rem 1.4rem', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageCircle size={18} /> Chat de Orientación
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', width: '320px', height: '320px', backgroundColor: 'rgba(184,134,11,0.08)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0, top: '10%', left: '10%' }}></div>
              <img
                src="/profile photo 1x1 vertical.png"
                alt="Dra. Jhoselyn Gonzales"
                style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Pillars of Practice */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '5rem' }}>
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #ede8df', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(65,85,54,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <HeartHandshake size={24} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Enfoque Humano y Empático</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                Acompañamiento cercano en momentos sensibles como divorcios, custodia de hijos o conflictos sucesorios.
              </p>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #ede8df', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(184,134,11,0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Shield size={24} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Defensa Rigurosa</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                Estrategia jurídica sólida basada en la Ley 603 (Código de Familias), Ley 548 y Código Civil de Bolivia.
              </p>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #ede8df', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Atención Internacional</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                Servicio dedicado a la comunidad boliviana en EEUU y Europa para trámites y poderes sin necesidad de viajar.
              </p>
            </div>
          </div>

          {/* Docencia Universitaria Section */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '3.5rem', border: '1px solid #ede8df', marginBottom: '5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  <GraduationCap size={16} /> Trayectoria Académica & Formación
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-primary-dark)', lineHeight: 1.2, marginBottom: '1.25rem', fontWeight: 700 }}>
                  Docencia Universitaria en Grado y Posgrado
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.2rem' }}>
                  La Dra. Jhoselyn Gonzales ejerce activamente la docencia en diversas universidades e instituciones académicas de prestigio en Bolivia, dictando cátedras en programas de <strong>Pregrado, Diplomados y Posgrados</strong> en áreas de Derecho Procesal Familiar, Protección a la Niñez y Mecanismos Alternativos de Solución de Conflictos.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    'Cátedras universitarias en Derecho de las Familias y Niñez',
                    'Docente en programas de posgrado y especialización jurídica',
                    'Capacitadora en técnicas de mediación y conciliación extrajudicial',
                    'Ponente en seminarios y talleres de actualización en normativa procesal'
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', color: '#334155' }}>
                      <BookOpen size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                  Su constante actividad docente garantiza que su práctica profesional esté fundamentada en la doctrina y jurisprudencia más actualizada de Bolivia.
                </p>
              </div>

              <div>
                <img
                  src="/docencia.jpg"
                  alt="Dra. Jhoselyn Gonzales en Cátedra Universitaria"
                  style={{ width: '100%', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.08)', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>

          {/* Google Reviews Section */}
          <div style={{ backgroundColor: '#FAF8F5', borderRadius: '24px', padding: '3.5rem', border: '1.5px solid #EAE5DC', marginBottom: '5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#eab308', marginBottom: '0.5rem' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem', fontWeight: 700 }}>
                Opiniones de Nuestros Clientes
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                La confianza y tranquilidad de quienes nos eligen es nuestra mayor carta de presentación.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[
                {
                  author: 'Brenda A.',
                  date: 'Reciente',
                  text: '¡Excelente experiencia! La doctora es muy amable, profesional y atenta.',
                  stars: 5
                },
                {
                  author: 'Keil Lucas',
                  date: 'Hace un mes',
                  text: 'Excelente servicio, el asesoramiento brindado fue de primera. Siempre estuvo al pendiente de cada detalle desde el primer momento hasta el final, excelente profesional. 100% recomendada 😊',
                  stars: 5
                },
                {
                  author: 'Fernanda Villarroel',
                  date: 'Hace un mes',
                  text: 'Calidad de profesional y humana 👏🏻 Estoy muy agradecida por su asesoría, dedicación y excelentes resultados.',
                  stars: 5
                }
              ].map((rev, idx) => (
                <div key={idx} style={{ backgroundColor: '#fff', padding: '1.75rem', borderRadius: '16px', border: '1px solid #ede8df', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '3px', color: '#eab308' }}>
                        {[...Array(rev.stars)].map((_, s) => (
                          <Star key={s} size={14} fill="#eab308" color="#eab308" />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>{rev.date}</span>
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                      "{rev.text}"
                    </p>
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--color-primary-dark)', lineHeight: 1.2 }}>
                        {rev.author}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        Reseña verificada en Google
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <a
                href="https://g.page/r/CdRUSSwaGWpAEBM/review"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-primary-dark)',
                  border: '1.5px solid var(--color-primary)',
                  padding: '0.85rem 1.75rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                ⭐ Ver o Dejar una Reseña en Google Reviews <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* CTA Footer */}
          <div style={{ backgroundColor: 'var(--color-primary-dark)', borderRadius: '24px', padding: '3.5rem', textAlign: 'center', color: '#fff' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>
              ¿Necesitas Asesoría Legal para tu Caso?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Agenda una consulta privada o inicia una conversación con nuestro asistente para evaluar tus opciones jurídicas.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/booking')} style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary-dark)', border: 'none', padding: '0.9rem 2rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                📅 Agendar una Consulta (200 Bs / 20 USD)
              </button>
              <button onClick={() => navigate('/chat')} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '0.9rem 1.75rem', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
                💬 Chat de Orientación
              </button>
            </div>
          </div>

        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <a href="/sobre-mi" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Sobre Mí</a>
            <a href="/#servicios" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Servicios</a>
            <a href="/blog" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Blog</a>
            <a href="/faq" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>FAQ</a>
            <a href="/pagos" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Pagos</a>
            <a href="/contacto" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Contacto</a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>© 2026 Jhoselyn Gonzales Abogada · Cochabamba, Bolivia</p>
        </div>
      </footer>
    </div>
  );
}
