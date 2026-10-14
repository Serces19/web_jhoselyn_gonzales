import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { currentSession, userPool } from '../api/auth';
import '../App.css';

export default function SecureLogin() {
  const navigate = useNavigate();
  const user = useRef(null);
  const attributes = useRef({});
  const [stage, setStage] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fail = err => {
    setError(err.code === 'ExpiredCodeException' ? 'Espera el siguiente código del autenticador e inténtalo de nuevo.' : (err.message || 'No se pudo iniciar sesión'));
    setBusy(false);
  };
  const callbacks = {
    onSuccess: async () => {
      try {
        await currentSession();
        user.current.getUserData((err, data) => {
          if (err) { fail(err); return; }
          if ((data.UserMFASettingList || []).includes('SOFTWARE_TOKEN_MFA')) {
            localStorage.removeItem('admin_token'); navigate('/admin', { replace: true });
          } else {
            user.current.associateSoftwareToken({ associateSecretCode: value => {setSecret(value); setStage('setup'); setBusy(false);}, onFailure: fail });
          }
        }, { bypassCache: true });
      }
      catch (err) { fail(err); }
    },
    onFailure: fail,
    totpRequired: () => { setStage('totp'); setBusy(false); },
    mfaSetup: () => user.current.associateSoftwareToken({
      associateSecretCode: value => { setSecret(value); setStage('setup'); setBusy(false); },
      onFailure: fail,
    }),
    newPasswordRequired: attrs => {
      const { email_verified: _verified, phone_number_verified: _phone, sub: _sub, ...writable } = attrs;
      attributes.current = writable;
      setPassword(''); setStage('new-password'); setBusy(false);
    },
  };

  function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    if (stage === 'password') {
      user.current = new CognitoUser({ Username: email, Pool: userPool });
      user.current.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), callbacks);
    } else if (stage === 'new-password') {
      user.current.completeNewPasswordChallenge(password, attributes.current, callbacks);
    } else if (stage === 'totp') {
      user.current.sendMFACode(code, callbacks, 'SOFTWARE_TOKEN_MFA');
    } else {
      user.current.verifySoftwareToken(code, 'Despacho', {
        onFailure: fail,
        onSuccess: () => user.current.setUserMfaPreference(null, { Enabled: true, PreferredMfa: true }, err => {
          if (err) { fail(err); return; }
          user.current.signOut(); setSecret(''); setCode(''); setPassword(''); setStage('password'); setBusy(false);
          setError('Autenticador configurado. Espera el siguiente código e inicia sesión de nuevo para comprobarlo.');
        }),
      });
    }
  }

  return <main className="app" style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'grid', placeItems: 'center', padding: '2rem' }}>
    <section style={{ background: '#fff', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,.06)' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 0, display: 'flex', gap: '.5rem', marginBottom: '2rem' }}><ArrowLeft size={18}/> Volver</button>
      <img src="/logo.jpg" alt="Despacho Jhoselyn Gonzales" style={{ height: '70px' }}/>
      <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.7rem', margin: '1.5rem 0 .5rem' }}>Acceso al despacho</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}><ShieldCheck size={16}/> Cuenta administrativa autorizada</p>
      {stage === 'setup' && <div><p>Añade esta clave a tu aplicación autenticadora y escribe el código de seis dígitos.</p><code style={{ overflowWrap: 'anywhere', display: 'block', padding: '1rem', background: '#f8fafc' }}>{secret}</code><p>Guarda tu acceso al autenticador en un lugar seguro. Para recuperar el acceso, contacta al responsable técnico del despacho.</p></div>}
      <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        {stage === 'password' && <label>Correo<input className="form-control" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>}
        {(stage === 'password' || stage === 'new-password') && <label>{stage==='new-password' ? 'Nueva contraseña' : 'Contraseña'}<input className="form-control" type="password" autoComplete={stage==='new-password'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required/></label>}
        {(stage === 'totp' || stage === 'setup') && <label>Código del autenticador<input className="form-control" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required/></label>}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">{busy?'Verificando…':'Continuar'}</button>
      </form>
    </section>
  </main>;
}
