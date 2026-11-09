import React, { useState } from 'react';
import { Cookie, Plus, ShoppingCart, Trash2, Edit3, AlertCircle, Layers } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Batch } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { BatchModal } from './BatchModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onSellBatch?: (batchId: string) => void;
  onOpenCreateBatch: () => void;
}

export const ProductionView: React.FC<Props> = ({ onSellBatch, onOpenCreateBatch }) => {
  const { batches, deleteBatch, activeCurrency } = useData();
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter by currency
  const filteredBatches = batches.filter((b) => {
    if (activeCurrency !== 'ALL' && b.currency !== activeCurrency) {
      return false;
    }
    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!deletingBatchId) return;
    setErrorMsg(null);
    try {
      await deleteBatch(deletingBatchId);
      setDeletingBatchId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar la tanda.');
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Cookie className="w-6 h-6 text-[#143d2b]" />
            Módulo de Producción (Tandas de Galletas)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Registro de horneados, cálculo automático del costo unitario y control de unidades disponibles.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateBatch}
          className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Tanda de Producción
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Batches Grid */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <Cookie className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No hay tandas de producción registradas</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
            Comienza horneando tu primera tanda para calcular su costo por galleta y tener unidades disponibles para la venta.
          </p>
          <button
            type="button"
            onClick={onOpenCreateBatch}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            Crear Primera Tanda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => {
            const available = Math.max(0, batch.quantityProduced - batch.quantitySold);
            const percentageSold =
              batch.quantityProduced > 0
                ? Math.min(100, Math.round((batch.quantitySold / batch.quantityProduced) * 100))
                : 0;

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Name & Currency */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-black text-stone-900 leading-snug">
                      {batch.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-white shrink-0 ${
                        batch.currency === 'USD' ? 'bg-emerald-700' : 'bg-amber-600'
                      }`}
                    >
                      {batch.currency}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 mb-4">
                    Horneada el {formatDate(batch.date)}
                  </p>

                  {/* Stock status indicator */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Disponibles:</span>
                      <strong
                        className={`text-sm font-black ${
                          available > 0 ? 'text-emerald-800' : 'text-stone-400'
                        }`}
                      >
                        {available} galletas
                      </strong>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#143d2b] h-full transition-all duration-300"
                        style={{ width: `${percentageSold}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>Producidas: {batch.quantityProduced}</span>
                      <span>Vendidas: {batch.quantitySold}</span>
                    </div>
                  </div>

                  {/* Cost breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 mb-4">
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Costo Total Tanda
                      </span>
                      <span className="font-black text-stone-900">
                        {formatMoney(batch.totalCost, batch.currency)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        Costo por Galleta
                      </span>
                      <span className="font-black text-emerald-900">
                        {formatMoney(batch.unitCost, batch.currency)}
                      </span>
                    </div>
                  </div>

                  {batch.observations && (
                    <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg border border-stone-100 mb-4">
                      "{batch.observations}"
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingBatch(batch)}
                      title="Editar Tanda"
                      className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBatchId(batch.id)}
                      title="Eliminar Tanda"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {available > 0 && onSellBatch && (
                    <button
                      type="button"
                      onClick={() => onSellBatch(batch.id)}
                      className="px-3.5 py-1.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Vender de esta tanda
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingBatch && (
        <BatchModal
          isOpen={!!editingBatch}
          onClose={() => setEditingBatch(null)}
          batchToEdit={editingBatch}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingBatchId}
        title="¿Eliminar esta tanda de producción?"
        message="Esta acción no se puede deshacer. Solo puedes eliminar tandas que no tengan ventas asociadas."
        confirmLabel="Eliminar Tanda"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingBatchId(null)}
      />
    </div>
  );
};
