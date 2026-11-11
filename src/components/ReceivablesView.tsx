import React, { useState } from 'react';
import { UserCheck, Plus, DollarSign, Trash2, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Receivable } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { InstallmentModal } from './InstallmentModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onOpenCreateReceivable: () => void;
}

export const ReceivablesView: React.FC<Props> = ({ onOpenCreateReceivable }) => {
  const { receivables, addReceivableInstallment, deleteReceivable } = useData();
  const [selectedReceivableForInstallment, setSelectedReceivableForInstallment] =
    useState<Receivable | null>(null);
  const [deletingReceivableId, setDeletingReceivableId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredReceivables = receivables;

  const handleInstallmentConfirm = async (amount: number, date: string, notes?: string) => {
    if (!selectedReceivableForInstallment) return;
    await addReceivableInstallment(selectedReceivableForInstallment.id, {
      amount,
      date,
      notes,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReceivableId) return;
    try {
      await deleteReceivable(deletingReceivableId);
      setDeletingReceivableId(null);
    } catch (err) {
      console.error(err);
      setDeletingReceivableId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-700" />
            Cuentas por Cobrar (Deudas de Clientes)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Control de ventas a crédito y pedidos pendientes. Registra abonos y actualiza el dinero cobrado.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateReceivable}
          className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta por Cobrar
        </button>
      </div>

      {filteredReceivables.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No hay cuentas por cobrar pendientes</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
            Todas tus ventas están al día o aún no has registrado ventas a crédito.
          </p>
          <button
            type="button"
            onClick={onOpenCreateReceivable}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            Registrar Cuenta por Cobrar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceivables.map((rec) => {
            const isFullyPaid = rec.status === 'pagada';
            const isExpanded = expandedId === rec.id;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Customer & Currency */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-black text-stone-900 leading-snug">
                        {rec.customerName}
                      </h3>
                      <p className="text-xs text-stone-500">{rec.concept}</p>
                    </div>
                    <span className="text-[11px] text-stone-400 font-medium shrink-0">
                      USD ($)
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-3 pt-1">
                    <span>Emisión: {formatDate(rec.date)}</span>
                    {rec.dueDate && <span>Vence: {formatDate(rec.dueDate)}</span>}
                  </div>

                  {/* Balance Cards */}
                  <div className="p-3.5 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 font-medium">Total de la Deuda:</span>
                      <strong className="text-stone-900 font-bold">
                        {formatMoney(rec.totalAmount)}
                      </strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 font-medium">Abonado hasta ahora:</span>
                      <span className="text-emerald-700 font-bold">
                        {formatMoney(rec.totalPaid)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-black border-t border-stone-200 pt-1.5">
                      <span className="text-stone-700">Saldo Pendiente:</span>
                      <span className={isFullyPaid ? 'text-emerald-700' : 'text-amber-800'}>
                        {formatMoney(rec.pendingBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Pagada Completamente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900">
                        <Clock className="w-3.5 h-3.5 text-amber-800" />{' '}
                        {rec.totalPaid > 0 ? 'Pago Parcial en Curso' : 'Pendiente de Cobro'}
                      </span>
                    )}

                    {/* View installments toggle */}
                    {rec.installments && rec.installments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        {rec.installments.length} abonos {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Installments List */}
                  {isExpanded && rec.installments && rec.installments.length > 0 && (
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs mb-3 space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="font-bold text-stone-700 block text-[10px] uppercase">
                        Historial de Abonos:
                      </span>
                      {rec.installments.map((inst, idx) => (
                        <div
                          key={inst.id || idx}
                          className="flex items-center justify-between text-[11px] py-1 border-b border-stone-200/60 last:border-0"
                        >
                          <div>
                            <span className="font-semibold text-stone-800">
                              {formatMoney(inst.amount)}
                            </span>
                            {inst.notes && <span className="text-stone-500 block text-[10px]">"{inst.notes}"</span>}
                          </div>
                          <span className="text-stone-400">{formatDate(inst.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setDeletingReceivableId(rec.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>

                  {!isFullyPaid && (
                    <button
                      type="button"
                      onClick={() => setSelectedReceivableForInstallment(rec)}
                      className="px-4 py-1.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
                      Registrar Abono
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Installment Modal */}
      {selectedReceivableForInstallment && (
        <InstallmentModal
          isOpen={!!selectedReceivableForInstallment}
          onClose={() => setSelectedReceivableForInstallment(null)}
          type="receivable"
          item={selectedReceivableForInstallment}
          onConfirm={handleInstallmentConfirm}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingReceivableId}
        title="¿Eliminar esta cuenta por cobrar?"
        message="Esta acción no se puede deshacer. Se eliminarán los registros de la deuda y sus abonos."
        confirmLabel="Eliminar Cuenta"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingReceivableId(null)}
      />
    </div>
  );
};
