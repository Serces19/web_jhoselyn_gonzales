import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hola. Soy el asistente virtual de la Dra. Jhoselyn Gonzales.\n\nPuedes contarme con total confianza cuál es tu situación. Estoy aquí para escucharte.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [sessionId] = useState(() => {
    let sId = sessionStorage.getItem('jhoselyn_chat_session_id');
    if (!sId) {
      sId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('jhoselyn_chat_session_id', sId);
    }
    return sId;
  });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || limitReached) return;

    const userMsg = { id: 'u_' + Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.turn_count) {
          setTurnCount(data.turn_count);
        }
        if (data.limit_reached) {
          setLimitReached(true);
        }
        setMessages(prev => [
          ...prev,
          { id: 'b_' + Date.now(), role: 'assistant', text: data.response || '' }
        ]);
      } else {
        throw new Error('Server error');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          text: 'Disculpa, tuve un problema al conectarme. ¿Puedes intentarlo de nuevo?'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAF8',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Minimal header */}
      <header style={{
        backgroundColor: '#FAFAF8',
        borderBottom: '1px solid #e8e6e1',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexShrink: 0
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            padding: '0.3rem 0',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            overflow: 'hidden', border: '2px solid var(--color-primary)',
            flexShrink: 0
          }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: '700', color: 'var(--color-primary-dark)', fontSize: '0.95rem', lineHeight: 1.2 }}>
              Asistente Jurídico
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }}></span>
              Dra. Jhoselyn Gonzales
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          marginLeft: 'auto', fontSize: '0.76rem', color: '#b0a99a',
          maxWidth: '340px', textAlign: 'right', lineHeight: 1.4
        }}>
          Este chat es orientativo. Para asesoría formal agenda una consulta con la Dra. Jhoselyn.
        </div>
      </header>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '720px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                fontSize: '0.72rem', color: '#b0a99a', fontWeight: '600',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: '0.45rem', paddingLeft: '2px'
              }}>
                Asistente · Jhoselyn Gonzales
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: msg.role === 'user' ? '0.85rem 1.1rem' : '1rem 1.25rem',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              backgroundColor: msg.role === 'user' ? 'var(--color-primary-dark)' : '#ffffff',
              color: msg.role === 'user' ? '#ffffff' : '#2c2c2c',
              fontSize: '0.95rem',
              lineHeight: 1.65,
              boxShadow: msg.role === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              border: msg.role === 'user' ? 'none' : '1px solid #ece9e4',
              whiteSpace: 'pre-line',
              wordBreak: 'break-word'
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                display: 'inline-block',
                animation: `pulse 1.2s ease-in-out ${delay}s infinite`
              }} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0,
        backgroundColor: '#FAFAF8',
        borderTop: '1px solid #e8e6e1',
        padding: '1.25rem 1rem 1.75rem'
      }}>
        {limitReached ? (
          <div style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '1.2rem',
            backgroundColor: '#ffffff',
            border: '1.5px solid var(--color-primary)',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(184, 134, 11, 0.08)'
          }}>
            <p style={{ margin: '0 0 0.8rem 0', fontWeight: '600', color: 'var(--color-primary-dark)', fontSize: '0.95rem' }}>
              Consulta inicial completada ({turnCount}/6 mensajes)
            </p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.86rem', color: '#64748b' }}>
              Para una revisión detallada de tus documentos y asesoría personalizada con la Dra. Jhoselyn:
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/booking')}
                style={{
                  backgroundColor: 'var(--color-primary-dark)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📅 Agendar Cita
              </button>
              <a
                href="https://wa.me/59169512921"
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                💬 WhatsApp Directo
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e0ddd8',
            borderRadius: '18px',
            padding: '0.6rem 0.6rem 0.6rem 1.1rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKeyDown}
              placeholder="Cuéntame tu situación..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '0.97rem',
                lineHeight: 1.55,
                fontFamily: 'var(--font-sans)',
                backgroundColor: 'transparent',
                color: '#2c2c2c',
                overflowY: 'hidden',
                paddingTop: '0.4rem',
                paddingBottom: '0.4rem',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                backgroundColor: input.trim() && !loading ? 'var(--color-primary-dark)' : '#e2e8f0',
                color: '#ffffff',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        )}
        <p style={{
          textAlign: 'center', marginTop: '0.7rem',
          fontSize: '0.74rem', color: '#c0b9b0'
        }}>
          {limitReached ? 'Sesión finalizada · Gracias por tu confianza' : 'Presiona Enter para enviar · Shift+Enter para salto de línea'}
        </p>
      </div>
    </div>
  );
}
