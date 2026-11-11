import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  PiggyBank,
  ArrowDownCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Boxes,
  AlertCircle,
  Ban,
  X,
} from 'lucide-react';
import { useData, isInventoryLinkedExpense } from '../context/DataContext.tsx';
import { Expense } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onOpenCreateExpense: () => void;
}

export const ExpensesView: React.FC<Props> = ({ onOpenCreateExpense }) => {
  const { expenses, deleteExpense, reverseExpense } = useData();
  const [filterType, setFilterType] = useState<'all' | 'insumo' | 'operativo'>('all');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Reversal modal state
  const [reversingExpense, setReversingExpense] = useState<Expense | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [isReversing, setIsReversing] = useState<boolean>(false);

  // User visible alert state for error feedback
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) {
      return false;
    }
    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteExpense(deletingExpenseId);
      setDeletingExpenseId(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Error al eliminar el gasto.');
      setDeletingExpenseId(null);
    }
  };

  const handleReverseConfirm = async () => {
    if (!reversingExpense) return;
    setIsReversing(true);
    try {
      await reverseExpense(reversingExpense.id, reversalReason.trim() || undefined);
      setReversingExpense(null);
      setReversalReason('');
    } catch (err: any) {
      console.error('Error al revertir compra:', err);
      setActionError(err.message || 'Error al anular la compra de materia prima.');
      setReversingExpense(null);
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-700" />
            Módulo de Gastos e Inversiones
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Registro de compras de insumos (harina, azúcar, etc.) y gastos operativos (servicios, empaques, transporte).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Type Pills */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('insumo')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === 'insumo' ? 'bg-[#143d2b] text-white shadow-xs' : 'text-stone-500'
              }`}
            >
              Insumos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('operativo')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === 'operativo' ? 'bg-rose-700 text-white shadow-xs' : 'text-stone-500'
              }`}
            >
              Operativos
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreateExpense}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Visible Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xs p-1 rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No hay gastos ni inversiones registrados</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
            Registra compras de ingredientes o gastos del negocio para llevar las cuentas claras.
          </p>
          <button
            type="button"
            onClick={onOpenCreateExpense}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            Registrar Primer Gasto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((expense) => {
            const isInsumo = expense.type === 'insumo';
            const isLinked = isInventoryLinkedExpense(expense);
            const isCanceled = expense.status === 'anulado' || expense.isReversed === true;

            return (
              <div
                key={expense.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  isCanceled ? 'border-stone-300 opacity-75 bg-stone-50/60' : 'border-stone-200'
                }`}
              >
                <div>
                  {/* Top: Category pill and Currency indicator */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-800">
                      {expense.category}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      USD ($)
                    </span>
                  </div>

                  {/* Description */}
                  <h3 className={`text-base font-black mb-1 leading-snug ${isCanceled ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                    {expense.description}
                  </h3>

                  <p className="text-[11px] text-stone-500 mb-3">
                    Registrado el {formatDate(expense.date)}
                  </p>

                  {/* Classification badge */}
                  <div className="mb-3">
                    {isCanceled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">
                        <Ban className="w-3.5 h-3.5 text-stone-600" />
                        Compra Anulada / Revertida
                      </span>
                    ) : isLinked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Boxes className="w-3.5 h-3.5 text-amber-700" />
                        Compra de Materia Prima
                      </span>
                    ) : isInsumo ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <PiggyBank className="w-3.5 h-3.5 text-emerald-700" />
                        Inversión en Insumos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-900 border border-rose-200">
                        <ArrowDownCircle className="w-3.5 h-3.5 text-rose-700" />
                        Gasto Operativo
                      </span>
                    )}
                  </div>

                  {/* Inventory-specific details if linked */}
                  {isLinked && (
                    <div className="mb-3 p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-amber-950 font-bold">
                        <span className="text-[11px] uppercase tracking-wider text-amber-800">Insumo:</span>
                        <span>{expense.ingredientName || 'Ingrediente de inventario'}</span>
                      </div>
                      {expense.purchaseQuantity !== undefined && (
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="text-[11px] uppercase tracking-wider text-stone-500">Cantidad:</span>
                          <span className="font-bold text-stone-900">
                            {expense.purchaseQuantity} {expense.purchaseUnit || ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount and Status */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Importe
                      </span>
                      <span className={`text-lg font-black ${isCanceled ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                        {formatMoney(expense.amount)}
                      </span>
                    </div>

                    <div>
                      {isCanceled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500">
                          <Ban className="w-3.5 h-3.5" /> Anulado
                        </span>
                      ) : expense.status === 'pagado' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                          <Clock className="w-3.5 h-3.5" /> Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  {expense.observation && (
                    <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg border border-stone-100 mb-3">
                      "{expense.observation}"
                    </p>
                  )}
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">ID: {expense.id.slice(-6)}</span>
                  {isCanceled ? (
                    <span className="text-[11px] text-stone-400 italic">Revertido en Kárdex</span>
                  ) : isLinked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setReversalReason('');
                        setReversingExpense(expense);
                      }}
                      className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Anular compra</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setDeletingExpenseId(expense.id);
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete for Ordinary Expenses */}
      <ConfirmModal
        isOpen={!!deletingExpenseId}
        title="¿Eliminar este gasto?"
        message="Esta acción no se puede deshacer. Si el gasto generó una cuenta por pagar asociada, también se anulará."
        confirmLabel="Eliminar Gasto"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpenseId(null)}
      />

      {/* Modal de Anulación / Reversión de Compra de Materia Prima */}
      {reversingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-amber-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">¿Anular compra de materia prima?</h2>
                  <p className="text-xs text-amber-200/90">Reversión de inventario y Kárdex</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReversingExpense(null)}
                className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumen de la compra */}
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Insumo:</span>
                  <span>{reversingExpense.ingredientName || 'Insumo de inventario'}</span>
                </div>
                {reversingExpense.purchaseQuantity !== undefined && (
                  <div className="flex justify-between text-stone-600">
                    <span>Cantidad comprada:</span>
                    <span className="font-semibold text-stone-900">
                      {reversingExpense.purchaseQuantity} {reversingExpense.purchaseUnit || ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Importe total:</span>
                  <span className="font-bold text-stone-900">{formatMoney(reversingExpense.amount)}</span>
                </div>
              </div>

              {/* Advertencia explicativa */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  Impacto de la anulación:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 pl-1">
                  <li>Se descontará del stock físico la cantidad ingresada.</li>
                  <li>Se registrará un movimiento de compensación de salida en el Kárdex.</li>
                  <li>Si generó una cuenta por pagar sin abonos, se anulará.</li>
                  <li>La operación se rechazará si no hay stock suficiente o si ya se registraron abonos a la cuenta por pagar.</li>
                </ul>
              </div>

              {/* Motivo opcional */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Motivo de la anulación (opcional)
                </label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ej. Error en la cantidad registrada, devolución al proveedor"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversingExpense(null)}
                  disabled={isReversing}
                  className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleReverseConfirm}
                  disabled={isReversing}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isReversing ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
