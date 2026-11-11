import React, { useState } from 'react';
import { ShoppingBag, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, User } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Sale } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { ConfirmModal } from './ConfirmModal.tsx';

interface Props {
  onOpenCreateSale: () => void;
}

export const SalesView: React.FC<Props> = ({ onOpenCreateSale }) => {
  const { sales, deleteSale } = useData();
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  const filteredSales = sales;

  const handleDeleteConfirm = async () => {
    if (!deletingSaleId) return;
    try {
      await deleteSale(deletingSaleId);
      setDeletingSaleId(null);
    } catch (err: any) {
      console.error('Error deleting sale', err);
      setDeletingSaleId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#143d2b]" />
            Módulo de Ventas de Galletas
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Registro de ventas por unidad o paquete, control de cobros y sincronización automática con tandas.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateSale}
          className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Venta
        </button>
      </div>

      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No hay ventas registradas</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
            Registra tu primera venta para descontar unidades de la tanda y sumar ingresos al panel financiero.
          </p>
          <button
            type="button"
            onClick={onOpenCreateSale}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition cursor-pointer"
          >
            Registrar Primera Venta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSales.map((sale) => {
            const isPack = sale.modality === 'pack';

            return (
              <div
                key={sale.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Date & Currency */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-stone-500 font-medium">
                      {formatDate(sale.date)}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      USD ($)
                    </span>
                  </div>

                  {/* Batch Name */}
                  <h3 className="text-base font-black text-stone-900 mb-1 leading-snug">
                    {sale.batchName}
                  </h3>

                  {/* Modality & Quantity */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 mb-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Modalidad:</span>
                      <strong className="text-stone-900">
                        {isPack ? `Por Paquetes (${sale.unitsPerPack} unid./paq.)` : 'Por Unidad'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Cantidad vendida:</span>
                      <strong className="text-stone-900">
                        {sale.quantity} {isPack ? 'paquetes' : 'galletas'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold border-t border-stone-200/80 pt-1">
                      <span>Total galletas descontadas:</span>
                      <span>{sale.totalUnits} galletas</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-200/80 pt-1">
                      <span className="text-stone-500">Precio {isPack ? 'por paq.' : 'por unidad'}:</span>
                      <span className="font-semibold">{formatMoney(sale.salePrice)}</span>
                    </div>
                  </div>

                  {/* Customer if exists */}
                  {sale.customerName && (
                    <div className="flex items-center gap-1.5 text-xs text-stone-600 mb-3 bg-stone-50 p-2 rounded-xl border border-stone-100">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>Cliente: <strong>{sale.customerName}</strong></span>
                    </div>
                  )}

                  {/* Total & Payment status */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200 mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Total Venta
                      </span>
                      <span className="text-lg font-black text-stone-900">
                        {formatMoney(sale.totalAmount)}
                      </span>
                    </div>

                    <div className="text-right">
                      {sale.paymentStatus === 'pagada' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Pagada
                        </span>
                      )}
                      {sale.paymentStatus === 'pendiente' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800">
                          <Clock className="w-3.5 h-3.5 text-rose-700" /> A Crédito
                        </span>
                      )}
                      {sale.paymentStatus === 'parcial' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-700" /> Cobrado:{' '}
                          {formatMoney(sale.amountPaid || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action: Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">ID: {sale.id.slice(-6)}</span>
                  <button
                    type="button"
                    onClick={() => setDeletingSaleId(sale.id)}
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
        isOpen={!!deletingSaleId}
        title="¿Eliminar esta venta?"
        message="Al eliminar la venta, las galletas se restaurarán automáticamente al inventario de la tanda correspondiente y se anulará la cuenta por cobrar asociada si existía."
        confirmLabel="Eliminar Venta"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingSaleId(null)}
      />
    </div>
  );
};
