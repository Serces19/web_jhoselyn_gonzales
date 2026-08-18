import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setPost(d.post); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,249,246,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="container nav">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo.jpg" alt="Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <nav className="nav-links">
            <button onClick={() => navigate('/blog')} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <ArrowLeft size={18} /> Blog
            </button>
            <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Agendar Cita</button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>Cargando...</div>}
          
          {notFound && (
            <div style={{ textAlign: 'center', padding: '5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>Artículo no encontrado</h2>
              <button onClick={() => navigate('/blog')} className="btn-primary">Ver todos los artículos</button>
            </div>
          )}

          {post && (
            <>
              {/* Meta */}
              <div style={{ marginBottom: '2rem' }}>
                <button onClick={() => navigate('/blog')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '600', marginBottom: '2rem', padding: 0 }}>
                  <ArrowLeft size={18} /> Volver al Blog
                </button>
                {post.category && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ padding: '0.3rem 0.8rem', backgroundColor: 'rgba(128,153,86,0.12)', color: 'var(--color-primary)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                      {post.category}
                    </span>
                  </div>
                )}
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: 'var(--color-primary-dark)', lineHeight: 1.15, marginBottom: '1rem', fontWeight: 700 }}>
                  {post.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  <Calendar size={15} />
                  {new Date(post.created_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {post.author && <> · <span style={{ fontWeight: '500', color: '#64748b' }}>Por {post.author}</span></>}
                </div>
              </div>

              {post.image_url && (
                <div style={{ marginBottom: '2.5rem', borderRadius: '16px', overflow: 'hidden', maxHeight: '420px' }}>
                  <img src={post.image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Markdown Content */}
              <div className="blog-content" style={{
                '--prose-headings': 'var(--color-primary-dark)',
                '--prose-body': '#334155',
                '--prose-links': 'var(--color-primary)',
              }}>
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>

              {/* CTA */}
              <div style={{ marginTop: '4rem', padding: '2.5rem', backgroundColor: 'var(--color-primary-dark)', borderRadius: '16px', textAlign: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: '1.8rem', marginBottom: '0.75rem' }}>¿Tienes dudas sobre tu caso?</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>Agenda una consulta y te ayudamos a entender tus opciones.</p>
                <button onClick={() => navigate('/booking')} style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary-dark)', border: 'none', padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
                  Agendar Consulta
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
