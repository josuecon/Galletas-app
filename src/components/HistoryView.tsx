import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  Edit3,
  Cookie,
  ShoppingBag,
  DollarSign,
  UserCheck,
  CreditCard,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Batch, Expense, Sale, Receivable, Payable } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import { BatchModal } from './BatchModal.tsx';

type MovementType = 'all' | 'sales' | 'batches' | 'expenses' | 'receivables' | 'payables';
type DateRangeOption = 'all' | 'today' | '7days' | '30days' | 'custom';

interface UnifiedMovement {
  id: string;
  sourceType: 'sale' | 'batch' | 'expense' | 'receivable' | 'payable';
  typeLabel: string;
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  statusBadge?: string;
  statusColor?: string;
  rawItem: any;
}

export const HistoryView: React.FC = () => {
  const {
    expenses,
    batches,
    sales,
    receivables,
    payables,
    deleteExpense,
    deleteBatch,
    deleteSale,
    deleteReceivable,
    deletePayable,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'sale' | 'batch' | 'expense' | 'receivable' | 'payable';
    title: string;
  } | null>(null);

  // Edit batch state
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unify all movements
  const allMovements: UnifiedMovement[] = useMemo(() => {
    const list: UnifiedMovement[] = [];

    // 1. Sales
    sales.forEach((s) => {
      list.push({
        id: s.id,
        sourceType: 'sale',
        typeLabel: 'Venta',
        title: `${s.batchName} (${s.quantity} ${s.modality === 'pack' ? 'paq.' : 'unid.'})`,
        subtitle: s.customerName ? `Cliente: ${s.customerName}` : 'Venta directa',
        date: s.date,
        amount: s.totalAmount,
        statusBadge:
          s.paymentStatus === 'pagada'
            ? 'Cobrada'
            : s.paymentStatus === 'parcial'
            ? 'Pago Parcial'
            : 'A Crédito',
        statusColor:
          s.paymentStatus === 'pagada'
            ? 'bg-emerald-100 text-emerald-800'
            : s.paymentStatus === 'parcial'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-rose-100 text-rose-800',
        rawItem: s,
      });
    });

    // 2. Batches
    batches.forEach((b) => {
      list.push({
        id: b.id,
        sourceType: 'batch',
        typeLabel: 'Tanda',
        title: `Horneado: ${b.name}`,
        subtitle: `${b.quantityProduced} galletas producidas (${b.quantityProduced - b.quantitySold} disponibles)`,
        date: b.date,
        amount: b.totalCost,
        statusBadge: `${formatMoney(b.unitCost)} / galleta`,
        statusColor: 'bg-emerald-50 text-emerald-900 border border-emerald-200',
        rawItem: b,
      });
    });

    // 3. Expenses
    expenses.forEach((e) => {
      const isInsumo = e.type === 'insumo';
      list.push({
        id: e.id,
        sourceType: 'expense',
        typeLabel: isInsumo ? 'Insumo' : 'Gasto Operativo',
        title: e.description,
        subtitle: `Categoría: ${e.category} ${e.observation ? `• ${e.observation}` : ''}`,
        date: e.date,
        amount: e.amount,
        statusBadge: e.status === 'pagado' ? 'Pagado' : 'Pendiente',
        statusColor:
          e.status === 'pagado'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-rose-100 text-rose-800',
        rawItem: e,
      });
    });

    // 4. Receivables
    receivables.forEach((r) => {
      list.push({
        id: r.id,
        sourceType: 'receivable',
        typeLabel: 'Por Cobrar',
        title: `Deuda: ${r.customerName}`,
        subtitle: `${r.concept} • Pendiente: ${formatMoney(r.pendingBalance)}`,
        date: r.date,
        amount: r.totalAmount,
        statusBadge:
          r.status === 'pagada' ? 'Cobrada' : r.status === 'parcial' ? 'Parcial' : 'Pendiente',
        statusColor:
          r.status === 'pagada'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800',
        rawItem: r,
      });
    });

    // 5. Payables
    payables.forEach((p) => {
      list.push({
        id: p.id,
        sourceType: 'payable',
        typeLabel: 'Por Pagar',
        title: `Deuda: ${p.supplierName}`,
        subtitle: `${p.concept} • Pendiente: ${formatMoney(p.pendingBalance)}`,
        date: p.date,
        amount: p.totalAmount,
        statusBadge:
          p.status === 'pagada' ? 'Pagada' : p.status === 'parcial' ? 'Parcial' : 'Pendiente',
        statusColor:
          p.status === 'pagada'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-rose-100 text-rose-800',
        rawItem: p,
      });
    });

    // Sort descending by date
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [sales, batches, expenses, receivables, payables]);

  // Filtering
  const filteredMovements = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dNow = new Date();

    return allMovements.filter((item) => {
      // Type filter
      if (selectedType === 'sales' && item.sourceType !== 'sale') return false;
      if (selectedType === 'batches' && item.sourceType !== 'batch') return false;
      if (selectedType === 'expenses' && item.sourceType !== 'expense') return false;
      if (selectedType === 'receivables' && item.sourceType !== 'receivable') return false;
      if (selectedType === 'payables' && item.sourceType !== 'payable') return false;

      // Date Range filter
      if (dateRange === 'today' && item.date !== todayStr) {
        return false;
      }
      if (dateRange === '7days') {
        const d7 = new Date(dNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (item.date < d7) return false;
      }
      if (dateRange === '30days') {
        const d30 = new Date(dNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (item.date < d30) return false;
      }
      if (dateRange === 'custom') {
        if (customStartDate && item.date < customStartDate) return false;
        if (customEndDate && item.date > customEndDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchSubtitle = item.subtitle.toLowerCase().includes(query);
        const matchLabel = item.typeLabel.toLowerCase().includes(query);
        if (!matchTitle && !matchSubtitle && !matchLabel) return false;
      }

      return true;
    });
  }, [
    allMovements,
    selectedType,
    dateRange,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  const handleDeleteExecute = async () => {
    if (!itemToDelete) return;
    setErrorMsg(null);
    try {
      if (itemToDelete.type === 'expense') await deleteExpense(itemToDelete.id);
      else if (itemToDelete.type === 'batch') await deleteBatch(itemToDelete.id);
      else if (itemToDelete.type === 'sale') await deleteSale(itemToDelete.id);
      else if (itemToDelete.type === 'receivable') await deleteReceivable(itemToDelete.id);
      else if (itemToDelete.type === 'payable') await deletePayable(itemToDelete.id);

      setItemToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el registro.');
      setItemToDelete(null);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingBag className="w-5 h-5 text-emerald-700" />;
      case 'batch':
        return <Cookie className="w-5 h-5 text-emerald-800" />;
      case 'expense':
        return <DollarSign className="w-5 h-5 text-rose-700" />;
      case 'receivable':
        return <UserCheck className="w-5 h-5 text-amber-700" />;
      case 'payable':
        return <CreditCard className="w-5 h-5 text-rose-700" />;
      default:
        return <History className="w-5 h-5 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-[#143d2b]" />
              Historial Unificado de Movimientos
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Consulta, edición y eliminación de todos los registros de tu negocio con filtros avanzados.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-xl">
            {filteredMovements.length} movimientos encontrados
          </span>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, galleta, insumo..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MovementType)}
              className="w-full py-2 px-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 font-semibold focus:ring-2 focus:ring-[#143d2b]"
            >
              <option value="all">Todos los Tipos</option>
              <option value="sales">Solo Ventas</option>
              <option value="batches">Solo Tandas</option>
              <option value="expenses">Solo Gastos e Inversiones</option>
              <option value="receivables">Solo Cuentas por Cobrar</option>
              <option value="payables">Solo Cuentas por Pagar</option>
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="w-full py-2 px-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 font-semibold focus:ring-2 focus:ring-[#143d2b]"
            >
              <option value="all">Todo el Historial</option>
              <option value="today">Solo Hoy</option>
              <option value="7days">Últimos 7 Días</option>
              <option value="30days">Últimos 30 Días</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-[#fbf8f2] rounded-xl border border-stone-200 text-xs">
            <span className="font-bold text-stone-700">Desde:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="p-1.5 bg-white rounded-lg border border-stone-300 text-stone-800 text-xs"
            />
            <span className="font-bold text-stone-700">Hasta:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="p-1.5 bg-white rounded-lg border border-stone-300 text-stone-800 text-xs"
            />
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Movements List */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <History className="w-12 h-12 text-stone-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-stone-800">No se encontraron movimientos</h3>
          <p className="text-xs text-stone-500 mt-1">
            Prueba ajustando los filtros de búsqueda o fecha.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-stone-100">
            {filteredMovements.map((item) => (
              <div
                key={`${item.sourceType}_${item.id}`}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getItemIcon(item.sourceType)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-200 text-stone-700">
                        {item.typeLabel}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase">
                        USD ($)
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-stone-900 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                {/* Amount, status and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                  <div className="text-left sm:text-right">
                    {item.amount !== undefined && (
                      <span className="text-base font-black text-stone-900 block leading-tight">
                        {formatMoney(item.amount)}
                      </span>
                    )}
                    {item.statusBadge && (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold mt-1 ${
                          item.statusColor || 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {item.statusBadge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {item.sourceType === 'batch' && (
                      <button
                        type="button"
                        onClick={() => setEditingBatch(item.rawItem)}
                        title="Editar Tanda"
                        className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setItemToDelete({
                          id: item.id,
                          type: item.sourceType,
                          title: item.title,
                        })
                      }
                      title="Eliminar Movimiento"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Batch modal */}
      {editingBatch && (
        <BatchModal
          isOpen={!!editingBatch}
          onClose={() => setEditingBatch(null)}
          batchToEdit={editingBatch}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="¿Eliminar este registro?"
        message={`Estás a punto de eliminar "${itemToDelete?.title}". Si se trata de una venta, las unidades se devolverán a la tanda. Si es un gasto o venta con cuenta vinculada, se actualizarán los saldos para mantener la coherencia.`}
        confirmLabel="Eliminar Definitivamente"
        onConfirm={handleDeleteExecute}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
