import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
};
const userPool = new CognitoUserPool(poolData);
import { ArrowLeft } from 'lucide-react';
import '../App.css';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Cognito Auth
    const authenticationDetails = new AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        localStorage.setItem('admin_token', result.getIdToken().getJwtToken());
        navigate('/admin');
      },
      onFailure: (err) => {
        alert("Error: " + (err.message || JSON.stringify(err)));
      }
    });
  };

  return (
    <div className="app" style={{ backgroundColor: '#faf9f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
         <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: '#4a5568', fontSize: '1rem', cursor: 'pointer', border: 'none' }}>
          <ArrowLeft size={18} /> Volver
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '3rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <img src="/logo.jpg" alt="Logo" style={{ height: '70px', borderRadius: '4px', marginBottom: '2rem' }} />
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--color-primary-dark)' }}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <input type="text" placeholder="Nombre completo" className="form-control" required />
          )}
          <input type="email" placeholder="Correo electrónico" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
            {isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#718096' }}>
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', marginLeft: '0.5rem', cursor: 'pointer' }}>
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
