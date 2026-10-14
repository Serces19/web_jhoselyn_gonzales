import { CognitoUserPool } from 'amazon-cognito-identity-js';

export const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export function currentSession() {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.reject(new Error('Inicia sesión para continuar'));
  return new Promise((resolve, reject) => user.getSession((error, session) => {
    if (error || !session?.isValid()) { reject(error || new Error('Sesión vencida')); return; }
    const groups = session.getAccessToken().payload['cognito:groups'] || [];
    if (!groups.includes('Admins')) { user.signOut(); reject(new Error('No tienes permiso administrativo')); return; }
    resolve({ user, session });
  }));
}

export function signOut() {
  userPool.getCurrentUser()?.signOut();
  localStorage.removeItem('admin_token');
}
