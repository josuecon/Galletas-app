import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  HelpCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { formatMoney } from '../utils/formatters.ts';

export const FinancialSummary: React.FC = () => {
  const { financialSummary } = useData();

  return (
    <section>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 mb-6">
        {/* Header of Financial Panel */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-xs bg-emerald-700">
              USD ($)
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight">
                Resumen Financiero Consolidado
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Indicadores en Dólares Estadounidenses (USD).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Ganancia Neta
              </span>
              <p
                className={`text-xl font-black ${
                  financialSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatMoney(financialSummary.netProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Inversiones y compras (insumos) */}
          <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-amber-900/10">
            <div className="flex items-center justify-between text-stone-600 text-xs font-semibold mb-1">
              <span>Inversión en Insumos</span>
              <PiggyBank className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-lg font-black text-stone-900">
              {formatMoney(financialSummary.totalInvestments)}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              Harina, azúcar, etc. (entraron en tandas)
            </p>
          </div>

          {/* 2. Gastos Operativos */}
          <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-rose-900/10">
            <div className="flex items-center justify-between text-stone-600 text-xs font-semibold mb-1">
              <span>Gastos Operativos</span>
              <ArrowDownCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-lg font-black text-stone-900">
              {formatMoney(financialSummary.totalOperatingExpenses)}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              Transporte, servicios, empaques
            </p>
          </div>

          {/* 3. Total Ventas */}
          <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-emerald-900/10">
            <div className="flex items-center justify-between text-stone-600 text-xs font-semibold mb-1">
              <span>Total Ventas</span>
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-lg font-black text-stone-900">
              {formatMoney(financialSummary.totalSales)}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              Facturación bruta de ventas
            </p>
          </div>

          {/* 4. Dinero Efectivamente Cobrado */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1">
              <span>Dinero Cobrado</span>
              <ArrowUpCircle className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-lg font-black text-emerald-800">
              {formatMoney(financialSummary.totalCollected)}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 leading-tight">
              Ventas de contado + abonos cobrados
            </p>
          </div>

          {/* 5. Dinero Pendiente de Cobrar */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1">
              <span>Por Cobrar (Crédito)</span>
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-lg font-black text-amber-900">
              {formatMoney(financialSummary.totalPendingReceivable)}
            </p>
            <p className="text-[11px] text-amber-700 mt-1 leading-tight">
              Dinero en la calle pendiente de clientes
            </p>
          </div>

          {/* 6. Dinero Pendiente de Pagar */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="flex items-center justify-between text-rose-900 text-xs font-bold mb-1">
              <span>Por Pagar (Deudas)</span>
              <CreditCard className="w-4 h-4 text-rose-700" />
            </div>
            <p className="text-lg font-black text-rose-900">
              {formatMoney(financialSummary.totalPendingPayable)}
            </p>
            <p className="text-[11px] text-rose-700 mt-1 leading-tight">
              Saldos pendientes con proveedores
            </p>
          </div>

          {/* 7. Ganancia Bruta */}
          <div className="p-4 rounded-2xl bg-emerald-900/5 border border-emerald-900/15">
            <div className="flex items-center justify-between text-stone-700 text-xs font-bold mb-1">
              <span>Ganancia Bruta</span>
              <TrendingUp className="w-4 h-4 text-[#143d2b]" />
            </div>
            <p className="text-lg font-black text-stone-900">
              {formatMoney(financialSummary.grossProfit)}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              Ventas - Costo de tandas vendidas ({formatMoney(financialSummary.productionCostSold)})
            </p>
          </div>

          {/* 8. Ganancia Neta */}
          <div
            className={`p-4 rounded-2xl border ${
              financialSummary.netProfit >= 0
                ? 'bg-[#143d2b] text-white border-emerald-950'
                : 'bg-rose-900 text-white border-rose-950'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-200 text-xs font-bold mb-1">
              <span className="text-white/90">Ganancia Neta Final</span>
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-white">
              {formatMoney(financialSummary.netProfit)}
            </p>
            <p className="text-[11px] text-emerald-100/80 mt-1 leading-tight">
              Ganancia bruta - Gastos operativos
            </p>
          </div>
        </div>

        {/* Note on Insumos vs Tandas */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2 text-[11px] text-stone-500">
          <HelpCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>
            <strong>Regla contable del negocio:</strong> Los ingredientes comprados son salidas de dinero registradas como inversión en insumos. El costo real consumido se deduce a través del costo de cada tanda vendida para no duplicar el descuento de ganancia.
          </span>
        </div>
      </div>
    </section>
  );
};
