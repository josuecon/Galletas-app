import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, ShieldCheck, Database, KeyRound, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { FirebaseClientConfig } from '../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { firebaseConfig, isConfigured, saveConfig, clearConfig } = useAuth();
  const [jsonInput, setJsonInput] = useState('');
  const [apiKey, setApiKey] = useState(firebaseConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(firebaseConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(firebaseConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(firebaseConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(firebaseConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(firebaseConfig?.appId || '');
  const [firestoreDatabaseId, setFirestoreDatabaseId] = useState(firebaseConfig?.firestoreDatabaseId || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'form' | 'rules'>('guide');

  if (!isOpen) return null;

  const handleJsonPaste = (text: string) => {
    setJsonInput(text);
    setErrorMsg(null);
    try {
      // Find JSON object in pasted text (even if it has const firebaseConfig = { ... })
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        // Replace unquoted keys if necessary
        const sanitized = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
        const parsed = JSON.parse(sanitized);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
        if (parsed.appId) setAppId(parsed.appId);
        if (parsed.firestoreDatabaseId) setFirestoreDatabaseId(parsed.firestoreDatabaseId);
      }
    } catch {
      // Ignore parse preview errors, user can fill manually
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      setErrorMsg('Por favor completa al menos: API Key, Project ID y App ID.');
      return;
    }

    const newConfig: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      firestoreDatabaseId: firestoreDatabaseId.trim() || '(default)',
    };

    saveConfig(newConfig);
    onClose();
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isValidId(id) { return id is string && id.size() > 0 && id.size() <= 128; }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      match /expenses/{id} { allow read, write: if isOwner(userId) && isValidId(id); }
      match /batches/{id} { allow read, write: if isOwner(userId) && isValidId(id); }
      match /sales/{id} { allow read, write: if isOwner(userId) && isValidId(id); }
      match /receivables/{id} { allow read, write: if isOwner(userId) && isValidId(id); }
      match /payables/{id} { allow read, write: if isOwner(userId) && isValidId(id); }
    }
  }
}`;

  const copyRulesToClipboard = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f3] text-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[#143d2b] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Conexión a Firebase</h2>
              <p className="text-xs text-emerald-200/90">
                Almacenamiento privado y autenticación con Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConfigured ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-emerald-950">
              {isConfigured
                ? `Firebase configurado (Proyecto: ${firebaseConfig?.projectId})`
                : 'Firebase pendiente de configurar'}
            </span>
          </div>
          {isConfigured && (
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que deseas desvincular la configuración actual de Firebase?')) {
                  clearConfig();
                }
              }}
              className="text-red-700 hover:text-red-800 underline font-medium cursor-pointer"
            >
              Desvincular
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-[#143d2b] text-[#143d2b]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            1. Guía paso a paso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'form'
                ? 'border-[#143d2b] text-[#143d2b]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            2. Ingresar Credenciales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-[#143d2b] text-[#143d2b]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            3. Reglas de Seguridad
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'guide' && (
            <div className="space-y-4 text-sm text-stone-700">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Proyecto independiente de Firebase</p>
                  <p>
                    Siguiendo tus requerimientos, la aplicación no inventa credenciales falsas. Puedes conectar tu propio proyecto gratuito de Firebase en solo 2 minutos con estos pasos exactos.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-[#143d2b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Crear el proyecto en Firebase Console</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Ingresa a{' '}
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline font-medium inline-flex items-center gap-1"
                      >
                        console.firebase.google.com <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      y haz clic en <strong>"Agregar proyecto"</strong> (puedes llamarlo <em>"mi-negocio-galletas"</em>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-[#143d2b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Activar Google Authentication</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      En el menú lateral, ve a <strong>Compilación &gt; Authentication</strong>. Haz clic en "Comenzar", selecciona <strong>Google</strong> como proveedor de acceso y actívalo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-[#143d2b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Crear la base de datos Firestore</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      En el menú lateral, ve a <strong>Compilación &gt; Cloud Firestore</strong>. Haz clic en "Crear base de datos", selecciona la ubicación más cercana y confirma.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-[#143d2b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Registrar App Web y obtener credenciales</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      En la rueda de engranaje ⚙️ (Configuración del proyecto), en la sección <strong>"Tus apps"</strong>, haz clic en el ícono Web <strong>(&lt;/&gt;)</strong>. Copia el objeto <code>firebaseConfig</code> y pégalo en la pestaña "2. Ingresar Credenciales".
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white text-sm font-semibold rounded-xl shadow-sm transition cursor-pointer"
                >
                  Ingresar Credenciales &rarr;
                </button>
              </div>
            </div>
          )}

          {activeTab === 'form' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="bg-stone-100 p-3 rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Pegar bloque completo de configuración (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={jsonInput}
                  onChange={(e) => handleJsonPaste(e.target.value)}
                  placeholder='Pega aquí: const firebaseConfig = { apiKey: "...", projectId: "...", ... };'
                  className="w-full text-xs font-mono p-2 bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#143d2b]"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Al pegar el bloque, los campos individuales de abajo se completarán automáticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Project ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="mi-negocio-galletas-123"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="mi-negocio.firebaseapp.com"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    App ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Storage Bucket (opcional)
                  </label>
                  <input
                    type="text"
                    value={storageBucket}
                    onChange={(e) => setStorageBucket(e.target.value)}
                    placeholder="mi-negocio.appspot.com"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Database ID (opcional, '(default)')
                  </label>
                  <input
                    type="text"
                    value={firestoreDatabaseId}
                    onChange={(e) => setFirestoreDatabaseId(e.target.value)}
                    placeholder="(default)"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-800 font-mono text-xs focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className="text-xs text-stone-600 hover:text-stone-900 underline"
                >
                  Ver Reglas de Seguridad &rarr;
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Guardar y Conectar
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">Reglas de Seguridad para Firestore</h3>
                  <p className="text-xs text-stone-500">
                    Copia estas reglas en Firebase Console &gt; Cloud Firestore &gt; pestaña <strong>Reglas</strong> para garantizar privacidad por usuario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyRulesToClipboard}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRules ? '¡Copiado!' : 'Copiar Reglas'}
                </button>
              </div>

              <div className="bg-stone-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono overflow-x-auto max-h-64 leading-relaxed border border-stone-800">
                <pre>{firestoreRulesText}</pre>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p>
                  Estas reglas impiden que cualquier persona acceda o modifique información ajena. Todos los registros quedan protegidos exclusivamente bajo el identificador único (UID) de tu cuenta de Google.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
