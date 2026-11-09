import React, { useState } from 'react';
import {
  Cookie,
  LogIn,
  LogOut,
  Database,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { FirebaseSetupModal } from './FirebaseSetupModal.tsx';
import { BackupModal } from './BackupModal.tsx';

interface Props {
  onOpenQuickAction?: (action: string) => void;
}

export const Header: React.FC<Props> = () => {
  const { user, isConfigured, login, logout, loading, error: authError } = useAuth();
  const { activeCurrency, setActiveCurrency } = useData();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  return (
    <header className="bg-[#143d2b] text-white border-b border-emerald-950/40 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ede3d1] text-[#143d2b] flex items-center justify-center shadow-inner font-black">
              <Cookie className="w-7 h-7 text-[#143d2b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight font-serif text-[#fbf8f2]">
                  Mi Negocio de Galletas
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                  Uso Personal
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-medium hidden sm:block">
                Administración de producción, ventas, gastos y cuentas
              </p>
            </div>
          </div>

          {/* Right actions: Currencies, Firebase status, Backup, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Filter Switcher */}
            <div className="bg-emerald-950/70 p-1 rounded-xl flex items-center border border-emerald-800/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveCurrency('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeCurrency === 'ALL'
                    ? 'bg-[#ede3d1] text-[#143d2b] shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setActiveCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeCurrency === 'USD'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setActiveCurrency('VES')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeCurrency === 'VES'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                VES (Bs)
              </button>
            </div>

            {/* Backup Button */}
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              title="Copias de Seguridad"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/60 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Respaldos</span>
            </button>

            {/* Firebase config pill */}
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isConfigured
                  ? 'bg-emerald-900/40 border-emerald-600 text-emerald-300 hover:bg-emerald-800/50'
                  : 'bg-amber-950/60 border-amber-500/80 text-amber-300 hover:bg-amber-900/60 animate-pulse'
              }`}
              title="Estado de Firebase"
            >
              <Database className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">
                {isConfigured ? 'Firebase Conectado' : 'Configurar Firebase'}
              </span>
            </button>

            {/* Google Authentication */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-emerald-800/60">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Propietario'}
                    className="w-8 h-8 rounded-full border border-emerald-400"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs">
                  <p className="font-bold text-[#fbf8f2] leading-tight truncate max-w-[120px]">
                    {user.displayName || 'Propietario'}
                  </p>
                  <p className="text-[10px] text-emerald-300 truncate max-w-[120px]">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={login}
                disabled={loading || !isConfigured}
                className="px-3.5 py-1.5 rounded-xl bg-[#ede3d1] hover:bg-white text-[#143d2b] font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar con Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global alert if Firebase is not yet configured or error */}
      {!isConfigured && (
        <div className="bg-amber-500/90 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-950" />
            <span>
              <strong>Paso requerido:</strong> Conecta tu proyecto de Firebase para habilitar el inicio de sesión seguro con Google y la base de datos Firestore.
            </span>
            <button
              onClick={() => setShowSetupModal(true)}
              className="ml-auto underline font-bold hover:text-white shrink-0 cursor-pointer"
            >
              Ver instrucciones &rarr;
            </button>
          </div>
        </div>
      )}

      {authError && (
        <div className="bg-red-700 text-white px-4 py-1.5 text-xs text-center">
          {authError}
        </div>
      )}

      {/* Modals */}
      <FirebaseSetupModal isOpen={showSetupModal} onClose={() => setShowSetupModal(false)} />
      <BackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </header>
  );
};
