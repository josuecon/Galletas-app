import React, { useState, useRef } from 'react';
import { X, Download, Upload, ShieldCheck, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { AppBackup } from '../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { exportBackup, importBackup, expenses, batches, sales, receivables, payables } = useData();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewBackup, setPreviewBackup] = useState<AppBackup | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const backup = exportBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backup, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const nowStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `respaldo_galletas_${nowStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Copia de seguridad descargada exitosamente en formato JSON.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al exportar los datos.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as AppBackup;

        // Validation of backup structure
        if (!parsed || !parsed.data) {
          setErrorMsg('El archivo seleccionado no tiene la estructura de respaldo de la aplicación.');
          return;
        }

        const { expenses = [], batches = [], sales = [], receivables = [], payables = [] } = parsed.data;
        if (
          !Array.isArray(expenses) ||
          !Array.isArray(batches) ||
          !Array.isArray(sales) ||
          !Array.isArray(receivables) ||
          !Array.isArray(payables)
        ) {
          setErrorMsg('El archivo de respaldo está incompleto o dañado.');
          return;
        }

        setPreviewBackup(parsed);
      } catch (err: any) {
        setErrorMsg('Error al leer el archivo JSON: ' + (err.message || 'Formato no válido'));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!previewBackup) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      const result = await importBackup(previewBackup);
      if (result.success) {
        setSuccessMsg(`¡Éxito! Se importaron ${result.count} registros sin duplicados.`);
        setPreviewBackup(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setErrorMsg(result.error || 'Error al importar registros.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error durante la importación.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#143d2b] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Copias de Seguridad</h2>
              <p className="text-xs text-emerald-200/80">Exportar e importar todos tus registros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-900">Exportar Datos Personales</h3>
                <p className="text-xs text-stone-500">
                  Descarga un archivo JSON con todos tus gastos, tandas, ventas y deudas.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {expenses.length + batches.length + sales.length + receivables.length + payables.length} registros
              </span>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="w-full py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar todo a archivo JSON
            </button>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-black text-stone-900">Importar Copia de Seguridad</h3>
              <p className="text-xs text-stone-500">
                Carga un archivo JSON exportado previamente. El sistema validará su formato para evitar duplicados.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 cursor-pointer"
            />

            {previewBackup && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-800" />
                  Archivo validado correctamente:
                </p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-amber-900">
                  <span>• Tandas: {previewBackup.data.batches?.length || 0}</span>
                  <span>• Ventas: {previewBackup.data.sales?.length || 0}</span>
                  <span>• Gastos: {previewBackup.data.expenses?.length || 0}</span>
                  <span>• Cuentas Cobrar: {previewBackup.data.receivables?.length || 0}</span>
                  <span>• Cuentas Pagar: {previewBackup.data.payables?.length || 0}</span>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewBackup(null)}
                    className="px-3 py-1.5 border border-stone-300 rounded-lg text-[11px] font-bold text-stone-700 bg-white"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmImport}
                    className="px-4 py-1.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {importing ? 'Importando...' : 'Confirmar e Importar a Firestore'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
