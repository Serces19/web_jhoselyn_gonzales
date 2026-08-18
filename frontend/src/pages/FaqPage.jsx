import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, TrendingUp, HelpCircle, ExternalLink } from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    name: 'Divorcio & Separación',
    color: '#415536',
    questions: [
      { id: 'div-1', q: '¿Cuánto tiempo tarda un divorcio en Bolivia?' },
      { id: 'div-2', q: '¿Qué diferencia hay entre divorcio por mutuo acuerdo y contencioso?' },
      { id: 'div-3', q: '¿Puedo divorciarme si mi cónyuge vive en otro país?' },
      { id: 'div-4', q: '¿Qué pasa con la casa y los bienes durante el divorcio?' },
      { id: 'div-5', q: '¿Necesito ir a juicio para divorciarme?' },
    ]
  },
  {
    name: 'Asistencia Familiar',
    color: '#809956',
    questions: [
      { id: 'af-1', q: '¿Cómo calculo la pensión de asistencia familiar?' },
      { id: 'af-2', q: '¿Qué pasa si el padre no paga la asistencia familiar?' },
      { id: 'af-3', q: '¿Hasta qué edad se paga asistencia familiar?' },
      { id: 'af-4', q: '¿Puedo pedir aumento de asistencia familiar si subieron los costos?' },
    ]
  },
  {
    name: 'Niñez & Custodia',
    color: '#b86d47',
    questions: [
      { id: 'ni-1', q: '¿Cómo se define la guarda de los hijos en Bolivia?' },
      { id: 'ni-2', q: '¿Puede el padre pedir la custodia compartida?' },
      { id: 'ni-3', q: '¿Qué es el régimen de visitas y cómo se establece?' },
      { id: 'ni-4', q: '¿Puedo llevar a mis hijos a vivir a otro país sin permiso del otro padre?' },
    ]
  },
  {
    name: 'Herencias & Sucesiones',
    color: '#334155',
    questions: [
      { id: 'he-1', q: '¿Cuáles son los herederos legales según la ley boliviana?' },
      { id: 'he-2', q: '¿Qué es la legítima y cuánto le corresponde a cada heredero?' },
      { id: 'he-3', q: '¿Cómo se puede impugnar un testamento?' },
      { id: 'he-4', q: '¿Cuánto tiempo tengo para reclamar una herencia?' },
    ]
  },
];

export default function FaqPage() {
  const navigate = useNavigate();
  const [clicked, setClicked] = useState({});
  const [activeCategory, setActiveCategory] = useState(0);

  const handleClick = (id) => {
    setClicked(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    // Open AirTM payment (link to be configured)
    window.open('https://airtm.com', '_blank'); // TODO: replace with real AirTM link
  };

  const totalClicks = Object.values(clicked).reduce((a, b) => a + b, 0);
  const cat = FAQ_CATEGORIES[activeCategory];

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
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', backgroundColor: 'rgba(65,85,54,0.08)', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <HelpCircle size={34} style={{ color: 'var(--color-primary-dark)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.2rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1rem', fontWeight: 700 }}>
              Preguntas Frecuentes
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
              Respuestas detalladas a las dudas más comunes en casos de derecho familiar, civil y patrimonio.
            </p>
          </div>

          {/* Paywall banner */}
          <div style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Lock size={28} style={{ flexShrink: 0, color: 'var(--color-accent-light)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Respuestas Detalladas — Solo Bs. 20 por pregunta</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Cada respuesta incluye el artículo legal aplicable, pasos concretos a seguir y en qué casos conviene actuar rápido. Pago vía AirTM (se habilita al momento de la compra).
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary-dark)', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              Bs. 20 / pregunta
            </div>
          </div>

          {/* Coming soon notice */}
          <div style={{ backgroundColor: '#fff8ed', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '2.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '0.2rem' }}>Próximamente — Respuestas en preparación</div>
              <div style={{ color: '#78350f', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Estamos redactando respuestas detalladas con fundamentos legales para cada pregunta. Pronto estarán disponibles. Puedes hacer clic en cualquier pregunta para ver la opción de pago y dejar constancia de tu interés.
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {FAQ_CATEGORIES.map((c, i) => (
              <button key={i} onClick={() => setActiveCategory(i)} style={{ padding: '0.6rem 1.25rem', borderRadius: '20px', border: '2px solid', borderColor: activeCategory === i ? c.color : '#e2e8f0', backgroundColor: activeCategory === i ? c.color : '#fff', color: activeCategory === i ? '#fff' : '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Questions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '4rem' }}>
            {cat.questions.map((item, i) => {
              const clickCount = clicked[item.id] || 0;
              return (
                <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Lock size={15} style={{ color: cat.color }} />
                    </div>
                    <span style={{ flex: 1, fontWeight: '500', color: '#1e293b', fontSize: '0.98rem', lineHeight: 1.4 }}>
                      {item.q}
                    </span>
                    <button onClick={() => handleClick(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: cat.color, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', flexShrink: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <ExternalLink size={14} /> Ver respuesta — Bs. 20
                    </button>
                  </div>
                  {/* Popularity indicator */}
                  {clickCount > 0 && (
                    <div style={{ padding: '0.4rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={13} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{clickCount} persona{clickCount > 1 ? 's' : ''} interesada{clickCount > 1 ? 's' : ''} en esta pregunta</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{ backgroundColor: 'var(--color-primary-dark)', borderRadius: '20px', padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: '2rem', marginBottom: '0.75rem' }}>¿Tu pregunta no está aquí?</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1.05rem' }}>Agenda una consulta personalizada y te resolvemos todo directamente.</p>
            <button onClick={() => navigate('/booking')} style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary-dark)', border: 'none', padding: '0.9rem 2.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
              Agendar Consulta
            </button>
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
