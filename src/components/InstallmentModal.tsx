import React, { useState } from 'react';
import { X, Check, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { Receivable, Payable } from '../types/index.ts';
import { getTodayDateString, formatMoney } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'receivable' | 'payable';
  item: Receivable | Payable | null;
  onConfirm: (amount: number, date: string, notes?: string) => Promise<void>;
}

export const InstallmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  type,
  item,
  onConfirm,
}) => {
  if (!isOpen || !item) return null;

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pending = Math.max(0, item.pendingBalance);
  const isReceivable = type === 'receivable';
  const personName = isReceivable
    ? (item as Receivable).customerName
    : (item as Payable).supplierName;

  const handlePayFull = () => {
    setAmount(pending.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (parsed > pending + 0.001) {
      setErrorMsg(
        `El monto ingresado (${parsed}) no puede superar el saldo pendiente (${pending}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(Math.round(parsed * 100) / 100, date, notes.trim() || undefined);
      setAmount('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el abono.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isReceivable ? 'bg-[#143d2b]' : 'bg-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {isReceivable ? 'Registrar Cobro / Abono' : 'Registrar Pago de Deuda'}
              </h2>
              <p className="text-xs text-white/80">
                {isReceivable ? 'Entrada de dinero de cliente' : 'Salida de dinero a proveedor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-white border-b border-stone-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-stone-500">{isReceivable ? 'Cliente:' : 'Proveedor:'}</span>
            <strong className="text-stone-900 font-bold">{personName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Concepto:</span>
            <span className="text-stone-700">{item.concept}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-100">
            <span className="text-stone-500">Total Obligación:</span>
            <span className="font-semibold">{formatMoney(item.totalAmount, item.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Ya Pagado / Cobrado:</span>
            <span className="text-emerald-700 font-semibold">
              {formatMoney(item.totalPaid, item.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-100">
            <span className="text-stone-800">Saldo Pendiente:</span>
            <span className={isReceivable ? 'text-amber-800 font-black' : 'text-rose-800 font-black'}>
              {formatMoney(pending, item.currency)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount to pay */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Monto del Abono ({item.currency}) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-xs font-bold text-[#143d2b] hover:underline cursor-pointer"
              >
                Pagar todo ({pending.toFixed(2)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={pending}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-base font-black focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Fecha del Pago <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Notes / Method */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Referencia / Método (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Pago móvil ref #5821, efectivo en mano"
              className="w-full p-2 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isReceivable
                  ? 'bg-[#143d2b] hover:bg-[#1b4d36]'
                  : 'bg-rose-800 hover:bg-rose-900'
              }`}
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Procesando...' : 'Confirmar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
