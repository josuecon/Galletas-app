import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Si ya está instalada o ejecutándose en modo standalone, no mostrar botón
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Edge: botón discreto cuando el navegador habilita la instalación
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Instalar aplicación en este dispositivo"
        className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-[#fbf8f2] border border-emerald-500/60 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
      >
        <Smartphone className="w-4 h-4 shrink-0 text-emerald-300" />
        <span className="hidden md:inline">Instalar App</span>
      </button>
    );
  }

  // iPhone / iPad (Safari): instrucción discreta únicamente bajo clic voluntario
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Cómo instalar en iPhone o iPad"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/60 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Instalar</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-sm shadow-2xl border border-stone-200 overflow-hidden">
              <div className="bg-[#143d2b] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-300" />
                  <h3 className="text-sm font-black">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-xs text-stone-700">
                <p className="text-stone-600 leading-relaxed">
                  Para agregar <strong>Mis Galletas</strong> a tu pantalla de inicio desde Safari:
                </p>
                <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center gap-3">
                  <Share className="w-5 h-5 text-[#143d2b] shrink-0" />
                  <span>
                    1. Pulsa el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center gap-3">
                  <PlusSquare className="w-5 h-5 text-[#143d2b] shrink-0" />
                  <span>
                    2. Desliza y selecciona <strong>Agregar a inicio</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
