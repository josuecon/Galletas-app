import React, { useState } from 'react';
import { CreditCard, Plus, DollarSign, Trash2, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Payable } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { InstallmentModal } from './InstallmentModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onOpenCreatePayable: () => void;
}

export const PayablesView: React.FC<Props> = ({ onOpenCreatePayable }) => {
  const { payables, addPayableInstallment, deletePayable } = useData();
  const [selectedPayableForInstallment, setSelectedPayableForInstallment] = useState<Payable | null>(null);
  const [deletingPayableId, setDeletingPayableId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredPayables = payables;

  const handleInstallmentConfirm = async (amount: number, date: string, notes?: string) => {
    if (!selectedPayableForInstallment) return;
    await addPayableInstallment(selectedPayableForInstallment.id, {
      amount,
      date,
      notes,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPayableId) return;
    try {
      await deletePayable(deletingPayableId);
      setDeletingPayableId(null);
    } catch (err) {
      console.error(err);
      setDeletingPayableId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-700" />
            Cuentas por Pagar (Deudas del Negocio)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Control de compras a crédito a proveedores y gastos pendientes de liquidar.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreatePayable}
          className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta por Pagar
        </button>
      </div>

      {filteredPayables.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No hay cuentas por pagar registradas</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
            El negocio no tiene deudas pendientes con proveedores ni acreedores.
          </p>
          <button
            type="button"
            onClick={onOpenCreatePayable}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            Registrar Cuenta por Pagar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayables.map((pay) => {
            const isFullyPaid = pay.status === 'pagada';
            const isExpanded = expandedId === pay.id;

            return (
              <div
                key={pay.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Supplier & Currency */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-black text-stone-900 leading-snug">
                        {pay.supplierName}
                      </h3>
                      <p className="text-xs text-stone-500">{pay.concept}</p>
                    </div>
                    <span className="text-[11px] text-stone-400 font-medium shrink-0">
                      USD ($)
                    </span>
                  </div>

                  {/* Dates & Classification */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-3 pt-1">
                    <span>Emisión: {formatDate(pay.date)}</span>
                    {pay.dueDate && <span>Vence: {formatDate(pay.dueDate)}</span>}
                  </div>

                  {/* Balance Cards */}
                  <div className="p-3.5 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 font-medium">Total Obligación:</span>
                      <strong className="text-stone-900 font-bold">
                        {formatMoney(pay.totalAmount)}
                      </strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 font-medium">Pagado hasta ahora:</span>
                      <span className="text-emerald-700 font-bold">
                        {formatMoney(pay.totalPaid)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-black border-t border-stone-200 pt-1.5">
                      <span className="text-stone-700">Saldo Pendiente:</span>
                      <span className={isFullyPaid ? 'text-emerald-700' : 'text-rose-800'}>
                        {formatMoney(pay.pendingBalance)}
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
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-900">
                        <Clock className="w-3.5 h-3.5 text-rose-800" />{' '}
                        {pay.totalPaid > 0 ? 'Pago Parcial en Curso' : 'Pendiente de Pago'}
                      </span>
                    )}

                    {/* View installments toggle */}
                    {pay.installments && pay.installments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : pay.id)}
                        className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        {pay.installments.length} pagos {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Installments List */}
                  {isExpanded && pay.installments && pay.installments.length > 0 && (
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs mb-3 space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="font-bold text-stone-700 block text-[10px] uppercase">
                        Historial de Pagos Realizados:
                      </span>
                      {pay.installments.map((inst, idx) => (
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
                    onClick={() => setDeletingPayableId(pay.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>

                  {!isFullyPaid && (
                    <button
                      type="button"
                      onClick={() => setSelectedPayableForInstallment(pay)}
                      className="px-4 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-rose-300" />
                      Registrar Pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Installment Modal */}
      {selectedPayableForInstallment && (
        <InstallmentModal
          isOpen={!!selectedPayableForInstallment}
          onClose={() => setSelectedPayableForInstallment(null)}
          type="payable"
          item={selectedPayableForInstallment}
          onConfirm={handleInstallmentConfirm}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingPayableId}
        title="¿Eliminar esta cuenta por pagar?"
        message="Esta acción no se puede deshacer. Se eliminarán los registros de la deuda y sus pagos asociados."
        confirmLabel="Eliminar Cuenta"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPayableId(null)}
      />
    </div>
  );
};
