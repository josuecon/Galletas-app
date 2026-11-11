import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Boxes,
  DollarSign,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useData, convertToBaseUnit, isUnitCompatible } from '../context/DataContext.tsx';
import { Batch, UnitOfMeasure, DimensionType, BatchIngredientUsage } from '../types/index.ts';
import { formatMoney, formatDate } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch;
  initialIngredientId?: string;
}

export const RegularizeBatchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  batch,
  initialIngredientId,
}) => {
  const { regularizeBatchIngredient, ingredients, expenses } = useData();

  // Ingredientes de la tanda que tienen faltante pendiente de valorizar
  const pendingIngredients = useMemo(() => {
    return (batch.ingredientsUsed || []).filter((u) => u.uncoveredBaseQty > 0);
  }, [batch.ingredientsUsed]);

  // Ingrediente actualmente seleccionado para regularizar
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>(() => {
    if (initialIngredientId && pendingIngredients.some((u) => u.ingredientId === initialIngredientId)) {
      return initialIngredientId;
    }
    return pendingIngredients[0]?.ingredientId || '';
  });

  // Modalidad: A (Física y Valorativa) vs. B (Solo Valorativa)
  const [mode, setMode] = useState<'FISICA_Y_VALORATIVA' | 'SOLO_VALORATIVA'>('FISICA_Y_VALORATIVA');

  // Objeto usage actual y documento de ingrediente
  const currentUsage = (batch.ingredientsUsed || []).find(
    (u) => u.ingredientId === selectedIngredientId
  );
  const currentIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  // Helper unidades
  const getCompatibleUnits = (dimension?: DimensionType): UnitOfMeasure[] => {
    if (dimension === 'masa') return ['g', 'kg'];
    if (dimension === 'volumen') return ['ml', 'l'];
    if (dimension === 'unidad') return ['unidad'];
    return ['g', 'kg'];
  };

  const getDefaultUnit = (dimension?: DimensionType): UnitOfMeasure => {
    if (dimension === 'masa') return 'g';
    if (dimension === 'volumen') return 'ml';
    if (dimension === 'unidad') return 'unidad';
    return 'g';
  };

  // Cantidad y unidad ingresada por el usuario
  const [quantity, setQuantity] = useState<string>(() => {
    return currentUsage ? String(currentUsage.uncoveredBaseQty) : '';
  });
  const [unit, setUnit] = useState<UnitOfMeasure>(() => {
    return currentIngredient ? currentIngredient.baseUnit : 'g';
  });

  // Origen del costo: 'cpp_actual' vs. 'compra'
  const [sourceType, setSourceType] = useState<'cpp_actual' | 'compra'>('cpp_actual');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !currentUsage || !currentIngredient) return null;

  // Compras registradas activas y válidas para este ingrediente
  const validPurchases = expenses.filter((e) => {
    return (
      e.ingredientId === selectedIngredientId &&
      !e.isReversed &&
      e.status !== 'anulado' &&
      typeof e.purchaseQuantity === 'number' &&
      e.purchaseQuantity > 0 &&
      e.purchaseUnit
    );
  });

  // Cálculo del costo de referencia unitario en USD según la opción elegida
  let computedReferenceCost = 0;
  if (sourceType === 'cpp_actual') {
    computedReferenceCost = currentIngredient.averageCost || 0;
  } else if (sourceType === 'compra') {
    const expense = validPurchases.find((e) => e.id === selectedExpenseId);
    if (expense && expense.purchaseQuantity && expense.purchaseUnit) {
      const purBaseQty = convertToBaseUnit(expense.purchaseQuantity, expense.purchaseUnit);
      if (purBaseQty > 0) {
        computedReferenceCost = Math.round((expense.amount / purBaseQty) * 1000000) / 1000000;
      }
    }
  }

  // Conversión de la cantidad ingresada a la unidad base
  const parsedQty = parseFloat(quantity) || 0;
  const qtyInBaseUnit = convertToBaseUnit(parsedQty, unit);

  // Cálculos de faltantes
  const physicalShortage = Math.max(
    0,
    Math.round((currentUsage.requiredBaseQty - currentUsage.physicallyCoveredBaseQty) * 10000) / 10000
  );
  const valueShortage = currentUsage.uncoveredBaseQty;
  const availStock = Math.max(0, currentIngredient.physicalStock || 0);

  // Previsualizaciones de cálculo
  const additionalCost = Math.round((qtyInBaseUnit * computedReferenceCost) * 100) / 100;
  const projectedTotalCost = Math.round(((batch.totalCost || 0) + additionalCost) * 100) / 100;
  const projectedUnitCost =
    batch.quantityProduced > 0
      ? Math.round((projectedTotalCost / batch.quantityProduced) * 10000) / 10000
      : 0;

  // Verificación de si la regularización completa el costo definitivo de la tanda
  const remainingShortageAfterThis = Math.max(
    0,
    Math.round((valueShortage - qtyInBaseUnit) * 10000) / 10000
  );
  const otherIngredientsPending = pendingIngredients.filter(
    (u) => u.ingredientId !== selectedIngredientId
  ).length;
  const willBecomeDefinitiveCost =
    remainingShortageAfterThis === 0 && otherIngredientsPending === 0;

  // Estado físico proyectado posterior a esta operación
  const projectedPhysicalShortage =
    mode === 'FISICA_Y_VALORATIVA'
      ? Math.max(0, Math.round((physicalShortage - qtyInBaseUnit) * 10000) / 10000)
      : physicalShortage;

  // Cambio de ingrediente en pestañas o selector
  const handleSelectIngredient = (ingId: string) => {
    setSelectedIngredientId(ingId);
    setErrorMsg(null);
    const newUsage = (batch.ingredientsUsed || []).find((u) => u.ingredientId === ingId);
    const newIng = ingredients.find((i) => i.id === ingId);
    if (newUsage && newIng) {
      setQuantity(String(newUsage.uncoveredBaseQty));
      setUnit(newIng.baseUnit);
      setSourceType('cpp_actual');
      setSelectedExpenseId('');
    }
  };

  // Botón de atajo: seleccionar faltante completo
  const handleSelectFullShortage = () => {
    setQuantity(String(valueShortage));
    setUnit(currentIngredient.baseUnit);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (parsedQty <= 0 || !Number.isFinite(parsedQty)) {
      setErrorMsg('Ingresa una cantidad mayor a cero.');
      return;
    }

    if (!isUnitCompatible(unit, currentIngredient.dimension)) {
      setErrorMsg(
        `La unidad "${unit}" no es compatible con la dimensión ${currentIngredient.dimension} de ${currentIngredient.name}.`
      );
      return;
    }

    if (qtyInBaseUnit <= 0) {
      setErrorMsg('La cantidad convertida a unidad base debe ser mayor a cero.');
      return;
    }

    if (qtyInBaseUnit > valueShortage) {
      setErrorMsg(
        `La cantidad a regularizar (${qtyInBaseUnit} ${currentIngredient.baseUnit}) no puede ser mayor al faltante pendiente de valorizar (${valueShortage} ${currentIngredient.baseUnit}).`
      );
      return;
    }

    if (mode === 'FISICA_Y_VALORATIVA' && availStock < qtyInBaseUnit) {
      setErrorMsg(
        `Stock físico insuficiente en almacén. Disponible: ${availStock} ${currentIngredient.baseUnit}, requerido: ${qtyInBaseUnit} ${currentIngredient.baseUnit}.`
      );
      return;
    }

    if (sourceType === 'compra' && !selectedExpenseId) {
      setErrorMsg('Selecciona una compra registrada de referencia.');
      return;
    }

    if (computedReferenceCost <= 0 || !Number.isFinite(computedReferenceCost)) {
      setErrorMsg(
        'El costo de referencia debe ser mayor a cero. No se permite valorizar faltantes con costo cero ni ficticio.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await regularizeBatchIngredient({
        batchId: batch.id,
        ingredientId: selectedIngredientId,
        qtyToRegularize: qtyInBaseUnit,
        mode,
        referenceCost: computedReferenceCost,
        sourceType,
        referenceExpenseId: sourceType === 'compra' ? selectedExpenseId : undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ejecutar la regularización.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-amber-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Regularización de Tanda Provisional</h2>
              <p className="text-xs text-amber-200/90">
                {batch.name} • Horneada el {formatDate(batch.date)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5 font-semibold">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de ingredientes si la tanda tiene más de uno pendiente */}
          {pendingIngredients.length > 1 && (
            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Seleccionar Ingrediente con Faltante
              </label>
              <div className="flex flex-wrap gap-2">
                {pendingIngredients.map((u) => {
                  const isSelected = u.ingredientId === selectedIngredientId;
                  return (
                    <button
                      key={u.ingredientId}
                      type="button"
                      onClick={() => handleSelectIngredient(u.ingredientId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>{u.ingredientName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-amber-900 text-amber-200' : 'bg-stone-100 text-stone-600'
                      }`}>
                        Faltan {u.uncoveredBaseQty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ficha Diagnóstica del Ingrediente Seleccionado */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Ingrediente
                </span>
                <h3 className="text-base font-black text-stone-900 leading-tight">
                  {currentUsage.ingredientName}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Stock Físico en Almacén
                </span>
                <span className="text-sm font-black text-stone-900">
                  {currentIngredient.physicalStock} {currentIngredient.baseUnit}
                </span>
              </div>
            </div>

            {/* Comparativa: Cantidades Requeridas, Cubiertas y Faltantes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Requerido Receta
                </span>
                <strong className="text-stone-900 font-black">
                  {currentUsage.requiredBaseQty} {currentIngredient.baseUnit}
                </strong>
                <span className="text-[10px] text-stone-500 block">
                  ({currentUsage.requiredQuantity} {currentUsage.requiredUnit})
                </span>
              </div>

              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Cubierto Físico
                </span>
                <strong className="text-stone-900 font-black">
                  {currentUsage.physicallyCoveredBaseQty} {currentIngredient.baseUnit}
                </strong>
                <span className="text-[10px] text-stone-500 block">
                  Descontado al hornear
                </span>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Faltante Físico
                </span>
                <strong className="text-amber-950 font-black">
                  {physicalShortage} {currentIngredient.baseUnit}
                </strong>
                <span className="text-[10px] text-amber-700 block">
                  Pendiente en almacén
                </span>
              </div>

              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">
                  Faltante a Valorizar
                </span>
                <strong className="text-rose-950 font-black">
                  {valueShortage} {currentIngredient.baseUnit}
                </strong>
                <span className="text-[10px] text-rose-700 block">
                  Costo pendiente tanda
                </span>
              </div>
            </div>
          </div>

          {/* Modalidad de Regularización (A vs. B) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Modalidad de Regularización <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Modalidad A: Físico y Costo */}
              <button
                type="button"
                onClick={() => setMode('FISICA_Y_VALORATIVA')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  mode === 'FISICA_Y_VALORATIVA'
                    ? 'border-amber-800 bg-amber-50/70 shadow-xs ring-1 ring-amber-800'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <Boxes
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    mode === 'FISICA_Y_VALORATIVA' ? 'text-amber-800' : 'text-stone-400'
                  }`}
                />
                <div>
                  <strong
                    className={`text-xs block font-black ${
                      mode === 'FISICA_Y_VALORATIVA' ? 'text-amber-900' : 'text-stone-800'
                    }`}
                  >
                    A. Físico y Costo (Almacén)
                  </strong>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                    Dispones físicamente del insumo. Se descontará del almacén y se asignará su costo a la tanda.
                  </p>
                </div>
              </button>

              {/* Modalidad B: Solo Costo */}
              <button
                type="button"
                onClick={() => setMode('SOLO_VALORATIVA')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  mode === 'SOLO_VALORATIVA'
                    ? 'border-amber-800 bg-amber-50/70 shadow-xs ring-1 ring-amber-800'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <DollarSign
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    mode === 'SOLO_VALORATIVA' ? 'text-amber-800' : 'text-stone-400'
                  }`}
                />
                <div>
                  <strong
                    className={`text-xs block font-black ${
                      mode === 'SOLO_VALORATIVA' ? 'text-amber-900' : 'text-stone-800'
                    }`}
                  >
                    B. Solo Costo (Valorativa)
                  </strong>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                    El insumo ya fue utilizado o donado. Solo se asigna costo a la tanda; el almacén no descontará existencias.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Cantidad y Unidad a Regularizar */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Cantidad a Regularizar <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectFullShortage}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Regularizar todo el faltante ({valueShortage} {currentIngredient.baseUnit})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ej. 250"
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-amber-800 focus:bg-white"
                />
              </div>

              <div>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-amber-800 focus:bg-white"
                >
                  {getCompatibleUnits(currentIngredient.dimension).map((u) => (
                    <option key={u} value={u}>
                      {u === 'kg'
                        ? 'Kilogramos (kg)'
                        : u === 'g'
                        ? 'Gramos (g)'
                        : u === 'l'
                        ? 'Litros (l)'
                        : u === 'ml'
                        ? 'Mililitros (ml)'
                        : 'Unidades'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comprobación reactiva de la cantidad en unidad base */}
            <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 border-t border-stone-100 gap-2">
              <span className="text-stone-500">
                Equivalente en unidad base:{' '}
                <strong className="text-stone-800 font-bold">
                  {qtyInBaseUnit} {currentIngredient.baseUnit}
                </strong>{' '}
                (de {valueShortage} pendientes)
              </span>

              {mode === 'FISICA_Y_VALORATIVA' && (
                <span>
                  {availStock >= qtyInBaseUnit ? (
                    <strong className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Stock disponible en almacén ({availStock} {currentIngredient.baseUnit})
                    </strong>
                  ) : (
                    <strong className="text-red-700 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Stock insuficiente (disp: {availStock} {currentIngredient.baseUnit})
                    </strong>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Origen del Costo de Referencia */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Origen del Costo de Referencia en USD <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('cpp_actual')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                  sourceType === 'cpp_actual'
                    ? 'border-amber-800 bg-amber-50/70 shadow-xs ring-1 ring-amber-800'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <DollarSign
                  className={`w-4 h-4 shrink-0 ${
                    sourceType === 'cpp_actual' ? 'text-amber-800' : 'text-stone-400'
                  }`}
                />
                <div>
                  <strong className="text-xs block text-stone-900 font-bold">
                    CPP Actual del Almacén
                  </strong>
                  <span className="text-[11px] text-stone-500 block">
                    ${(currentIngredient.averageCost || 0).toFixed(6)} / {currentIngredient.baseUnit}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('compra');
                  if (validPurchases.length > 0 && !selectedExpenseId) {
                    setSelectedExpenseId(validPurchases[0].id);
                  }
                }}
                disabled={validPurchases.length === 0}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                  sourceType === 'compra'
                    ? 'border-amber-800 bg-amber-50/70 shadow-xs ring-1 ring-amber-800'
                    : validPurchases.length === 0
                    ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <Layers
                  className={`w-4 h-4 shrink-0 ${
                    sourceType === 'compra' ? 'text-amber-800' : 'text-stone-400'
                  }`}
                />
                <div>
                  <strong className="text-xs block text-stone-900 font-bold">
                    Compra Registrada ({validPurchases.length})
                  </strong>
                  <span className="text-[11px] text-stone-500 block">
                    {validPurchases.length > 0
                      ? 'Vincular a gasto de insumos'
                      : 'Sin compras activas para este insumo'}
                  </span>
                </div>
              </button>
            </div>

            {/* Selector de Compra si sourceType === 'compra' */}
            {sourceType === 'compra' && validPurchases.length > 0 && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                  Seleccionar Compra de Referencia <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExpenseId}
                  onChange={(e) => setSelectedExpenseId(e.target.value)}
                  className="w-full p-2 bg-stone-50 rounded-xl border border-stone-300 text-xs font-semibold text-stone-900 focus:ring-1 focus:ring-amber-800"
                >
                  {validPurchases.map((pur) => {
                    const purBase = convertToBaseUnit(pur.purchaseQuantity!, pur.purchaseUnit!);
                    const unitCostCalculated =
                      purBase > 0 ? (pur.amount / purBase).toFixed(6) : '0';
                    return (
                      <option key={pur.id} value={pur.id}>
                        {formatDate(pur.date)} - {pur.description} ({formatMoney(pur.amount)} por{' '}
                        {pur.purchaseQuantity} {pur.purchaseUnit}) ➔ ${unitCostCalculated}/
                        {currentIngredient.baseUnit}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Vista Previa del Impacto Financiero y Físico */}
          <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Previsualización de la Regularización
              </span>
              <span className="text-[11px] text-stone-400 font-medium">USD ($)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Costo Adicional
                </span>
                <strong className="text-sm font-black text-amber-400">
                  +{formatMoney(additionalCost)}
                </strong>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  ({qtyInBaseUnit} {currentIngredient.baseUnit} × ${computedReferenceCost.toFixed(4)})
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Costo Total Proyectado
                </span>
                <strong className="text-sm font-black text-stone-100">
                  {formatMoney(projectedTotalCost)}
                </strong>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Anterior: {formatMoney(batch.totalCost)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Costo por Galleta
                </span>
                <strong className="text-sm font-black text-emerald-300">
                  {formatMoney(projectedUnitCost)}
                </strong>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Anterior: {formatMoney(batch.unitCost)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Faltante Físico Post.
                </span>
                <strong className="text-sm font-black text-stone-100">
                  {projectedPhysicalShortage} {currentIngredient.baseUnit}
                </strong>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  {mode === 'FISICA_Y_VALORATIVA' ? 'Deducido almacén' : 'Sin deducción física'}
                </span>
              </div>
            </div>

            {/* Aviso de estado económico vs físico proyectado */}
            <div className="space-y-1.5 pt-1">
              {willBecomeDefinitiveCost ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Costo Definitivo:</strong> Esta operación completará la valorización económica de todos los ingredientes de la tanda.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Regularización parcial:</strong> La tanda permanecerá con Costo Provisional hasta regularizar la totalidad de los faltantes pendientes.
                  </span>
                </div>
              )}

              {mode === 'SOLO_VALORATIVA' && projectedPhysicalShortage > 0 && (
                <div className="p-2 rounded-xl bg-stone-800 text-stone-300 text-[11px] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    El costo quedará reconocido económicamente, pero el almacén no recibirá existencias físicas de este faltante.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
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
              disabled={
                submitting ||
                qtyInBaseUnit <= 0 ||
                qtyInBaseUnit > valueShortage ||
                (mode === 'FISICA_Y_VALORATIVA' && availStock < qtyInBaseUnit) ||
                computedReferenceCost <= 0
              }
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Ejecutando...' : 'Confirmar Regularización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
