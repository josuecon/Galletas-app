import React, { useState } from 'react';
import { X, Check, UserCheck, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Currency } from '../types/index.ts';
import { getTodayDateString } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceivableModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addReceivable, activeCurrency } = useData();

  const [customerName, setCustomerName] = useState('');
  const [concept, setConcept] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(
    activeCurrency === 'VES' ? 'VES' : 'USD'
  );
  const [date, setDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Ingresa un importe válido mayor a 0.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Ingresa el nombre del cliente o persona.');
      return;
    }

    if (!concept.trim()) {
      setErrorMsg('Ingresa el concepto de la cuenta por cobrar.');
      return;
    }

    setSubmitting(true);
    try {
      await addReceivable({
        customerName: customerName.trim(),
        concept: concept.trim(),
        totalAmount: Math.round(amount * 100) / 100,
        currency,
        date,
        dueDate: dueDate || undefined,
      });

      setCustomerName('');
      setConcept('');
      setTotalAmount('');
      setDueDate('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta por cobrar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#143d2b] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Nueva Cuenta por Cobrar</h2>
              <p className="text-xs text-emerald-200/80">Dinero que deben al negocio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nombre del Cliente / Persona <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. María Rodríguez"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Concept */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Pedido especial 24 galletas surtidas"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Importe Total <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Moneda <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    currency === 'USD'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    currency === 'VES'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  VES (Bs)
                </button>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha de Emisión <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha Vencimiento (Opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Crear Cuenta por Cobrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
