import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Calendar, Check, X, Bell, MessageCircle, Plus, Clock,
  TrendingUp, Edit2, BookOpen, FileText, Trash2, Bot, Sparkles,
  Phone, ExternalLink, Filter, Search, ArrowRight, UserPlus,
  DollarSign, Tag, MessageSquare, AlertCircle, ChevronRight,
  CheckCircle2, XCircle, ArrowUpRight, FolderKanban, List,
  Layers, Mail, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Etapas del Embudo de Ventas Legal
const CRM_STAGES = [
  { id: 'NUEVO', label: '1. Nuevos Prospectos', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', desc: 'Captados por IA / Web' },
  { id: 'CONTACTADO', label: '2. Primer Contacto', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', desc: 'En conversación inicial' },
  { id: 'ASESORIA', label: '3. Asesoría Agendada', color: '#eab308', bg: '#fefce8', border: '#fef08a', desc: 'Cita formal pendiente' },
  { id: 'PROPUESTA', label: '4. Propuesta Enviada', color: '#f97316', bg: '#fff7ed', border: '#ffedd5', desc: 'Presupuesto de honorarios' },
  { id: 'GANADO', label: '5. Casos Ganados', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Cliente activo contratado' },
  { id: 'CERRADO', label: '6. No Concretados', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', desc: 'Desistido o archivado' }
];

const LEGAL_CATEGORIES = [
  'Derecho Familiar',
  'Niñez y Adolescencia',
  'Derecho Civil y Patrimonial',
  'Servicios Internacionales (EEUU)',
  'Pro Bono',
  'Consulta General'
];

const LEAD_SOURCES = [
  'Chatbot IA',
  'Formulario Web',
  'WhatsApp Directo',
  'Campaña Redes Sociales',
  'Recomendación / Referido',
  'Oficina Cochabamba'
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('crm'); // Default to CRM
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  
  // Appointments modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppt, setNewAppt] = useState({ name: '', phone: '', email: '', date: '', time: '', reason: '' });
  
  // Appointment edit states
  const [editingAppt, setEditingAppt] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Blog states
  const [posts, setPosts] = useState([]);
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', category: '', excerpt: '', content: '', image_url: '', published: true });

  // CRM & Leads states
  const [leads, setLeads] = useState([]);
  const [crmView, setCrmView] = useState('kanban'); // 'kanban' | 'table'
  const [crmSearch, setCrmSearch] = useState('');
  const [crmFilterStage, setCrmFilterStage] = useState('ALL');
  const [crmFilterCategory, setCrmFilterCategory] = useState('ALL');
  const [crmFilterSource, setCrmFilterSource] = useState('ALL');
  const [crmFilterUrgency, setCrmFilterUrgency] = useState('ALL');

  // CRM Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    category: 'Derecho Familiar',
    source: 'WhatsApp Directo',
    stage: 'NUEVO',
    urgency: 'NORMAL',
    deal_value: '',
    case_details: '',
    initial_note: ''
  });

  const [selectedLead, setSelectedLead] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');

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
    await Promise.all([fetchAppointments(), fetchSchedule(), fetchPosts(), fetchLeads()]);
    setLoading(false);
  };

  // ==========================================
  // APPOINTMENTS FUNCTIONS
  // ==========================================
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
        const msg = `Hola ${appt.name}, soy la Dra. Jhoselyn Gonzales. Confirmo tu cita para el día ${dateFormatted} a las ${appt.time}. ¡Nos vemos!`;
        const url = `https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    } catch(e) {
        const msg = `Hola ${appt.name}, soy la Dra. Jhoselyn Gonzales. Confirmo tu cita para el día ${appt.date} a las ${appt.time}. ¡Nos vemos!`;
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

  // ==========================================
  // BLOG FUNCTIONS
  // ==========================================
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog`);
      if (res.ok) { const d = await res.json(); setPosts(d.posts || []); }
    } catch (e) { console.error(e); }
  };

  const openNewPost = () => {
    setEditingPost(null);
    setPostForm({ title: '', category: '', excerpt: '', content: '', image_url: '', published: true });
    setShowPostEditor(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostForm({ title: post.title, category: post.category || '', excerpt: post.excerpt || '', content: post.content || '', image_url: post.image_url || '', published: post.published !== false });
    setShowPostEditor(true);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog/${editingPost.post_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postForm)
        });
      } else {
        await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postForm)
        });
      }
      setShowPostEditor(false);
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const handleDeletePost = async (post_id) => {
    if (!confirm('¿Eliminar este artículo?')) return;
    await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/blog/${post_id}`, { method: 'DELETE' });
    fetchPosts();
  };

  // ==========================================
  // CRM & LEADS FUNCTIONS
  // ==========================================
  const fetchLeads = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/crm/leads`);
      if (res.ok) {
        const d = await res.json();
        setLeads(d.leads || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeadStage = async (lead_id, newStage) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.lead_id === lead_id ? { ...l, stage: newStage } : l));
      if (selectedLead && selectedLead.lead_id === lead_id) {
        setSelectedLead(prev => ({ ...prev, stage: newStage }));
      }

      await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/crm/leads/${lead_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeadField = async (lead_id, fields) => {
    try {
      setLeads(prev => prev.map(l => l.lead_id === lead_id ? { ...l, ...fields } : l));
      if (selectedLead && selectedLead.lead_id === lead_id) {
        setSelectedLead(prev => ({ ...prev, ...fields }));
      }

      await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/crm/leads/${lead_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNoteToLead = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLead) return;

    const newNote = {
      note_id: Date.now().toString(),
      text: newNoteText.trim(),
      created_at: new Date().toISOString()
    };

    const currentNotes = selectedLead.notes || [];
    const updatedNotes = [newNote, ...currentNotes];

    try {
      setSelectedLead(prev => ({ ...prev, notes: updatedNotes }));
      setNewNoteText('');
      await handleUpdateLeadField(selectedLead.lead_id, { notes: updatedNotes });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateManualLead = async (e) => {
    e.preventDefault();
    try {
      const initialNotes = newLeadForm.initial_note.trim() ? [{
        note_id: Date.now().toString(),
        text: newLeadForm.initial_note.trim(),
        created_at: new Date().toISOString()
      }] : [];

      const payload = {
        client_name: newLeadForm.client_name,
        client_phone: newLeadForm.client_phone,
        client_email: newLeadForm.client_email,
        category: newLeadForm.category,
        source: newLeadForm.source,
        stage: newLeadForm.stage,
        urgency: newLeadForm.urgency,
        deal_value: Number(newLeadForm.deal_value) || 0,
        case_summary: newLeadForm.case_details.substring(0, 300),
        case_details: newLeadForm.case_details,
        notes: initialNotes
      };

      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddLeadModal(false);
        setNewLeadForm({
          client_name: '',
          client_phone: '',
          client_email: '',
          category: 'Derecho Familiar',
          source: 'WhatsApp Directo',
          stage: 'NUEVO',
          urgency: 'NORMAL',
          deal_value: '',
          case_details: '',
          initial_note: ''
        });
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLead = async (lead_id) => {
    if (!confirm('¿Estás segura de eliminar este prospecto del CRM?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/crm/leads/${lead_id}`, {
        method: 'DELETE'
      });
      setSelectedLead(null);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper para generar el enlace de WhatsApp según la etapa del embudo
  const getStageWhatsAppUrl = (lead) => {
    const cleanPhone = (lead.client_phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) return null;
    const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : '591' + cleanPhone;

    let message = '';
    const name = lead.client_name || 'Estimado/a';
    const area = lead.category || 'su caso legal';

    switch (lead.stage) {
      case 'NUEVO':
        message = `Hola ${name}, soy la Dra. Jhoselyn Gonzales. He recibido tu consulta legal sobre ${area} en nuestro despacho. Me comunico contigo para orientarte y coordinar los detalles.`;
        break;
      case 'CONTACTADO':
        message = `Hola ${name}, soy la Dra. Jhoselyn Gonzales. Dando seguimiento a nuestra conversación sobre ${area}, ¿tienes alguna duda o te gustaría agendar la asesoría formal?`;
        break;
      case 'ASESORIA':
        message = `Hola ${name}, te saluda la Dra. Jhoselyn Gonzales. Te recuerdo nuestra cita de asesoría jurídica programada para revisar a fondo tu caso de ${area}.`;
        break;
      case 'PROPUESTA':
        message = `Hola ${name}, te saluda la Dra. Jhoselyn Gonzales. Te escribo para consultar si pudiste revisar la propuesta y honorarios que te compartí para el trámite de ${area}.`;
        break;
      case 'GANADO':
        message = `Hola ${name}, te saluda la Dra. Jhoselyn Gonzales. Te confirmo que estamos avanzando con las actuaciones legales de tu caso de ${area}.`;
        break;
      default:
        message = `Hola ${name}, soy la Dra. Jhoselyn Gonzales. Me pongo en contacto respecto a tu consulta de ${area}.`;
    }

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  // Filtrado de prospectos para el CRM
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = crmSearch === '' || 
      (lead.client_name && lead.client_name.toLowerCase().includes(crmSearch.toLowerCase())) ||
      (lead.client_phone && lead.client_phone.toLowerCase().includes(crmSearch.toLowerCase())) ||
      (lead.case_summary && lead.case_summary.toLowerCase().includes(crmSearch.toLowerCase())) ||
      (lead.case_details && lead.case_details.toLowerCase().includes(crmSearch.toLowerCase()));

    const matchesStage = crmFilterStage === 'ALL' || (lead.stage || 'NUEVO') === crmFilterStage;
    const matchesCategory = crmFilterCategory === 'ALL' || lead.category === crmFilterCategory;
    const matchesSource = crmFilterSource === 'ALL' || (lead.source || 'Chatbot IA') === crmFilterSource;
    const matchesUrgency = crmFilterUrgency === 'ALL' || lead.urgency === crmFilterUrgency;

    return matchesSearch && matchesStage && matchesCategory && matchesSource && matchesUrgency;
  });

  // Métricas del Embudo (KPIs)
  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter(l => (l.stage || 'NUEVO') === 'NUEVO').length;
  const wonLeadsCount = leads.filter(l => l.stage === 'GANADO').length;
  const inPipelineCount = leads.filter(l => ['CONTACTADO', 'ASESORIA', 'PROPUESTA'].includes(l.stage)).length;
  const conversionRate = totalLeadsCount > 0 ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0;
  
  // Pipeline Value
  const totalPipelineValue = leads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
  const wonPipelineValue = leads.filter(l => l.stage === 'GANADO').reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

  // Appointment metrics
  const pendingApptCount = appointments.filter(a => a.status === 'PENDING_APPROVAL').length;
  const approvedApptCount = appointments.filter(a => a.status === 'APPROVED').length;
  const totalApptCount = appointments.length;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: '270px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}>
          <img src="/logo.jpg" alt="Logo" style={{ height: '42px', borderRadius: '8px' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: '700' }}>Bufete Digital</h2>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Dra. Jhoselyn Gonzales</span>
          </div>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('crm')}
            style={{
              padding: '0.85rem 1rem',
              textAlign: 'left',
              background: activeTab === 'crm' ? '#10b981' : 'transparent',
              color: activeTab === 'crm' ? '#fff' : '#475569',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '600',
              fontSize: '0.92rem',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'crm' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
            }}>
            <Layers size={20} />
            <span>CRM & Embudo</span>
            {newLeadsCount > 0 && (
              <span style={{
                backgroundColor: activeTab === 'crm' ? '#ffffff' : '#ef4444',
                color: activeTab === 'crm' ? '#10b981' : '#ffffff',
                fontSize: '0.72rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                marginLeft: 'auto',
                fontWeight: '700'
              }}>
                {newLeadsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '0.85rem 1rem',
              textAlign: 'left',
              background: activeTab === 'appointments' ? '#10b981' : 'transparent',
              color: activeTab === 'appointments' ? '#fff' : '#475569',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '600',
              fontSize: '0.92rem',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'appointments' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
            }}>
            <Calendar size={20} />
            <span>Gestión de Citas</span>
            {pendingApptCount > 0 && (
              <span style={{
                backgroundColor: activeTab === 'appointments' ? '#ffffff' : '#f59e0b',
                color: activeTab === 'appointments' ? '#d97706' : '#ffffff',
                fontSize: '0.72rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                marginLeft: 'auto',
                fontWeight: '700'
              }}>
                {pendingApptCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('availability')}
            style={{
              padding: '0.85rem 1rem',
              textAlign: 'left',
              background: activeTab === 'availability' ? '#10b981' : 'transparent',
              color: activeTab === 'availability' ? '#fff' : '#475569',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '600',
              fontSize: '0.92rem',
              transition: 'all 0.2s'
            }}>
            <Clock size={20} />
            <span>Horarios Semanales</span>
          </button>

          <button 
            onClick={() => setActiveTab('blog')}
            style={{
              padding: '0.85rem 1rem',
              textAlign: 'left',
              background: activeTab === 'blog' ? '#10b981' : 'transparent',
              color: activeTab === 'blog' ? '#fff' : '#475569',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '600',
              fontSize: '0.92rem',
              transition: 'all 0.2s'
            }}>
            <BookOpen size={20} />
            <span>Blog & Noticias</span>
          </button>
        </nav>

        <button onClick={handleLogout} style={{ padding: '0.85rem 1rem', textAlign: 'left', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s' }}>
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', minWidth: 0 }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: '#0f172a', margin: '0 0 0.25rem 0', fontWeight: '700' }}>
              Bienvenida, Dra. Jhoselyn Gonzales
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem' }}>
              Control del embudo de marketing, prospectos y procesos legales del despacho.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>Dra. Jhoselyn Gonzales</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Administrador Principal</div>
            </div>
            <img src="/profile photo 1x1 vertical.png" alt="Admin" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
          </div>
        </header>

        {/* ========================================================= */}
        {/* TAB 1: CRM & EMBUDO DE VENTAS                             */}
        {/* ========================================================= */}
        {activeTab === 'crm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* KPI Analytics Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Total Prospectos</span>
                  <div style={{ padding: '0.4rem', backgroundColor: '#eef2ff', borderRadius: '8px', color: '#6366f1' }}><Bot size={18} /></div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#0f172a' }}>{totalLeadsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{newLeadsCount} nuevos por contactar</div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>En Proceso / Cita</span>
                  <div style={{ padding: '0.4rem', backgroundColor: '#fefce8', borderRadius: '8px', color: '#ca8a04' }}><Clock size={18} /></div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#0f172a' }}>{inPipelineCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#ca8a04', marginTop: '0.25rem' }}>Etapas de calificación</div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Casos Ganados</span>
                  <div style={{ padding: '0.4rem', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}><CheckCircle2 size={18} /></div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#16a34a' }}>{wonLeadsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>{conversionRate}% tasa de cierre</div>
              </div>

              <div style={{ backgroundColor: '#10b981', padding: '1.25rem', borderRadius: '16px', color: '#fff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: '600' }}>Honorarios Estimados</span>
                  <div style={{ padding: '0.4rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}><TrendingUp size={18} /></div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  Bs. {totalPipelineValue > 0 ? totalPipelineValue.toLocaleString('es-BO') : '0'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.25rem' }}>
                  Cerrado: Bs. {wonPipelineValue.toLocaleString('es-BO')}
                </div>
              </div>
            </div>

            {/* Filter & Actions Bar */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                
                {/* Search box */}
                <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '380px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, teléfono o caso..."
                    value={crmSearch}
                    onChange={e => setCrmSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem 0.65rem 2.4rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {crmSearch && (
                    <button onClick={() => setCrmSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* View Switcher & Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => setCrmView('kanban')}
                      style={{
                        padding: '0.5rem 0.85rem',
                        border: 'none',
                        borderRadius: '8px',
                        background: crmView === 'kanban' ? '#fff' : 'transparent',
                        color: crmView === 'kanban' ? '#0f172a' : '#64748b',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: crmView === 'kanban' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                      }}>
                      <FolderKanban size={16} /> Tablero Embudo
                    </button>
                    <button
                      onClick={() => setCrmView('table')}
                      style={{
                        padding: '0.5rem 0.85rem',
                        border: 'none',
                        borderRadius: '8px',
                        background: crmView === 'table' ? '#fff' : 'transparent',
                        color: crmView === 'table' ? '#0f172a' : '#64748b',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: crmView === 'table' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                      }}>
                      <List size={16} /> Lista Detallada
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    style={{
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '0.65rem 1.2rem',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                    <UserPlus size={18} /> + Nuevo Prospecto
                  </button>
                </div>
              </div>

              {/* Filters row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Filter size={14} /> Filtros:
                </span>

                <select
                  value={crmFilterStage}
                  onChange={e => setCrmFilterStage(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', color: '#334155' }}>
                  <option value="ALL">Todas las Etapas</option>
                  {CRM_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={crmFilterSource}
                  onChange={e => setCrmFilterSource(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', color: '#334155' }}>
                  <option value="ALL">Todos los Canales</option>
                  {LEAD_SOURCES.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>

                <select
                  value={crmFilterCategory}
                  onChange={e => setCrmFilterCategory(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', color: '#334155' }}>
                  <option value="ALL">Todas las Áreas</option>
                  {LEGAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={crmFilterUrgency}
                  onChange={e => setCrmFilterUrgency(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', color: '#334155' }}>
                  <option value="ALL">Cualquier Urgencia</option>
                  <option value="ALTA">🔥 Urgencia Alta</option>
                  <option value="MEDIA">⚡ Urgencia Media</option>
                  <option value="NORMAL">Normal</option>
                </select>

                {(crmFilterStage !== 'ALL' || crmFilterSource !== 'ALL' || crmFilterCategory !== 'ALL' || crmFilterUrgency !== 'ALL' || crmSearch) && (
                  <button
                    onClick={() => { setCrmFilterStage('ALL'); setCrmFilterSource('ALL'); setCrmFilterCategory('ALL'); setCrmFilterUrgency('ALL'); setCrmSearch(''); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: KANBAN PIPELINE BOARD                             */}
            {/* ========================================================= */}
            {crmView === 'kanban' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(280px, 1fr))',
                gap: '1rem',
                overflowX: 'auto',
                paddingBottom: '1rem',
                alignItems: 'start'
              }}>
                {CRM_STAGES.map(stage => {
                  const stageLeads = filteredLeads.filter(l => (l.stage || 'NUEVO') === stage.id);
                  const stageValue = stageLeads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);

                  return (
                    <div
                      key={stage.id}
                      style={{
                        backgroundColor: '#f1f5f9',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        minHeight: '480px',
                        borderTop: `4px solid ${stage.color}`
                      }}>
                      {/* Column Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>
                            {stage.label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {stage.desc}
                          </div>
                        </div>
                        <span style={{
                          backgroundColor: stage.bg,
                          color: stage.color,
                          border: `1px solid ${stage.border}`,
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px'
                        }}>
                          {stageLeads.length}
                        </span>
                      </div>

                      {stageValue > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', backgroundColor: '#ffffff', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          Estimado: Bs. {stageValue.toLocaleString('es-BO')}
                        </div>
                      )}

                      {/* Lead Cards List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {stageLeads.length === 0 ? (
                          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
                            Sin prospectos en esta etapa
                          </div>
                        ) : (
                          stageLeads.map(lead => {
                            const waUrl = getStageWhatsAppUrl(lead);
                            const notesCount = (lead.notes || []).length;

                            return (
                              <div
                                key={lead.lead_id}
                                style={{
                                  backgroundColor: '#fff',
                                  borderRadius: '12px',
                                  padding: '1rem',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.65rem',
                                  transition: 'transform 0.15s, box-shadow 0.15s'
                                }}>
                                
                                {/* Top badges */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    backgroundColor: (lead.source || '').includes('IA') ? '#eef2ff' : '#f0fdf4',
                                    color: (lead.source || '').includes('IA') ? '#4f46e5' : '#166534',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    {(lead.source || '').includes('IA') ? <Bot size={11} /> : <Tag size={11} />}
                                    {lead.source || 'Chatbot IA'}
                                  </span>

                                  {lead.urgency === 'ALTA' && (
                                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: '700' }}>
                                      🔥 Alta
                                    </span>
                                  )}
                                </div>

                                {/* Client Name & Phone */}
                                <div>
                                  <div
                                    onClick={() => setSelectedLead(lead)}
                                    style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    title="Ver Ficha Completa">
                                    {lead.client_name}
                                    <ChevronRight size={15} style={{ color: '#94a3b8' }} />
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                                    📱 {lead.client_phone || 'Sin número'}
                                  </div>
                                </div>

                                {/* Category & Summary */}
                                <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: '600', backgroundColor: '#f0f9ff', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                                  ⚖️ {lead.category || 'General'}
                                </div>

                                {lead.case_summary && (
                                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {lead.case_summary}
                                  </div>
                                )}

                                {Number(lead.deal_value) > 0 && (
                                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a' }}>
                                    💰 Bs. {Number(lead.deal_value).toLocaleString('es-BO')}
                                  </div>
                                )}

                                {/* Bottom Quick Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', gap: '0.4rem' }}>
                                  {/* Quick Stage Selector */}
                                  <select
                                    value={lead.stage || 'NUEVO'}
                                    onChange={(e) => handleUpdateLeadStage(lead.lead_id, e.target.value)}
                                    style={{
                                      padding: '0.3rem 0.5rem',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.72rem',
                                      backgroundColor: '#f8fafc',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}>
                                    {CRM_STAGES.map(s => (
                                      <option key={s.id} value={s.id}>{s.label.split('.')[0] + '.' + s.label.split('.')[1]}</option>
                                    ))}
                                  </select>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {notesCount > 0 && (
                                      <span
                                        onClick={() => setSelectedLead(lead)}
                                        style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}
                                        title={`${notesCount} nota(s) registradas`}>
                                        <MessageSquare size={13} /> {notesCount}
                                      </span>
                                    )}

                                    {waUrl && (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          backgroundColor: '#25D366',
                                          color: '#fff',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.55rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          textDecoration: 'none',
                                          fontSize: '0.75rem',
                                          fontWeight: '700'
                                        }}
                                        title="Enviar WhatsApp según etapa">
                                        <MessageCircle size={14} />
                                      </a>
                                    )}
                                  </div>
                                </div>

                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: TABLE DETAILED LIST                               */}
            {/* ========================================================= */}
            {crmView === 'table' && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.85rem' }}>Cliente</th>
                        <th style={{ padding: '0.85rem' }}>Origen & Canal</th>
                        <th style={{ padding: '0.85rem' }}>Área Legal</th>
                        <th style={{ padding: '0.85rem' }}>Etapa Embudo</th>
                        <th style={{ padding: '0.85rem' }}>Urgencia</th>
                        <th style={{ padding: '0.85rem' }}>Honorarios</th>
                        <th style={{ padding: '0.85rem' }}>Fecha</th>
                        <th style={{ padding: '0.85rem' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            No se encontraron prospectos con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map(lead => {
                          const waUrl = getStageWhatsAppUrl(lead);
                          const stageInfo = CRM_STAGES.find(s => s.id === (lead.stage || 'NUEVO')) || CRM_STAGES[0];

                          return (
                            <tr key={lead.lead_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                              <td style={{ padding: '0.85rem' }}>
                                <div
                                  onClick={() => setSelectedLead(lead)}
                                  style={{ fontWeight: '700', color: '#0f172a', cursor: 'pointer', fontSize: '0.92rem' }}>
                                  {lead.client_name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{lead.client_phone}</div>
                              </td>

                              <td style={{ padding: '0.85rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: (lead.source || '').includes('IA') ? '#eef2ff' : '#f0fdf4',
                                  color: (lead.source || '').includes('IA') ? '#4f46e5' : '#166534'
                                }}>
                                  {lead.source || 'Chatbot IA'}
                                </span>
                              </td>

                              <td style={{ padding: '0.85rem', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                                {lead.category}
                              </td>

                              <td style={{ padding: '0.85rem' }}>
                                <select
                                  value={lead.stage || 'NUEVO'}
                                  onChange={(e) => handleUpdateLeadStage(lead.lead_id, e.target.value)}
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${stageInfo.border}`,
                                    backgroundColor: stageInfo.bg,
                                    color: stageInfo.color,
                                    fontWeight: '700',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                  }}>
                                  {CRM_STAGES.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                  ))}
                                </select>
                              </td>

                              <td style={{ padding: '0.85rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  backgroundColor: lead.urgency === 'ALTA' ? '#fee2e2' : lead.urgency === 'MEDIA' ? '#fef3c7' : '#f1f5f9',
                                  color: lead.urgency === 'ALTA' ? '#dc2626' : lead.urgency === 'MEDIA' ? '#d97706' : '#64748b'
                                }}>
                                  {lead.urgency || 'NORMAL'}
                                </span>
                              </td>

                              <td style={{ padding: '0.85rem', fontSize: '0.85rem', fontWeight: '600', color: Number(lead.deal_value) > 0 ? '#16a34a' : '#94a3b8' }}>
                                {Number(lead.deal_value) > 0 ? `Bs. ${Number(lead.deal_value).toLocaleString('es-BO')}` : 'Sin cotizar'}
                              </td>

                              <td style={{ padding: '0.85rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) : '—'}
                              </td>

                              <td style={{ padding: '0.85rem' }}>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        backgroundColor: '#25D366',
                                        color: '#fff',
                                        padding: '0.4rem 0.7rem',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        textDecoration: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: '700'
                                      }}>
                                      <MessageCircle size={14} /> WhatsApp
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setSelectedLead(lead)}
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      padding: '0.4rem 0.7rem',
                                      borderRadius: '8px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}>
                                    Ficha
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GESTIÓN DE CITAS                                   */}
        {/* ========================================================= */}
        {activeTab === 'appointments' && (
          <>
            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Citas Pendientes</p>
                    <h3 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{pendingApptCount}</h3>
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
                    <h3 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{approvedApptCount}</h3>
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
                    <h3 style={{ fontSize: '2rem', margin: 0 }}>{totalApptCount}</h3>
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

        {/* ========================================================= */}
        {/* TAB 3: HORARIOS SEMANALES                                 */}
        {/* ========================================================= */}
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

        {/* ========================================================= */}
        {/* TAB 4: BLOG & NOTICIAS                                    */}
        {/* ========================================================= */}
        {activeTab === 'blog' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Blog & Noticias</h3>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Gestiona los artículos del blog. El contenido soporta formato Markdown.</p>
              </div>
              <button onClick={openNewPost} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> Nuevo Artículo
              </button>
            </div>

            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', backgroundColor: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                <BookOpen size={40} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>No hay artículos todavía. ¡Crea el primero!</p>
                <button onClick={openNewPost} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Crear artículo</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posts.map(post => (
                  <div key={post.post_id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {post.image_url && <img src={post.image_url} alt={post.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{post.title}</span>
                        {post.published === false && <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>Borrador</span>}
                        {post.category && <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{post.category}</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{new Date(post.created_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEditPost(post)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex' }} title="Editar"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeletePost(post.post_id)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', color: '#ef4444', display: 'flex' }} title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: NUEVO PROSPECTO MANUAL (CRM)                     */}
      {/* ========================================================= */}
      {showAddLeadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', margin: 0, color: '#0f172a', fontWeight: '700' }}>Registrar Nuevo Prospecto</h3>
                <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Ingreso manual de cliente potencial al embudo de ventas.</p>
              </div>
              <button onClick={() => setShowAddLeadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateManualLead} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Marco Antonio Terán"
                    value={newLeadForm.client_name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, client_name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>WhatsApp / Teléfono *</label>
                  <input
                    required
                    type="tel"
                    placeholder="Ej. 70712345 o +1 555..."
                    value={newLeadForm.client_phone}
                    onChange={e => setNewLeadForm({ ...newLeadForm, client_phone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Canal de Captación / Marketing</label>
                  <select
                    value={newLeadForm.source}
                    onChange={e => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {LEAD_SOURCES.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Área Legal del Caso</label>
                  <select
                    value={newLeadForm.category}
                    onChange={e => setNewLeadForm({ ...newLeadForm, category: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {LEGAL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Etapa Inicial</label>
                  <select
                    value={newLeadForm.stage}
                    onChange={e => setNewLeadForm({ ...newLeadForm, stage: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {CRM_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Urgencia Legal</label>
                  <select
                    value={newLeadForm.urgency}
                    onChange={e => setNewLeadForm({ ...newLeadForm, urgency: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="NORMAL">Normal</option>
                    <option value="MEDIA">⚡ Media</option>
                    <option value="ALTA">🔥 Alta</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Honorario Est. (Bs.)</label>
                  <input
                    type="number"
                    placeholder="Ej. 3500"
                    value={newLeadForm.deal_value}
                    onChange={e => setNewLeadForm({ ...newLeadForm, deal_value: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Detalles o Resumen del Caso</label>
                <textarea
                  rows={3}
                  placeholder="Explica brevemente los antecedentes del caso narrados por el cliente..."
                  value={newLeadForm.case_details}
                  onChange={e => setNewLeadForm({ ...newLeadForm, case_details: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Primera Nota de Seguimiento (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Llamó por recomendación del Dr. Pérez, acordamos enviarle requisitos mañana."
                  value={newLeadForm.initial_note}
                  onChange={e => setNewLeadForm({ ...newLeadForm, initial_note: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                <UserPlus size={18} /> Guardar e Ingresar al Embudo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: FICHA DETALLADA DEL PROSPECTO & BITÁCORA         */}
      {/* ========================================================= */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a', fontWeight: '700' }}>{selectedLead.client_name}</h3>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    backgroundColor: (selectedLead.source || '').includes('IA') ? '#eef2ff' : '#f0fdf4',
                    color: (selectedLead.source || '').includes('IA') ? '#4f46e5' : '#166534'
                  }}>
                    {selectedLead.source || 'Chatbot IA'}
                  </span>
                  {selectedLead.urgency === 'ALTA' && (
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: '700' }}>
                      🔥 Urgencia Alta
                    </span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>📱 {selectedLead.client_phone || 'Sin número'}</span>
                  <span>⚖️ {selectedLead.category}</span>
                  {selectedLead.created_at && <span>📅 Registrado: {new Date(selectedLead.created_at).toLocaleString('es-BO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Stage Progress Selector Bar */}
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>
                  Etapa Actual del Embudo:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
                  {CRM_STAGES.map((s, idx) => {
                    const isCurrent = (selectedLead.stage || 'NUEVO') === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleUpdateLeadStage(selectedLead.lead_id, s.id)}
                        style={{
                          padding: '0.6rem 0.4rem',
                          borderRadius: '8px',
                          border: isCurrent ? `2px solid ${s.color}` : '1px solid #e2e8f0',
                          backgroundColor: isCurrent ? s.bg : '#f8fafc',
                          color: isCurrent ? s.color : '#64748b',
                          fontWeight: isCurrent ? '700' : '500',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s'
                        }}>
                        {s.label.split('.')[0] + '.' + s.label.split('.')[1]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct WhatsApp Action Bar */}
              {getStageWhatsAppUrl(selectedLead) && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MessageCircle size={18} /> Mensaje WhatsApp Contextual
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.2rem' }}>
                      Plantilla adaptada a la etapa actual ({CRM_STAGES.find(s => s.id === (selectedLead.stage || 'NUEVO'))?.label}).
                    </div>
                  </div>
                  <a
                    href={getStageWhatsAppUrl(selectedLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#25D366',
                      color: '#fff',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                    <MessageCircle size={16} /> Abrir Chat de WhatsApp
                  </a>
                </div>
              )}

              {/* Case Details / AI Synthesis */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Síntesis / Antecedentes del Caso
                </div>
                <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedLead.case_details || selectedLead.case_summary || 'Sin detalles adicionales registrados.'}
                </div>
                {selectedLead.payment_preference && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                    💳 <strong>Preferencia de Pago:</strong> {selectedLead.payment_preference}
                  </div>
                )}
              </div>

              {/* Deal Value & Quick Edit Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginBottom: '0.3rem' }}>
                    Honorario Previsto / Valor del Caso (Bs.)
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedLead.deal_value || ''}
                    onBlur={(e) => handleUpdateLeadField(selectedLead.lead_id, { deal_value: Number(e.target.value) || 0 })}
                    placeholder="Ej. 4000"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginBottom: '0.3rem' }}>
                    Nivel de Urgencia
                  </label>
                  <select
                    value={selectedLead.urgency || 'NORMAL'}
                    onChange={(e) => handleUpdateLeadField(selectedLead.lead_id, { urgency: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="NORMAL">Normal</option>
                    <option value="MEDIA">⚡ Media</option>
                    <option value="ALTA">🔥 Alta</option>
                  </select>
                </div>
              </div>

              {/* Bitácora de Seguimiento / Notas */}
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={18} style={{ color: '#10b981' }} />
                  Bitácora de Notas & Seguimiento
                </div>

                {/* Form to add note */}
                <form onSubmit={handleAddNoteToLead} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Escribe una nueva nota (ej. 'Llamó la clienta, enviará certificado de matrimonio el viernes')..."
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}>
                    Añadir Nota
                  </button>
                </form>

                {/* List of notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {(!selectedLead.notes || selectedLead.notes.length === 0) ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      No hay notas de seguimiento aún. Agrega la primera arriba.
                    </div>
                  ) : (
                    selectedLead.notes.map(note => (
                      <div key={note.note_id} style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.88rem', color: '#334155' }}>{note.text}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                          {note.created_at ? new Date(note.created_at).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => handleDeleteLead(selectedLead.lead_id)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                  <Trash2 size={16} /> Eliminar Prospecto
                </button>

                <button
                  onClick={() => setSelectedLead(null)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}>
                  Listo / Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDITOR DE BLOG                                   */}
      {/* ========================================================= */}
      {showPostEditor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>{editingPost ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
              <button onClick={() => setShowPostEditor(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Título *</label>
                <input required value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} placeholder="Título del artículo" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Categoría</label>
                  <select value={postForm.category} onChange={e => setPostForm({ ...postForm, category: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Sin categoría</option>
                    <option>Derecho Familiar</option>
                    <option>Niñez y Adolescencia</option>
                    <option>Derecho Civil</option>
                    <option>Herencias</option>
                    <option>Noticias</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.4rem', fontSize: '0.85rem' }}>URL de Imagen (opcional)</label>
                  <input value={postForm.image_url} onChange={e => setPostForm({ ...postForm, image_url: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Extracto (resumen breve)</label>
                <textarea value={postForm.excerpt} onChange={e => setPostForm({ ...postForm, excerpt: e.target.value })} placeholder="Resumen de 1-2 oraciones que aparece en el listado..." rows={2} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Contenido * <span style={{ color: '#94a3b8', fontWeight: 400 }}>(soporta Markdown)</span></label>
                <textarea required value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} placeholder="## Introducción&#10;&#10;Escribe el contenido completo aquí..." rows={12} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="published" checked={postForm.published} onChange={e => setPostForm({ ...postForm, published: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="published" style={{ fontWeight: '500', color: '#334155', cursor: 'pointer', fontSize: '0.95rem' }}>Publicar ahora (visible en la web)</label>
              </div>
              <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <FileText size={18} /> {editingPost ? 'Guardar Cambios' : 'Publicar Artículo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: AÑADIR CITA MANUAL                               */}
      {/* ========================================================= */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
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

      {/* ========================================================= */}
      {/* MODAL 5: EDITAR CITA                                      */}
      {/* ========================================================= */}
      {editingAppt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>Editar Cita</h3>
              <button onClick={() => setEditingAppt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Nombre del Cliente</label>
                <input required type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Teléfono / WhatsApp</label>
                <input required type="tel" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Fecha</label>
                  <input required type="date" value={editFormData.date || ''} onChange={e => setEditFormData({...editFormData, date: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Hora</label>
                  <input required type="time" value={editFormData.time || ''} onChange={e => setEditFormData({...editFormData, time: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Motivo</label>
                <textarea value={editFormData.reason || ''} onChange={e => setEditFormData({...editFormData, reason: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', width: '100%', boxSizing: 'border-box' }}></textarea>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Estado</label>
                <select value={editFormData.status || ''} onChange={e => setEditFormData({...editFormData, status: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', backgroundColor: '#fff', boxSizing: 'border-box' }}>
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
