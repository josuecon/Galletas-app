import React, { useState } from 'react';
import { X, Check, CreditCard, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Currency, ExpenseCategory, ExpenseType } from '../types/index.ts';
import { getTodayDateString } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Harina',
  'Azúcar',
  'Mantequilla',
  'Chocolate',
  'Ingredientes',
  'Empaques',
  'Utensilios',
  'Transporte',
  'Servicios',
  'Otros',
];

export const PayableModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addPayable, activeCurrency } = useData();

  const [supplierName, setSupplierName] = useState('');
  const [concept, setConcept] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(
    activeCurrency === 'VES' ? 'VES' : 'USD'
  );
  const [date, setDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Ingredientes');
  const [expenseType, setExpenseType] = useState<ExpenseType>('insumo');
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

    if (!supplierName.trim()) {
      setErrorMsg('Ingresa el nombre del proveedor o destinatario.');
      return;
    }

    if (!concept.trim()) {
      setErrorMsg('Ingresa el concepto de la obligación o deuda.');
      return;
    }

    setSubmitting(true);
    try {
      await addPayable({
        supplierName: supplierName.trim(),
        concept: concept.trim(),
        totalAmount: Math.round(amount * 100) / 100,
        currency,
        date,
        dueDate: dueDate || undefined,
        expenseCategory,
        expenseType,
      });

      setSupplierName('');
      setConcept('');
      setTotalAmount('');
      setDueDate('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta por pagar.');
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
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Nueva Cuenta por Pagar</h2>
              <p className="text-xs text-emerald-200/80">Dinero que el negocio debe pagar</p>
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

          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Proveedor / Destinatario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ej. Molino Central o Distribuidora El Sol"
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
              placeholder="Ej. Saco de azúcar 50kg a crédito"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Category & Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Rubro
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Naturaleza
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setExpenseType('insumo')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    expenseType === 'insumo'
                      ? 'bg-[#143d2b] text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Insumo
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseType('operativo')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    expenseType === 'operativo'
                      ? 'bg-rose-700 text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Operativo
                </button>
              </div>
            </div>
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
                Vencimiento (Opcional)
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
              {submitting ? 'Guardando...' : 'Crear Cuenta por Pagar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
