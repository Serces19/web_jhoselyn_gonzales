import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, ArrowRight, BookOpen } from 'lucide-react';

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const whatsappMessage = encodeURIComponent("Hola, me gustaría información sobre sus servicios legales.");
  const whatsappUrl = `https://wa.me/591XXXXXXXXX?text=${whatsappMessage}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
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
        <div className="container" style={{ maxWidth: '1000px' }}>
          {/* Hero */}
          <div style={{ marginBottom: '4rem', paddingBottom: '3rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <BookOpen size={24} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: '600', color: 'var(--color-primary)', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Noticias & Artículos</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1rem', fontWeight: 700 }}>
              Blog Legal
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.15rem', maxWidth: '600px', lineHeight: 1.7 }}>
              Información práctica sobre derecho familiar, niñez y patrimonio para que conozcas tus derechos y tomes mejores decisiones.
            </p>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>Cargando artículos...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📝</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>
                Próximamente
              </h3>
              <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
                Estamos preparando contenido de calidad sobre derecho familiar, civil y patrimonial. ¡Vuelve pronto!
              </p>
              <button onClick={() => navigate('/contacto')} className="btn-primary">
                Contáctanos
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              {posts.map((post, i) => (
                <article
                  key={post.post_id}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: i === 0 ? '1fr' : '1fr 1fr',
                    gap: '2rem',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: '1px solid #f1f5f9',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                >
                  {post.image_url && (
                    <div style={{ height: i === 0 ? '300px' : '220px', overflow: 'hidden' }}>
                      <img src={post.image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {post.category && (
                        <span style={{ padding: '0.3rem 0.8rem', backgroundColor: 'rgba(128,153,86,0.12)', color: 'var(--color-primary)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                          {post.category}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <Calendar size={13} /> {new Date(post.created_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: i === 0 ? '2rem' : '1.4rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                      {post.title}
                    </h2>
                    <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      {post.excerpt}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                      Leer artículo <ArrowRight size={16} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2026 Jhoselyn Gonzales Abogada. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
