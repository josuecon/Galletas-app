import React, { useState } from 'react';
import {
  Cookie,
  Plus,
  ShoppingCart,
  Trash2,
  Edit3,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Batch } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { BatchModal } from './BatchModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';
import { RegularizeBatchModal } from './RegularizeBatchModal.tsx';

interface Props {
  onSellBatch?: (batchId: string) => void;
  onOpenCreateBatch: () => void;
}

export const ProductionView: React.FC<Props> = ({ onSellBatch, onOpenCreateBatch }) => {
  const { batches, deleteBatch } = useData();
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para controlar qué tarjetas tienen su receta desplegada
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  // Estado para el modal de regularización de tanda provisional
  const [regularizingBatch, setRegularizingBatch] = useState<{
    batch: Batch;
    ingredientId?: string;
  } | null>(null);

  const toggleExpandBatch = (batchId: string) => {
    setExpandedBatchIds((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  const filteredBatches = batches;

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
            Registro de horneados con consumo de inventario, cálculo de costo unitario y regularización de tandas provisionales.
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
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between gap-2 font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xs p-1 rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            Cerrar
          </button>
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

            const isExpanded = !!expandedBatchIds[batch.id];
            const hasRecipe = batch.ingredientsUsed && batch.ingredientsUsed.length > 0;
            const hasSales = batch.quantitySold > 0;
            const isProvisional = batch.costStatus === 'provisional';

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Name & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-black text-stone-900 leading-snug">
                      {batch.name}
                    </h3>
                  </div>

                  <p className="text-[11px] text-stone-500 mb-3">
                    Horneada el {formatDate(batch.date)}
                  </p>

                  {/* Badges de Estado (Manual vs. Definitivo vs. Provisional y Faltantes) */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {batch.isManualCost ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          Costo Manual
                        </span>
                      ) : (
                        <>
                          {batch.costStatus === 'definitivo' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Costo Definitivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Costo Provisional
                            </span>
                          )}

                          {batch.stockStatus === 'stock_incompleto' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Faltantes de Inventario
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Botón de Regularizar Faltantes si la tanda es provisional */}
                    {isProvisional && (
                      <button
                        type="button"
                        onClick={() => setRegularizingBatch({ batch })}
                        className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Regularizar faltantes de inventario para fijar el costo definitivo"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regularizar</span>
                      </button>
                    )}
                  </div>

                  {/* Stock status indicator */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3.5 space-y-2">
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
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 mb-3">
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Costo Total Tanda
                      </span>
                      <span className="font-black text-stone-900">
                        {formatMoney(batch.totalCost)}
                      </span>
                      {batch.otherDirectCostsAmount && batch.otherDirectCostsAmount > 0 ? (
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Incluye {formatMoney(batch.otherDirectCostsAmount)} directos
                        </span>
                      ) : null}
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        Costo por Galleta
                      </span>
                      <span className="font-black text-emerald-900">
                        {formatMoney(batch.unitCost)}
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        por unidad
                      </span>
                    </div>
                  </div>

                  {/* Desglose expandible de ingredientes consumidos */}
                  {hasRecipe && batch.ingredientsUsed && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => toggleExpandBatch(batch.id)}
                        className="w-full py-2 px-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-[#143d2b]" />
                          Receta ({batch.ingredientsUsed.length} insumos)
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs animate-fade-in">
                          {batch.ingredientsUsed.map((ingUsage, idx) => {
                            const physicalShortage = Math.max(
                              0,
                              Math.round(
                                (ingUsage.requiredBaseQty - ingUsage.physicallyCoveredBaseQty) * 10000
                              ) / 10000
                            );
                            const valueShortage = ingUsage.uncoveredBaseQty;

                            return (
                              <div
                                key={idx}
                                className="p-2.5 bg-white rounded-xl border border-stone-200/80 space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between font-bold text-stone-900">
                                  <span>{ingUsage.ingredientName}</span>
                                  <span className="text-emerald-800 font-black">
                                    {formatMoney(ingUsage.coveredCost)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600">
                                  <div>
                                    <span className="text-stone-400">Requerido: </span>
                                    <span className="font-semibold text-stone-800">
                                      {ingUsage.requiredQuantity} {ingUsage.requiredUnit}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-stone-400">Cubierto almacén: </span>
                                    <span className="font-semibold text-stone-800">
                                      {ingUsage.physicallyCoveredBaseQty}
                                    </span>
                                  </div>
                                </div>

                                {/* Diagnóstico de faltante económico y físico */}
                                {valueShortage > 0 ? (
                                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>Faltante a valorizar: {valueShortage}</span>
                                      </div>
                                      {physicalShortage > 0 && (
                                        <div className="text-[10px] text-amber-800">
                                          Faltante físico en almacén: {physicalShortage}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRegularizingBatch({
                                          batch,
                                          ingredientId: ingUsage.ingredientId,
                                        })
                                      }
                                      className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer shrink-0"
                                      title="Regularizar este ingrediente"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      Regularizar
                                    </button>
                                  </div>
                                ) : physicalShortage > 0 ? (
                                  <div className="p-1.5 bg-stone-100 rounded-lg border border-stone-200 text-[10px] text-stone-600 flex items-center gap-1">
                                    <Info className="w-3 h-3 text-stone-500 shrink-0" />
                                    <span>
                                      100% Valorizado • Faltante físico de almacén no repuesto: {physicalShortage}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> 100% Cubierto de inventario y valorizado
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {batch.observations && (
                    <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg border border-stone-100 mb-3">
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

                    {/* Botón de eliminación protegido si tiene ventas asociadas */}
                    <button
                      type="button"
                      disabled={hasSales}
                      onClick={() => {
                        if (!hasSales) setDeletingBatchId(batch.id);
                      }}
                      title={
                        hasSales
                          ? 'Esta tanda tiene ventas asociadas y no puede eliminarse'
                          : 'Eliminar Tanda'
                      }
                      className={`p-2 rounded-xl transition ${
                        hasSales
                          ? 'text-stone-300 cursor-not-allowed opacity-50'
                          : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
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

      {/* Regularize Modal */}
      {regularizingBatch && (
        <RegularizeBatchModal
          isOpen={!!regularizingBatch}
          onClose={() => setRegularizingBatch(null)}
          batch={regularizingBatch.batch}
          initialIngredientId={regularizingBatch.ingredientId}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingBatchId}
        title="¿Eliminar esta tanda de producción?"
        message="Esta acción reintegrará al inventario los insumos consumidos que fueron cubiertos físicamente. Solo puedes eliminar tandas que no tengan ventas asociadas."
        confirmLabel="Eliminar Tanda"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingBatchId(null)}
      />
    </div>
  );
};
