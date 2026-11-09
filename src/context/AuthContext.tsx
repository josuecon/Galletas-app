import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import {
  initFirebaseService,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
} from '../services/firebase.ts';
import { FirebaseClientConfig } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  firebaseConfig: FirebaseClientConfig | null;
  authInstance: Auth | null;
  dbInstance: Firestore | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  saveConfig: (config: FirebaseClientConfig) => void;
  clearConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseClientConfig | null>(() =>
    getStoredFirebaseConfig()
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<{ auth: Auth | null; db: Firestore | null }>({
    auth: null,
    db: null,
  });

  // Initialize or reinitialize Firebase when config changes
  useEffect(() => {
    setError(null);
    if (!firebaseConfig) {
      setInstances({ auth: null, db: null });
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { auth, db } = initFirebaseService(firebaseConfig);
      if (!auth || !db) {
        setError('No se pudo inicializar Firebase con la configuración ingresada.');
        setLoading(false);
        return;
      }

      setInstances({ auth, db });

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }, (err) => {
        console.error('Auth state change error', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.error('Error during Firebase initialization', e);
      setError(e.message || 'Error inicializando Firebase');
      setLoading(false);
    }
  }, [firebaseConfig]);

  const handleLogin = async () => {
    if (!instances.auth) {
      setError('Firebase no está configurado aún.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(instances.auth);
    } catch (err: any) {
      console.error('Login error:', err);
      // Give clean, user-friendly messages for common Firebase popups/permissions
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('El dominio actual no está autorizado en Firebase Console > Authentication > Settings > Dominios autorizados.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('El proveedor de Google no está habilitado en Firebase Console > Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (instances.auth) {
      await logoutUser(instances.auth);
      setUser(null);
    }
  };

  const handleSaveConfig = (config: FirebaseClientConfig) => {
    saveStoredFirebaseConfig(config);
    setFirebaseConfig(config);
    window.location.reload(); // Refresh to ensure pristine initialization of Firebase App instance
  };

  const handleClearConfig = () => {
    clearStoredFirebaseConfig();
    setFirebaseConfig(null);
    setUser(null);
    window.location.reload();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: !!firebaseConfig,
      firebaseConfig,
      authInstance: instances.auth,
      dbInstance: instances.db,
      error,
      login: handleLogin,
      logout: handleLogout,
      saveConfig: handleSaveConfig,
      clearConfig: handleClearConfig,
    }),
    [user, loading, firebaseConfig, instances, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
