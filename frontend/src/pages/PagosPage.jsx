import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Building2, Globe, Upload, CheckCircle, Copy, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

const PAYMENT_METHODS = [
  {
    id: 'qr',
    icon: <Smartphone size={28} />,
    label: 'QR Banco Bolivia',
    sublabel: 'Pago desde cualquier app bancaria boliviana',
    badge: 'Bolivia',
    badgeColor: '#1e40af',
    color: '#1d4ed8',
    bg: '#eff6ff',
    steps: [
      'Abre la app de tu banco (BNB, Banco Sol, Mercantil, etc.)',
      'Selecciona "Pago con QR" o "Transferencia QR"',
      'Escanea el código QR de abajo',
      'Ingresa el monto de la consulta o servicio',
      'Confirma el pago y envía el comprobante',
    ],
    extra: (
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <div style={{ display: 'inline-block', padding: '1rem', backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '12px' }}>
          {/* QR placeholder — reemplazar con imagen real */}
          <div style={{ width: '160px', height: '160px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
            📱 QR pendiente<br />de configurar
          </div>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.75rem' }}>Código QR de Jhoselyn Gonzales Abogada</p>
      </div>
    ),
  },
  {
    id: 'banco',
    icon: <Building2 size={28} />,
    label: 'Transferencia Bancaria',
    sublabel: 'Depósito o transferencia en Bolivia',
    badge: 'Bolivia',
    badgeColor: '#1e40af',
    color: '#0f766e',
    bg: '#f0fdfa',
    steps: [
      'Realiza una transferencia o depósito a la cuenta indicada abajo',
      'Incluye tu nombre completo como referencia',
      'Guarda el comprobante de pago',
      'Envíalo por WhatsApp para confirmar tu cita',
    ],
    extra: (
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.5rem', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid #e2e8f0' }}>
        {[
          { label: 'Banco', value: 'Banco Nacional de Bolivia (BNB)' },
          { label: 'Titular', value: 'Jhoselyn Gonzales' },
          { label: 'N° de Cuenta', value: '— Pendiente —' },
          { label: 'CI / NIT', value: '— Pendiente —' },
          { label: 'Moneda', value: 'Bolivianos (BOB)' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>{row.label}</span>
            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>{row.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'airtm',
    icon: <Globe size={28} />,
    label: 'AirTM',
    sublabel: 'Para pagos internacionales y desde EEUU',
    badge: '🇺🇸 Internacional',
    badgeColor: '#7c3aed',
    color: '#7c3aed',
    bg: '#faf5ff',
    steps: [
      'Crea una cuenta gratis en airtm.com si aún no tienes',
      'Busca el usuario @JhoselynAbogada (pendiente de confirmar)',
      'Envía el monto acordado en USD',
      'Escribe "Consulta Legal" como referencia',
      'Envía el comprobante por WhatsApp',
    ],
    extra: (
      <div style={{ backgroundColor: '#faf5ff', borderRadius: '12px', padding: '1.5rem', margin: '1rem 0', border: '1px solid #e9d5ff', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: '700', marginBottom: '0.5rem' }}>Link de pago directo (próximamente)</p>
        <div style={{ backgroundColor: '#fff', border: '2px dashed #c4b5fd', borderRadius: '8px', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          Se habilitará el link de pago de AirTM aquí.<br />Por ahora, contacta por WhatsApp para coordinar.
        </div>
      </div>
    ),
  },
  {
    id: 'ach',
    icon: <CreditCard size={28} />,
    label: 'ACH / Wire Transfer (EEUU)',
    sublabel: 'Transferencia bancaria desde banco en USA',
    badge: '🇺🇸 EEUU',
    badgeColor: '#1e40af',
    color: '#1e40af',
    bg: '#eff6ff',
    steps: [
      'Realiza una transferencia ACH o Wire desde tu banco en EEUU',
      'Usa los datos bancarios de abajo (Zelle también disponible)',
      'Incluye tu nombre y "Consulta Legal" como memo/referencia',
      'Envía el comprobante por WhatsApp o email para confirmar',
    ],
    extra: (
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.5rem', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid #e2e8f0' }}>
        {[
          { label: 'Beneficiario', value: 'Jhoselyn Gonzales' },
          { label: 'Banco', value: '— Pendiente de configurar —' },
          { label: 'Routing Number', value: '— Pendiente —' },
          { label: 'Account Number', value: '— Pendiente —' },
          { label: 'Moneda', value: 'USD' },
          { label: 'Zelle', value: '— Pendiente —' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>{row.label}</span>
            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>{row.value}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function PagosPage() {
  const navigate = useNavigate();
  const [openMethod, setOpenMethod] = useState(null);
  const [step, setStep] = useState('select'); // select | proof | done
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [proofForm, setProofForm] = useState({ name: '', phone: '', amount: '', notes: '' });
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(null);

  const whatsappBase = 'https://wa.me/591XXXXXXXXX';

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setStep('proof');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendProof = (e) => {
    e.preventDefault();
    setSending(true);
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    const msg = encodeURIComponent(
      `✅ Comprobante de Pago\n\n💳 Método: ${method?.label}\n👤 Nombre: ${proofForm.name}\n📱 WhatsApp: ${proofForm.phone}\n💰 Monto: ${proofForm.amount}\n📝 Notas: ${proofForm.notes}\n\n(Comprobante adjunto)`
    );
    setTimeout(() => {
      setSending(false);
      setStep('done');
      window.open(`${whatsappBase}?text=${msg}`, '_blank');
    }, 800);
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(250,249,246,0.96)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
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
        <div className="container" style={{ maxWidth: '860px' }}>

          {/* ===== STEP: SELECT ===== */}
          {step === 'select' && (
            <>
              {/* Hero */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(65,85,54,0.08)', color: 'var(--color-primary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <CreditCard size={14} /> Métodos de Pago
                </div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.2rem', color: 'var(--color-primary-dark)', lineHeight: 1.1, marginBottom: '1rem', fontWeight: 700 }}>
                  Opciones de Pago
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '540px', lineHeight: 1.7 }}>
                  Ofrecemos múltiples opciones para que puedas pagar desde Bolivia o desde el exterior de forma segura y sencilla.
                </p>
              </div>

              {/* Method cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                {PAYMENT_METHODS.map(method => (
                  <div key={method.id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1.5px solid ${openMethod === method.id ? method.color : '#f1f5f9'}`, overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: openMethod === method.id ? `0 4px 20px ${method.color}20` : '0 2px 6px rgba(0,0,0,0.03)' }}>
                    {/* Header row */}
                    <button
                      onClick={() => setOpenMethod(openMethod === method.id ? null : method.id)}
                      style={{ width: '100%', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: method.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: method.color, flexShrink: 0 }}>
                        {method.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem' }}>{method.label}</span>
                          <span style={{ padding: '0.2rem 0.6rem', backgroundColor: `${method.color}15`, color: method.color, borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700' }}>{method.badge}</span>
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.88rem' }}>{method.sublabel}</span>
                      </div>
                      <div style={{ color: '#94a3b8', flexShrink: 0 }}>
                        {openMethod === method.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {openMethod === method.id && (
                      <div style={{ padding: '0 1.5rem 1.5rem', borderTop: `1px solid ${method.color}20` }}>
                        {method.extra}
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Pasos a seguir</p>
                          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {method.steps.map((s, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: method.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                                {s}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <button
                          onClick={() => handleSelectMethod(method.id)}
                          style={{ backgroundColor: method.color, color: '#fff', border: 'none', padding: '0.85rem 2rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-sans)' }}>
                          Ya realicé el pago — Enviar comprobante <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <div style={{ backgroundColor: 'var(--color-primary-dark)', borderRadius: '20px', padding: '2.5rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>¿Tienes dudas sobre el pago?</h3>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>Escríbenos por WhatsApp y te orientamos sobre qué método es mejor para tu caso.</p>
                </div>
                <a href={`${whatsappBase}?text=${encodeURIComponent('Hola, tengo dudas sobre cómo realizar el pago de la consulta.')}`} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#25D366', color: '#fff', padding: '0.9rem 1.75rem', borderRadius: '10px', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                  💬 Consultar por WhatsApp
                </a>
              </div>
            </>
          )}

          {/* ===== STEP: PROOF ===== */}
          {step === 'proof' && (
            <>
              <button onClick={() => setStep('select')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '600', marginBottom: '2rem', padding: 0, fontSize: '0.95rem' }}>
                ← Volver a métodos de pago
              </button>
              <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <CheckCircle size={28} style={{ color: '#22c55e' }} />
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-primary-dark)', margin: 0 }}>Enviar Comprobante</h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.88rem' }}>Método: {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}</p>
                  </div>
                </div>
                <form onSubmit={handleSendProof} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Tu Nombre *</label>
                      <input required value={proofForm.name} onChange={e => setProofForm({ ...proofForm, name: e.target.value })} placeholder="Nombre completo" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>WhatsApp *</label>
                      <input required value={proofForm.phone} onChange={e => setProofForm({ ...proofForm, phone: e.target.value })} placeholder="+591 XXXXXXXX" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Monto Pagado *</label>
                    <input required value={proofForm.amount} onChange={e => setProofForm({ ...proofForm, amount: e.target.value })} placeholder="Ej. Bs. 150 / $25 USD" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Notas adicionales</label>
                    <textarea value={proofForm.notes} onChange={e => setProofForm({ ...proofForm, notes: e.target.value })} placeholder="Ej. pago de consulta inicial, número de transacción..." rows={3} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>

                  {/* File upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>Adjuntar Comprobante (imagen)</label>
                    <label htmlFor="proof-file" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer', backgroundColor: file ? '#f0fdf4' : '#fafafa', transition: 'all 0.2s' }}>
                      <Upload size={24} style={{ color: file ? '#22c55e' : '#94a3b8' }} />
                      <span style={{ fontSize: '0.88rem', color: file ? '#166534' : '#64748b', fontWeight: '500' }}>
                        {file ? `✓ ${file.name}` : 'Haz clic para subir o arrastra la imagen aquí'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>PNG, JPG, PDF — máx. 10MB</span>
                    </label>
                    <input id="proof-file" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  </div>

                  <div style={{ backgroundColor: '#fffbeb', borderRadius: '10px', padding: '1rem 1.25rem', border: '1px solid #fde68a', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>
                    ⚡ Al enviar, se abrirá <strong>WhatsApp</strong> con el resumen de tu pago. Adjunta también la captura del comprobante directamente en el chat para una confirmación más rápida.
                  </div>

                  <button type="submit" disabled={sending} style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'var(--font-sans)', opacity: sending ? 0.7 : 1 }}>
                    {sending ? 'Preparando...' : '💬 Enviar Comprobante por WhatsApp'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ===== STEP: DONE ===== */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>¡Comprobante Enviado!</h2>
              <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                Hemos recibido tu comprobante. Lo verificaremos y confirmaremos tu servicio o cita dentro de las próximas <strong>2 horas hábiles</strong>.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/booking')} className="btn-primary" style={{ padding: '0.9rem 2rem' }}>Agendar una Cita</button>
                <button onClick={() => { setStep('select'); setSelectedMethod(null); setProofForm({ name: '', phone: '', amount: '', notes: '' }); setFile(null); }} style={{ backgroundColor: '#fff', color: 'var(--color-primary-dark)', border: '1.5px solid var(--color-primary-dark)', padding: '0.9rem 2rem', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>
                  Realizar otro pago
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <a href="/#servicios" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Servicios</a>
            <a href="/blog" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Blog</a>
            <a href="/faq" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>FAQ</a>
            <a href="/contacto" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>Contacto</a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>© 2026 Jhoselyn Gonzales Abogada · Cochabamba, Bolivia</p>
        </div>
      </footer>
    </div>
  );
}
