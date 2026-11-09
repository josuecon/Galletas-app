import React, { useState } from 'react';
import { DollarSign, Plus, Trash2, PiggyBank, ArrowDownCircle, CheckCircle2, Clock } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Expense } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onOpenCreateExpense: () => void;
}

export const ExpensesView: React.FC<Props> = ({ onOpenCreateExpense }) => {
  const { expenses, deleteExpense, activeCurrency } = useData();
  const [filterType, setFilterType] = useState<'all' | 'insumo' | 'operativo'>('all');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((e) => {
    if (activeCurrency !== 'ALL' && e.currency !== activeCurrency) {
      return false;
    }
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
    } catch (err) {
      console.error(err);
      setDeletingExpenseId(null);
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

            return (
              <div
                key={expense.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Category pill & Currency */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-800">
                      {expense.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-white ${
                        expense.currency === 'USD' ? 'bg-emerald-700' : 'bg-amber-600'
                      }`}
                    >
                      {expense.currency}
                    </span>
                  </div>

                  {/* Description */}
                  <h3 className="text-base font-black text-stone-900 mb-1 leading-snug">
                    {expense.description}
                  </h3>

                  <p className="text-[11px] text-stone-500 mb-3">
                    Registrado el {formatDate(expense.date)}
                  </p>

                  {/* Type badge (Insumo vs Operativo) */}
                  <div className="mb-3">
                    {isInsumo ? (
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

                  {/* Amount and Status */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Importe
                      </span>
                      <span className="text-lg font-black text-stone-900">
                        {formatMoney(expense.amount, expense.currency)}
                      </span>
                    </div>

                    <div>
                      {expense.status === 'pagado' ? (
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
                  <button
                    type="button"
                    onClick={() => setDeletingExpenseId(expense.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingExpenseId}
        title="¿Eliminar este gasto?"
        message="Esta acción no se puede deshacer. Si el gasto generó una cuenta por pagar asociada, también se anulará."
        confirmLabel="Eliminar Gasto"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpenseId(null)}
      />
    </div>
  );
};
