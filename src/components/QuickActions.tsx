import React from 'react';
import {
  PlusCircle,
  Cookie,
  Receipt,
  UserCheck,
  CreditCard,
  Sparkles,
} from 'lucide-react';

interface Props {
  onOpenExpense: () => void;
  onOpenBatch: () => void;
  onOpenSale: () => void;
  onOpenReceivable: () => void;
  onOpenPayable: () => void;
}

export const QuickActions: React.FC<Props> = ({
  onOpenExpense,
  onOpenBatch,
  onOpenSale,
  onOpenReceivable,
  onOpenPayable,
}) => {
  return (
    <div className="bg-[#ede3d1]/60 rounded-3xl p-5 mb-8 border border-[#dfd4c0] shadow-xs">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#143d2b]" />
          Accesos Rápidos de Operación
        </h3>
        <span className="text-[11px] font-semibold text-stone-600">
          Registros inmediatos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Registrar Venta (Highlight as main business activity) */}
        <button
          type="button"
          onClick={onOpenSale}
          className="p-4 rounded-2xl bg-[#143d2b] hover:bg-[#1b4d36] text-white shadow-md hover:shadow-lg transition-all duration-150 flex flex-col items-center justify-center text-center group cursor-pointer border border-emerald-900 active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Receipt className="w-5 h-5 text-emerald-300" />
          </div>
          <span className="text-sm font-black leading-tight text-[#fbf8f2]">
            Registrar Venta
          </span>
          <span className="text-[11px] text-emerald-200/80 mt-0.5">
            Por unidad o paquete
          </span>
        </button>

        {/* 2. Crear Tanda */}
        <button
          type="button"
          onClick={onOpenBatch}
          className="p-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col items-center justify-center text-center group cursor-pointer border border-stone-200 active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Cookie className="w-5 h-5 text-emerald-800" />
          </div>
          <span className="text-sm font-black leading-tight text-stone-900">
            Crear Tanda
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">
            Producción y costo
          </span>
        </button>

        {/* 3. Registrar Gasto / Inversión */}
        <button
          type="button"
          onClick={onOpenExpense}
          className="p-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col items-center justify-center text-center group cursor-pointer border border-stone-200 active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <PlusCircle className="w-5 h-5 text-rose-700" />
          </div>
          <span className="text-sm font-black leading-tight text-stone-900">
            Registrar Gasto
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">
            Insumo u operativo
          </span>
        </button>

        {/* 4. Cuenta por Cobrar */}
        <button
          type="button"
          onClick={onOpenReceivable}
          className="p-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col items-center justify-center text-center group cursor-pointer border border-stone-200 active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <UserCheck className="w-5 h-5 text-amber-800" />
          </div>
          <span className="text-sm font-black leading-tight text-stone-900">
            Por Cobrar
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">
            Deuda de cliente
          </span>
        </button>

        {/* 5. Cuenta por Pagar */}
        <button
          type="button"
          onClick={onOpenPayable}
          className="p-4 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col items-center justify-center text-center group cursor-pointer border border-stone-200 active:scale-98 col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5 text-stone-700" />
          </div>
          <span className="text-sm font-black leading-tight text-stone-900">
            Por Pagar
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">
            Deuda a proveedor
          </span>
        </button>
      </div>
    </div>
  );
};
