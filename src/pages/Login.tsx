import React, { useState } from 'react';
import type { Usuario, UserRole } from '../types';
import { Shield, Hammer, Eye, Key, Mail } from 'lucide-react';
import { isFirebaseConfigured, auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isFirebaseConfigured && auth) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        // In real app, you would fetch role from Firestore user doc.
        // For demonstration, we'll assign role based on email keyword or default to Admin.
        let rol: UserRole = 'Administrador';
        if (email.includes('residente')) rol = 'Residente';
        if (email.includes('auditor')) rol = 'Auditor';

        onLoginSuccess({
          uid: fbUser.uid,
          email: fbUser.email || email,
          nombre: fbUser.displayName || email.split('@')[0].toUpperCase(),
          rol
        });
      } else {
        setError('El servicio de Firebase no está configurado. Use el Acceso Rápido de Simulación.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (rol: UserRole) => {
    const mockUsers: Record<UserRole, Usuario> = {
      'Administrador': { uid: 'u-admin', email: 'admin@structura.com', nombre: 'Ing. Alejandro Ruiz', rol: 'Administrador' },
      'Residente': { uid: 'u-resident', email: 'residente@structura.com', nombre: 'Ing. Sofía Morales', rol: 'Residente' },
      'Auditor': { uid: 'u-auditor', email: 'auditor@structura.com', nombre: 'Mtro. Fernando Ortiz', rol: 'Auditor' }
    };
    onLoginSuccess(mockUsers[rol]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-slate-900 p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-ocean-blue opacity-10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-ocean-blue opacity-15 blur-3xl rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-lg bg-navy-slate-800 border border-slate-gray-700 rounded-xl shadow-2xl overflow-hidden p-8 animate-slide-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-ocean-blue/10 rounded-lg text-ocean-blue mb-3">
            <Hammer size={36} className="stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">STRUCTURA-PM</h1>
          <p className="text-slate-400 text-sm mt-1">Structural Project & Cost Management</p>
        </div>

        {/* Firebase Config Notice - Only shown when NOT configured to warn developer/user */}
        {!isFirebaseConfigured && (
          <div className="mb-6 p-3 bg-navy-slate-900/50 rounded-lg border border-slate-gray-700 flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs text-slate-300">
              Modo Simulación Activo (Datos Locales)
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleFirebaseLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Correo Electrónico</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="ejemplo@structura.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-navy-slate-900 border border-slate-gray-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-ocean-blue text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Key size={16} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-navy-slate-900 border border-slate-gray-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-ocean-blue text-sm transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-blue focus:ring-offset-navy-slate-800 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-navy-slate-800 px-3 text-slate-400 font-semibold tracking-wider">Acceso Rápido (Simulador)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickLogin('Administrador')}
            className="flex flex-col items-center justify-center p-2.5 bg-navy-slate-900/50 hover:bg-navy-slate-900 border border-slate-gray-700 hover:border-ocean-blue rounded transition-all text-center text-slate-200 group"
          >
            <Shield size={20} className="text-ocean-blue mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Administrador</span>
          </button>
          <button
            onClick={() => handleQuickLogin('Residente')}
            className="flex flex-col items-center justify-center p-2.5 bg-navy-slate-900/50 hover:bg-navy-slate-900 border border-slate-gray-700 hover:border-emerald-green rounded transition-all text-center text-slate-200 group"
          >
            <Hammer size={20} className="text-emerald-green mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Residente</span>
          </button>
          <button
            onClick={() => handleQuickLogin('Auditor')}
            className="flex flex-col items-center justify-center p-2.5 bg-navy-slate-900/50 hover:bg-navy-slate-900 border border-slate-gray-700 hover:border-amber-500 rounded transition-all text-center text-slate-200 group"
          >
            <Eye size={20} className="text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Auditor</span>
          </button>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-500">
          STRUCTURA-PM v1.0.0 © {new Date().getFullYear()} — Control de Obra y Análisis de Costos
        </div>
      </div>
    </div>
  );
};
