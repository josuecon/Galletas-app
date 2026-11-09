import React, { useState } from 'react';
import { X, Check, Cookie, Calculator, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Currency, Batch } from '../types/index.ts';
import { getTodayDateString, formatMoney } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batchToEdit?: Batch | null;
}

export const BatchModal: React.FC<Props> = ({ isOpen, onClose, batchToEdit }) => {
  const { addBatch, updateBatch, activeCurrency } = useData();

  const [name, setName] = useState(batchToEdit?.name || '');
  const [date, setDate] = useState(batchToEdit?.date || getTodayDateString());
  const [quantityProduced, setQuantityProduced] = useState<string>(
    batchToEdit ? String(batchToEdit.quantityProduced) : ''
  );
  const [totalCost, setTotalCost] = useState<string>(
    batchToEdit ? String(batchToEdit.totalCost) : ''
  );
  const [currency, setCurrency] = useState<Currency>(
    batchToEdit ? batchToEdit.currency : activeCurrency === 'VES' ? 'VES' : 'USD'
  );
  const [observations, setObservations] = useState(batchToEdit?.observations || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time calculation of unit cost
  const qty = parseInt(quantityProduced, 10);
  const cost = parseFloat(totalCost);
  const calculatedUnitCost =
    !isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0 ? cost / qty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa el nombre o tipo de galleta.');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('La cantidad producida debe ser un número entero mayor a 0.');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      setErrorMsg('El costo total de producción no puede ser negativo.');
      return;
    }

    setSubmitting(true);
    try {
      if (batchToEdit) {
        await updateBatch(batchToEdit.id, {
          name: name.trim(),
          date,
          quantityProduced: qty,
          totalCost: cost,
          currency,
          observations: observations.trim() || undefined,
        });
      } else {
        await addBatch({
          name: name.trim(),
          date,
          quantityProduced: qty,
          totalCost: cost,
          currency,
          observations: observations.trim() || undefined,
        });
      }

      setName('');
      setQuantityProduced('');
      setTotalCost('');
      setObservations('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la tanda.');
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
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {batchToEdit ? 'Editar Tanda de Galletas' : 'Crear Tanda de Producción'}
              </h2>
              <p className="text-xs text-emerald-200/80">
                Horneado, cantidad y costo unitario
              </p>
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

          {/* Cookie Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nombre / Tipo de Galleta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Galletas con Chispas de Chocolate o Avena y Pasas"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Date & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha de Horneado <span className="text-red-500">*</span>
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

          {/* Quantity Produced and Total Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Cantidad Producida (Unidades) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(e.target.value)}
                placeholder="Ej. 60"
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Costo Total de Producción <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="Ej. 15.00"
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>
          </div>

          {/* Automatic Unit Cost Calculation Preview */}
          <div className="p-4 rounded-2xl bg-emerald-950 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                  Costo Calculado por Galleta
                </span>
                <p className="text-xs text-emerald-200/70">
                  Costo Total / Unidades Producidas
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-300">
                {formatMoney(calculatedUnitCost, currency)}
              </span>
              <span className="block text-[10px] text-emerald-200">por galleta</span>
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej. Rinde 10 paquetes de 6 unidades"
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
              {submitting ? 'Guardando...' : batchToEdit ? 'Actualizar Tanda' : 'Crear Tanda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
