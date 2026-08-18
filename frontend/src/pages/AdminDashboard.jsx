import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Calendar, Check, X, Bell, MessageCircle, Plus, Clock, TrendingUp, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppt, setNewAppt] = useState({ name: '', phone: '', email: '', date: '', time: '', reason: '' });
  
  // Edit states
  const [editingAppt, setEditingAppt] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAppointments(), fetchSchedule()]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/appointments`);
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.appointments || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAppointments(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/schedule`);
      if (res.ok) {
        const data = await res.json();
        setSchedule(data.schedule);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const notifyWhatsApp = (appt) => {
    try {
        const dateFormatted = format(parseISO(appt.date), "d 'de' MMMM", { locale: es });
        const msg = `Hola ${appt.name}, soy la Abogada Jhoselyn Gonzales. Confirmo tu cita para el día ${dateFormatted} a las ${appt.time}. ¡Nos vemos!`;
        const url = `https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    } catch(e) {
        const msg = `Hola ${appt.name}, soy la Abogada Jhoselyn Gonzales. Confirmo tu cita para el día ${appt.date} a las ${appt.time}. ¡Nos vemos!`;
        const url = `https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newAppt, status: 'APPROVED' };
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewAppt({ name: '', phone: '', email: '', date: '', time: '', reason: '' });
        fetchAppointments();
      }
    } catch(e) { console.error(e); }
  };

  const handleEditClick = (appt) => {
    setEditFormData({ ...appt });
    setEditingAppt(appt);
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/appointments/${editingAppt.appointment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingAppt(null);
        fetchAppointments();
      }
    } catch(e) { console.error(e); }
  };

  const handleSaveSchedule = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      });
      if (res.ok) {
        alert("Horarios guardados correctamente");
      }
    } catch(e) { console.error(e); }
  };

  const addTimeToSchedule = (day) => {
    const timeInput = document.getElementById(`time-${day}`);
    if (timeInput && timeInput.value) {
      const newTime = timeInput.value;
      if (!schedule[day].includes(newTime)) {
        const updated = [...schedule[day], newTime].sort();
        setSchedule({ ...schedule, [day]: updated });
      }
      timeInput.value = '';
    }
  };

  const removeTimeFromSchedule = (day, timeToRemove) => {
    const updated = schedule[day].filter(t => t !== timeToRemove);
    setSchedule({ ...schedule, [day]: updated });
  };

  // Metrics
  const pendingCount = appointments.filter(a => a.status === 'PENDING_APPROVAL').length;
  const approvedCount = appointments.filter(a => a.status === 'APPROVED').length;
  const totalCount = appointments.length;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <img src="/logo.jpg" alt="Logo" style={{ height: '40px', borderRadius: '8px' }} />
          <h2 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>Panel</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('appointments')}
            style={{ padding: '0.8rem 1rem', textAlign: 'left', background: activeTab === 'appointments' ? '#10b981' : 'transparent', color: activeTab === 'appointments' ? '#fff' : '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500', transition: 'all 0.2s' }}>
            <Calendar size={20} /> Gestión de Citas
          </button>
          <button 
            onClick={() => setActiveTab('availability')}
            style={{ padding: '0.8rem 1rem', textAlign: 'left', background: activeTab === 'availability' ? '#10b981' : 'transparent', color: activeTab === 'availability' ? '#fff' : '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500', transition: 'all 0.2s' }}>
            <Clock size={20} /> Horarios Semanales
          </button>
        </nav>

        <button onClick={handleLogout} style={{ padding: '1rem', textAlign: 'left', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              Bienvenida de nuevo, Jhoselyn
            </h1>
            <p style={{ color: '#64748b', margin: 0 }}>Aquí tienes el resumen de tus consultas.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <img src="/profile photo 1x1 vertical.png" alt="Admin" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          </div>
        </header>

        {activeTab === 'appointments' && (
          <>
            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Citas Pendientes</p>
                    <h3 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{pendingCount}</h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}>
                    <Bell size={24} />
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Citas Aprobadas</p>
                    <h3 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{approvedCount}</h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', borderRadius: '12px', color: '#16a34a' }}>
                    <Check size={24} />
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#10b981', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Total Citas</p>
                    <h3 style={{ fontSize: '2rem', margin: 0 }}>{totalCount}</h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>Registro de Citas</h3>
                <button onClick={() => setShowAddModal(true)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                  <Plus size={18} /> Añadir Cita Manual
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.9rem' }}>
                      <th style={{ padding: '1rem', fontWeight: '500' }}>CLIENTE</th>
                      <th style={{ padding: '1rem', fontWeight: '500' }}>FECHA Y HORA</th>
                      <th style={{ padding: '1rem', fontWeight: '500' }}>ESTADO</th>
                      <th style={{ padding: '1rem', fontWeight: '500' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando citas...</td></tr>
                    ) : appointments.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay citas registradas.</td></tr>
                    ) : (
                      appointments.map((appt) => (
                        <tr key={appt.appointment_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{appt.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>{appt.phone}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ color: '#0f172a', fontWeight: '500' }}>{appt.date}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>{appt.time}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                              backgroundColor: appt.status === 'APPROVED' ? '#dcfce7' : appt.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                              color: appt.status === 'APPROVED' ? '#16a34a' : appt.status === 'CANCELLED' ? '#ef4444' : '#d97706'
                            }}>
                              {appt.status === 'APPROVED' ? 'APROBADA' : appt.status === 'CANCELLED' ? 'CANCELADA' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {appt.status === 'PENDING_APPROVAL' && (
                                <>
                                  <button onClick={() => handleUpdateStatus(appt.appointment_id, 'APPROVED')} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #16a34a', color: '#16a34a', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Aprobar"><Check size={18} /></button>
                                  <button onClick={() => handleUpdateStatus(appt.appointment_id, 'CANCELLED')} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancelar"><X size={18} /></button>
                                </>
                              )}
                              {appt.status === 'APPROVED' && (
                                <button onClick={() => notifyWhatsApp(appt)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', color: '#fff', background: '#25D366', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                  <MessageCircle size={18} /> WhatsApp
                                </button>
                              )}
                              <button onClick={() => handleEditClick(appt)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#64748b', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar Cita">
                                <Edit2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'availability' && schedule && (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Horarios Semanales</h3>
                <p style={{ color: '#64748b', margin: 0 }}>Añade o elimina bloques de horas para cada día de la semana. Los clientes solo podrán agendar en estas horas exactas.</p>
              </div>
              <button onClick={handleSaveSchedule} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={18} /> Guardar Horarios
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const dayNames = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
                return (
                  <div key={day} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '120px', fontWeight: '600', color: '#334155' }}>{dayNames[day]}</div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                      {schedule[day].length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0.4rem 0' }}>No atiendes este día</span>
                      ) : (
                        schedule[day].map(time => (
                          <div key={time} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f1f5f9', color: '#0f172a', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500', border: '1px solid #e2e8f0' }}>
                            {time}
                            <button onClick={() => removeTimeFromSchedule(day, time)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 0 }} title="Eliminar hora">
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="time" 
                        id={`time-${day}`}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <button onClick={() => addTimeToSchedule(day)} style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Añadir hora">
                        <Plus size={18} />
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal Añadir Cita */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>Nueva Cita Manual</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input required type="text" placeholder="Nombre del Cliente" value={newAppt.name} onChange={e => setNewAppt({...newAppt, name: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input required type="tel" placeholder="WhatsApp" value={newAppt.phone} onChange={e => setNewAppt({...newAppt, phone: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input required type="date" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <input required type="time" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <textarea placeholder="Motivo de la consulta (Opcional)" value={newAppt.reason} onChange={e => setNewAppt({...newAppt, reason: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}></textarea>
              
              <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                Guardar Cita (Aprobada)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Cita */}
      {editingAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>Editar Cita</h3>
              <button onClick={() => setEditingAppt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Nombre del Cliente</label>
                <input required type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Teléfono / WhatsApp</label>
                <input required type="tel" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Fecha</label>
                  <input required type="date" value={editFormData.date || ''} onChange={e => setEditFormData({...editFormData, date: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Hora</label>
                  <input required type="time" value={editFormData.time || ''} onChange={e => setEditFormData({...editFormData, time: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Motivo</label>
                <textarea value={editFormData.reason || ''} onChange={e => setEditFormData({...editFormData, reason: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', width: '100%' }}></textarea>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Estado</label>
                <select value={editFormData.status || ''} onChange={e => setEditFormData({...editFormData, status: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', backgroundColor: '#fff' }}>
                  <option value="PENDING_APPROVAL">Pendiente de Aprobación</option>
                  <option value="APPROVED">Aprobada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>
              
              <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                Actualizar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
