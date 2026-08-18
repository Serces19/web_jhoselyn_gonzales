import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import '../App.css'; // Reusing global styles

export default function BookingApp() {
  const navigate = useNavigate();
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState(addDays(today, 1));
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [details, setDetails] = useState({ name: '', phone: '', email: '', reason: '' });
  const [step, setStep] = useState(1); // 1: Date/Time, 2: Login/Details, 3: Confirmation

  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        try {
          const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/availability?date=${dateStr}`);
          const data = await res.json();
          setAvailableTimes(data.available_times || []);
          setSelectedTime(null);
        } catch (e) {
          console.error("Error fetching availability", e);
        }
      }
    };
    fetchAvailability();
  }, [selectedDate]);

  const generateDates = () => {
    return Array.from({ length: 30 }).map((_, i) => addDays(today, i + 1));
  };

  const handleNext = async () => {
    if (step === 1 && selectedTime) {
      setStep(2);
    } else if (step === 2) {
      if (!details.name || !details.phone) {
        alert("Por favor ingrese su nombre y teléfono.");
        return;
      }
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const payload = {
            name: details.name,
            phone: details.phone,
            email: details.email || '',
            date: dateStr,
            time: selectedTime,
            reason: details.reason || 'Sin motivo especificado'
        };
        const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/appointments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(res.ok) {
           setStep(3);
        } else {
           alert("Error al agendar cita");
        }
      } catch (e) {
          console.error(e);
          alert("Error de conexión");
      }
    }
  };

  return (
    <div className="app" style={{ backgroundColor: '#faf9f6', minHeight: '100vh' }}>
      <header className="header" style={{ position: 'relative', background: '#fff' }}>
        <div className="container nav">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
             <img src="/logo.jpg" alt="Logo" style={{ height: '90px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <nav className="nav-links">
            <button onClick={() => navigate('/login')} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Iniciar Sesión</button>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: '4rem 1rem', maxWidth: '800px' }}>
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: '#4a5568', marginBottom: '2rem', fontSize: '1rem' }}>
          <ArrowLeft size={18} /> Volver
        </button>

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '3rem', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>Agendar Cita</h2>
              <p style={{ color: '#718096', marginBottom: '2rem' }}>Seleccione una fecha y hora disponible. Las consultas duran 1 hora.</p>
              
              <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
                {/* Date Picker (Horizontal Scroll or Grid) */}
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={20} color="var(--color-primary)" /> Fecha
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                    {generateDates().map((date, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedDate(date)}
                        style={{ 
                          minWidth: '65px', 
                          padding: '0.8rem 0.5rem', 
                          borderRadius: '12px', 
                          border: isSameDay(date, selectedDate) ? '2px solid var(--color-primary-dark)' : '1px solid #e2e8f0',
                          backgroundColor: isSameDay(date, selectedDate) ? 'var(--color-primary-dark)' : '#fff',
                          color: isSameDay(date, selectedDate) ? '#fff' : 'inherit',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>{format(date, 'MMM', { locale: es })}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', margin: '2px 0' }}>{format(date, 'dd')}</div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>{format(date, 'EEE', { locale: es })}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Picker */}
                <div style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: '1rem' }}>Horas disponibles</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {availableTimes.length === 0 ? <p style={{color: '#718096', gridColumn: 'span 3'}}>No hay horarios disponibles.</p> : availableTimes.map((time) => {
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className="btn-secondary"
                          style={{
                            background: selectedTime === time ? 'var(--color-primary)' : '#fff',
                            color: selectedTime === time ? '#fff' : 'var(--color-primary-dark)',
                            border: selectedTime === time ? 'none' : '1px solid #e2e8f0',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                <button 
                  onClick={handleNext} 
                  disabled={!selectedTime}
                  className="btn-primary" 
                  style={{ opacity: selectedTime ? 1 : 0.5, cursor: selectedTime ? 'pointer' : 'not-allowed' }}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-primary-dark)' }}>Confirmar Datos</h2>
              <p style={{ color: '#718096', marginBottom: '2rem' }}>
                Has seleccionado el <strong>{format(selectedDate, "d 'de' MMMM", { locale: es })}</strong> a las <strong>{selectedTime}</strong>.
                Por favor ingresa tus datos o inicia sesión.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="text" placeholder="Nombre completo" className="form-control" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} />
                <input type="tel" placeholder="Número de WhatsApp" className="form-control" value={details.phone} onChange={e => setDetails({...details, phone: e.target.value})} />
                <input type="email" placeholder="Correo electrónico (Opcional)" className="form-control" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} />
                <textarea placeholder="Motivo de la consulta (Opcional)" className="form-control" rows="3" value={details.reason} onChange={e => setDetails({...details, reason: e.target.value})}></textarea>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'rgba(220, 166, 121, 0.1)', borderRadius: '12px', border: '1px solid rgba(220, 166, 121, 0.3)' }}>
                <h4 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem', fontWeight: '700' }}>Información de Pago</h4>
                <p style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>El costo de la consulta inicial es de 50 Bs. (o $15 USD para el exterior). Puedes pagar mediante <strong>QR Banco Bolivia, AirTM, Transferencia Bancaria o ACH/Zelle (EEUU)</strong>.</p>
                <a href="/pagos" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: 'var(--color-primary-dark)', color: '#fff', fontSize: '0.88rem', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
                  💳 Ver Opciones de Pago y QR →
                </a>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--color-primary-dark)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Ya tengo cuenta
                </button>
                <button onClick={handleNext} className="btn-primary">Confirmar Reserva</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle size={64} color="var(--color-primary)" style={{ margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>¡Solicitud Recibida!</h2>
              <p style={{ color: '#4a5568', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                Tu cita para el <strong>{format(selectedDate, "d 'de' MMMM", { locale: es })} a las {selectedTime}</strong> ha sido registrada.
                La abogada revisará tu solicitud y confirmaremos tu cita en breve.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/')} className="btn-primary">Volver al Inicio</button>
                <a href="/pagos" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Realizar Pago / Enviar Comprobante
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
