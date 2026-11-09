import React, { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Calculator, AlertTriangle, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { SaleModality, PaymentStatus, Batch, Currency } from '../types/index.ts';
import { getTodayDateString, formatMoney } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SaleModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { batches, addSale, activeCurrency } = useData();

  const [date, setDate] = useState(getTodayDateString());
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [modality, setModality] = useState<SaleModality>('unit');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitsPerPack, setUnitsPerPack] = useState<string>('4');
  const [salePrice, setSalePrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pagada');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter available batches
  const availableBatches = batches.filter((b) => {
    const available = b.quantityProduced - b.quantitySold;
    if (activeCurrency !== 'ALL' && b.currency !== activeCurrency) {
      return false;
    }
    return available > 0;
  });

  // Set initial selected batch if empty
  useEffect(() => {
    if (!selectedBatchId && availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0].id);
    }
  }, [availableBatches, selectedBatchId]);

  if (!isOpen) return null;

  const currentBatch = batches.find((b) => b.id === selectedBatchId);
  const availableUnitsInBatch = currentBatch
    ? Math.max(0, currentBatch.quantityProduced - currentBatch.quantitySold)
    : 0;

  const qty = parseInt(quantity, 10) || 0;
  const upp = modality === 'pack' ? parseInt(unitsPerPack, 10) || 1 : 1;
  const totalUnitsToDeduct = modality === 'pack' ? qty * upp : qty;
  const price = parseFloat(salePrice) || 0;
  const totalSaleAmount = Math.round(qty * price * 100) / 100;
  const currency: Currency = currentBatch ? currentBatch.currency : 'USD';

  const isExceedingStock = totalUnitsToDeduct > availableUnitsInBatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedBatchId) {
      setErrorMsg('Selecciona una tanda de galletas disponible.');
      return;
    }

    if (qty <= 0) {
      setErrorMsg('La cantidad a vender debe ser mayor a 0.');
      return;
    }

    if (modality === 'pack' && upp <= 0) {
      setErrorMsg('Las unidades por paquete deben ser al menos 1.');
      return;
    }

    if (price <= 0) {
      setErrorMsg('El precio de venta debe ser mayor a 0.');
      return;
    }

    if (isExceedingStock) {
      setErrorMsg(
        `No puedes vender ${totalUnitsToDeduct} unidades. Solo hay ${availableUnitsInBatch} disponibles en esta tanda.`
      );
      return;
    }

    let parsedAmountPaid = 0;
    if (paymentStatus === 'pagada') {
      parsedAmountPaid = totalSaleAmount;
    } else if (paymentStatus === 'parcial') {
      parsedAmountPaid = parseFloat(amountPaid) || 0;
      if (parsedAmountPaid <= 0 || parsedAmountPaid >= totalSaleAmount) {
        setErrorMsg('El pago parcial debe ser mayor a 0 y menor al total de la venta.');
        return;
      }
    } else {
      parsedAmountPaid = 0;
    }

    if ((paymentStatus === 'pendiente' || paymentStatus === 'parcial') && !customerName.trim()) {
      setErrorMsg('Ingresa el nombre del cliente para registrar la cuenta por cobrar.');
      return;
    }

    setSubmitting(true);
    try {
      await addSale({
        date,
        batchId: selectedBatchId,
        batchName: currentBatch?.name || '',
        modality,
        quantity: qty,
        unitsPerPack: upp,
        salePrice: price,
        currency,
        paymentStatus,
        amountPaid: parsedAmountPaid,
        customerName: customerName.trim() || undefined,
      });

      // Reset
      setQuantity('1');
      setSalePrice('');
      setAmountPaid('');
      setCustomerName('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la venta.');
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
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Registrar Venta</h2>
              <p className="text-xs text-emerald-200/80">Por unidad o en paquetes</p>
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

          {/* Date & Batch selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha de Venta <span className="text-red-500">*</span>
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
                Tanda de Galletas <span className="text-red-500">*</span>
              </label>
              {availableBatches.length === 0 ? (
                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold">
                  No hay tandas con galletas disponibles. Primero hornea una tanda.
                </div>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b]"
                >
                  {availableBatches.map((b) => {
                    const avail = b.quantityProduced - b.quantitySold;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.name} ({avail} disp. - {b.currency})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Stock Info pill */}
          {currentBatch && (
            <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-500">Disponibles en tanda:</span>{' '}
                <strong className="text-stone-900 text-sm">{availableUnitsInBatch} galletas</strong>
              </div>
              <div className="text-right">
                <span className="text-stone-500">Moneda obligatoria:</span>{' '}
                <span className="px-2 py-0.5 rounded-md font-black bg-stone-100 text-stone-800">
                  {currentBatch.currency}
                </span>
              </div>
            </div>
          )}

          {/* Modality: Unit vs Pack */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Modalidad de Venta <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setModality('unit')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  modality === 'unit'
                    ? 'bg-[#143d2b] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Por Unidad (Galletas sueltas)
              </button>
              <button
                type="button"
                onClick={() => setModality('pack')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  modality === 'pack'
                    ? 'bg-[#143d2b] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Por Paquetes (Bolsitas/Cajas)
              </button>
            </div>
          </div>

          {/* Quantity, Units per pack, Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                {modality === 'pack' ? 'Cant. Paquetes' : 'Cant. Galletas'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>

            {modality === 'pack' ? (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Galletas / Paq. <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(e.target.value)}
                  placeholder="4"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Total Galletas
                </label>
                <div className="p-2.5 bg-stone-100 rounded-xl border border-stone-200 text-stone-800 text-sm font-bold text-center">
                  {qty}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Precio {modality === 'pack' ? '/ Paq.' : '/ Unidad'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>
          </div>

          {/* Validation of stock deduction */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              isExceedingStock
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div>
              <span className="font-semibold">Unidades que se descontarán:</span>{' '}
              <strong className="text-sm">{totalUnitsToDeduct} galletas</strong>
            </div>
            {isExceedingStock ? (
              <span className="font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> ¡Excede disponible ({availableUnitsInBatch})!
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">
                Quedarán: {availableUnitsInBatch - totalUnitsToDeduct}
              </span>
            )}
          </div>

          {/* Total Sale Preview Banner */}
          <div className="p-4 rounded-2xl bg-[#143d2b] text-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                Total de la Venta
              </span>
              <p className="text-xs text-emerald-200/80">
                {qty} {modality === 'pack' ? 'paquetes' : 'galletas'} × {formatMoney(price, currency)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                {formatMoney(totalSaleAmount, currency)}
              </span>
            </div>
          </div>

          {/* Payment Status & Credit Handling */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Condición de Cobro <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-stone-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentStatus('pagada')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  paymentStatus === 'pagada'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pagada de Contado
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('parcial')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  paymentStatus === 'parcial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pago Parcial
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('pendiente')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  paymentStatus === 'pendiente'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                A Crédito (Pendiente)
              </button>
            </div>

            {/* If Partial Payment, ask for initial amount paid */}
            {paymentStatus === 'parcial' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Monto Recibido de Inmediato ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Ej. ${(totalSaleAmount / 2).toFixed(2)}`}
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
                />
                <p className="text-[11px] text-amber-700 mt-1">
                  El resto ({formatMoney(Math.max(0, totalSaleAmount - (parseFloat(amountPaid) || 0)), currency)}) generará automáticamente una Cuenta por Cobrar.
                </p>
              </div>
            )}

            {/* Customer name if pending or partial */}
            {(paymentStatus === 'pendiente' || paymentStatus === 'parcial') && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nombre del Cliente (Deudor) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. Sra. Carmen o Juan Pérez"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b]"
                />
              </div>
            )}
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
              disabled={submitting || isExceedingStock || availableBatches.length === 0}
              className="px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Registrando...' : 'Registrar Venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
