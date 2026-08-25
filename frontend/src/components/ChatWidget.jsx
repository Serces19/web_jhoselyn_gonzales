import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, CreditCard, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'Quiero consultar sobre Divorcio',
  'Asistencia Familiar / Pensión',
  'Herencias y Sucesiones',
  'Soy boliviano en Estados Unidos',
];

export default function ChatWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy el Asistente Jurídico Virtual de la Dra. Jhoselyn Gonzales. Cuéntame con toda confianza, ¿en qué situación legal o familiar te encuentras hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let sId = sessionStorage.getItem('jhoselyn_chat_session_id');
    if (!sId) {
      sId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('jhoselyn_chat_session_id', sId);
    }
    setSessionId(sId);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: messageText.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg = {
          id: 'bot_' + Date.now(),
          role: 'assistant',
          text: data.response || 'Gracias por tu mensaje. He tomado nota de tu consulta.',
          lead: data.lead
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error('Error al conectar con el servidor');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          text: 'Comprendo tu caso. Puedes dejarnos tu nombre y WhatsApp para que la Dra. Jhoselyn Gonzales evalúe tu situación de forma personalizada, o si prefieres, puedes agendar una cita directamente.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '6.5rem',
            right: '2rem',
            backgroundColor: 'var(--color-primary-dark)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '0.85rem 1.4rem',
            boxShadow: '0 8px 24px rgba(65,85,54,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            zIndex: 998,
            fontFamily: 'var(--font-sans)',
            fontWeight: '600',
            fontSize: '0.95rem',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(65,85,54,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(65,85,54,0.3)'; }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Sparkles size={18} style={{ color: 'var(--color-accent-light)' }} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
          </div>
          <span>Consulta con IA</span>
        </button>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '560px',
            maxHeight: 'calc(100vh - 4rem)',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(15,23,42,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 999,
            fontFamily: 'var(--font-sans)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: 'var(--color-primary-dark)',
              color: '#ffffff',
              padding: '1.2rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid rgba(255,255,255,0.3)'
                }}
              >
                <Bot size={20} style={{ color: 'var(--color-accent-light)' }} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', lineHeight: 1.2 }}>Asistente Jurídico</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#4ade80', borderRadius: '50%' }}></span>
                  En línea · Dra. Jhoselyn Gonzales
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '1.2rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: '#f8fafc'
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: msg.role === 'user' ? 'var(--color-primary-dark)' : '#ffffff',
                    color: msg.role === 'user' ? '#ffffff' : '#334155',
                    fontSize: '0.9rem',
                    lineHeight: 1.55,
                    boxShadow: msg.role === 'user' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                    border: msg.role === 'user' ? 'none' : '1px solid #f1f5f9',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div style={{ fontSize: '0.9rem' }}>
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.55 }} {...props} />,
                          strong: ({ node, ...props }) => <strong style={{ fontWeight: '700', color: 'var(--color-primary-dark)' }} {...props} />,
                          em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
                          ul: ({ node, ...props }) => <ul style={{ margin: '0.3rem 0 0.5rem 1.1rem', padding: 0 }} {...props} />,
                          ol: ({ node, ...props }) => <ol style={{ margin: '0.3rem 0 0.5rem 1.1rem', padding: 0 }} {...props} />,
                          li: ({ node, ...props }) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                          a: ({ node, ...props }) => <a style={{ color: 'var(--color-primary-dark)', fontWeight: '600', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>
                  )}
                </div>

                {/* Quick actions if lead or conversion suggested */}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/booking'); }}
                      style={{
                        backgroundColor: 'rgba(65,85,54,0.08)',
                        color: 'var(--color-primary-dark)',
                        border: '1px solid rgba(65,85,54,0.2)',
                        borderRadius: '20px',
                        padding: '0.35rem 0.8rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Calendar size={13} /> Agendar Cita
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/pagos'); }}
                      style={{
                        backgroundColor: 'rgba(184,109,71,0.08)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgba(184,109,71,0.2)',
                        borderRadius: '20px',
                        padding: '0.35rem 0.8rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <CreditCard size={13} /> Opciones de Pago
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                  <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }}></span>
                </div>
                <span>Escribiendo orientación...</span>
              </div>
            )}

            {/* Quick prompt suggestions for first turn */}
            {messages.length === 1 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                  Sugerencias rápidas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      style={{
                        textAlign: 'left',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.6rem 0.9rem',
                        fontSize: '0.85rem',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'border-color 0.2s, background 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    >
                      <span>{p}</span>
                      <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div
            style={{
              padding: '0.9rem 1.1rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Describe tu caso o haz una pregunta..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '25px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: input.trim() && !loading ? 'var(--color-primary-dark)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
