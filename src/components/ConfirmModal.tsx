import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">{title}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer ${
                isDestructive
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-[#143d2b] hover:bg-[#1b4d36]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
