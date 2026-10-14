import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  ['Quién recibe tu consulta', <p key="responsible">El despacho de la Dra. Jhoselyn Gonzales, en Cochabamba, Bolivia.
    Para consultar sobre tus datos, escribe a <a href="mailto:scope.estudio@gmail.com?subject=Consulta%20sobre%20mis%20datos">scope.estudio@gmail.com</a>
    {' '}o al <a href="https://wa.me/59169512921">WhatsApp del despacho</a>.</p>],
  ['Qué información compartes', <p key="data">El formulario de citas recoge nombre, teléfono, correo si lo proporcionas,
    motivo y horario solicitado. El formulario Pro Bono también recoge ubicación, tipo de consulta, descripción y
    la información económica que escribas. Contacto y pagos abren WhatsApp para que revises y envíes tu mensaje allí.</p>],
  ['Para qué se utiliza', <p key="purpose">Para revisar tu solicitud, coordinar una cita y realizar seguimiento desde el
    panel del despacho. Enviar un formulario no confirma la aceptación de un caso ni el pago de honorarios.
    Comparte un resumen breve; evita documentos de identidad, datos de menores y detalles íntimos en formularios públicos.</p>],
  ['Almacenamiento y acceso', <p key="storage">Los formularios guardados y registros de atención se alojan en servicios
    de Amazon Web Services en Estados Unidos. El panel requiere una cuenta autorizada. Se conservan respaldos y registros
    técnicos para recuperar información y detectar fallos. Los registros técnicos de la aplicación se retienen 30 días.</p>],
  ['Conservación y solicitudes', <p key="retention">Actualmente, las citas y solicitudes guardadas no tienen eliminación
    automática por plazo. Puedes contactar al despacho para solicitar revisión, acceso, corrección o eliminación de tus
    datos. La solicitud se revisa personalmente; el sitio no realiza ni confirma una eliminación automática.</p>],
  ['WhatsApp y atención automática', <p key="providers">Al usar WhatsApp, tu mensaje se envía a través de ese servicio
    y se aplican sus condiciones. La IA de este sitio está desactivada: el chat ofrece los canales de contacto y no
    invoca un modelo. Si se cambia ese funcionamiento, se actualizará este aviso antes de activarlo.</p>],
];

export default function PrivacyPage() {
  return <main className="app" style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '3rem 1.25rem 5rem' }}>
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-flex', gap: '.5rem', alignItems: 'center', marginBottom: '2rem', color: 'var(--color-primary-dark)' }}>
        <ArrowLeft size={18}/> Volver al inicio
      </Link>
      <img src="/logo.jpg" alt="Despacho Jhoselyn Gonzales" style={{ display: 'block', height: '75px', marginBottom: '2rem' }}/>
      <p style={{ color: 'var(--color-accent)', letterSpacing: '.1em', fontSize: '.8rem', textTransform: 'uppercase' }}>Información para quienes nos contactan</p>
      <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-primary-dark)', fontSize: 'clamp(2.2rem, 6vw, 3.7rem)', lineHeight: 1.1, margin: '1rem 0' }}>Cómo tratamos tus datos</h1>
      <p style={{ color: '#64748b', marginBottom: '2.5rem' }}>Actualizado el 14 de octubre de 2026.</p>
      <div style={{ background: '#fff', border: '1px solid #e8e4da', padding: 'clamp(1.4rem, 4vw, 3rem)', borderRadius: '14px' }}>
        {sections.map(([title, content], index) => <section key={title} style={{ paddingBottom: '1.6rem', marginBottom: '1.6rem', borderBottom: index < sections.length - 1 ? '1px solid #e8e4da' : 'none' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-primary-dark)', fontSize: '1.45rem', marginBottom: '.65rem' }}>{title}</h2>
          <div style={{ color: '#475569', lineHeight: 1.8 }}>{content}</div>
        </section>)}
      </div>
    </div>
  </main>;
}
