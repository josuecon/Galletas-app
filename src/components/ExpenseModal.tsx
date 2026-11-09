import React, { useState } from 'react';
import { X, Check, DollarSign, Calendar, Tag, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { ExpenseCategory, ExpenseType, Currency, ExpenseStatus } from '../types/index.ts';
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

export const ExpenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addExpense, activeCurrency } = useData();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Ingredientes');
  const [type, setType] = useState<ExpenseType>('insumo');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(
    activeCurrency === 'VES' ? 'VES' : 'USD'
  );
  const [date, setDate] = useState<string>(getTodayDateString());
  const [status, setStatus] = useState<ExpenseStatus>('pagado');
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-switch suggestion of type based on category
  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    if (['Harina', 'Azúcar', 'Mantequilla', 'Chocolate', 'Ingredientes'].includes(cat)) {
      setType('insumo');
    } else if (['Transporte', 'Servicios'].includes(cat)) {
      setType('operativo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Ingresa un importe válido mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Ingresa una descripción del gasto o compra.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        description: description.trim(),
        category,
        type,
        amount: Math.round(parsedAmount * 100) / 100,
        currency,
        date,
        status,
        observation: observation.trim() || undefined,
      });

      // Reset form
      setDescription('');
      setAmount('');
      setObservation('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el gasto.');
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
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Registrar Gasto o Inversión</h2>
              <p className="text-xs text-emerald-200/80">Salida de dinero o compra de insumos</p>
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

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. 5 kg de Harina de trigo leudante"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Category & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
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
                Tipo de Salida <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setType('insumo')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    type === 'insumo'
                      ? 'bg-[#143d2b] text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Insumo
                </button>
                <button
                  type="button"
                  onClick={() => setType('operativo')}
                  className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                    type === 'operativo'
                      ? 'bg-rose-700 text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Operativo
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 bg-white p-2.5 rounded-xl border border-stone-200">
            {type === 'insumo' ? (
              <span>
                <strong>Insumo (Inversión):</strong> Se contabiliza como salida de dinero pero no se deduce otra vez de la ganancia neta, ya que se incluirá en el costo de la tanda producida.
              </span>
            ) : (
              <span>
                <strong>Gasto Operativo:</strong> Se descuenta directamente de la ganancia neta (transporte, luz, gas, servicios).
              </span>
            )}
          </p>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Importe <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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

          {/* Date and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha
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
                Estado de Pago
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
              >
                <option value="pagado">Pagado de inmediato</option>
                <option value="pendiente">Pendiente (Generar cuenta por pagar)</option>
              </select>
            </div>
          </div>

          {/* Observation */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Observación (Opcional)
            </label>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ej. Comprado en la distribuidora El Trigal con descuento"
              className="w-full p-2 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-[#143d2b]"
            />
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
              {submitting ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
