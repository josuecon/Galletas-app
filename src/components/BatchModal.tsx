import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Cookie,
  Calculator,
  AlertCircle,
  Plus,
  Trash2,
  Boxes,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useData, convertToBaseUnit, isUnitCompatible } from '../context/DataContext.tsx';
import { Batch, UnitOfMeasure, DimensionType, BatchDirectCost } from '../types/index.ts';
import { getTodayDateString, formatMoney } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batchToEdit?: Batch | null;
}

interface RecipeItemDraft {
  id: string;
  ingredientId: string;
  quantity: string;
  unit: UnitOfMeasure;
}

interface DirectCostDraft {
  id: string;
  description: string;
  amount: string;
}

export const BatchModal: React.FC<Props> = ({ isOpen, onClose, batchToEdit }) => {
  const { addBatch, updateBatch, ingredients } = useData();

  // Helper para unidades según dimensión
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

  // Modo: Inventario (Receta) vs. Manual
  const isEditing = !!batchToEdit;
  const initialMode = isEditing
    ? batchToEdit.ingredientsUsed && batchToEdit.ingredientsUsed.length > 0
      ? 'inventory'
      : 'manual'
    : ingredients.length > 0
    ? 'inventory'
    : 'manual';

  const [creationMode, setCreationMode] = useState<'inventory' | 'manual'>(initialMode);

  // Campos generales
  const [name, setName] = useState(batchToEdit?.name || '');
  const [date, setDate] = useState(batchToEdit?.date || getTodayDateString());
  const [quantityProduced, setQuantityProduced] = useState<string>(
    batchToEdit ? String(batchToEdit.quantityProduced) : ''
  );
  const [observations, setObservations] = useState(batchToEdit?.observations || '');

  // Costo manual (solo para modo manual)
  const [manualCost, setManualCost] = useState<string>(
    batchToEdit && batchToEdit.isManualCost ? String(batchToEdit.totalCost) : ''
  );

  // Receta (Modo Inventario)
  const [recipeItems, setRecipeItems] = useState<RecipeItemDraft[]>(() => {
    if (ingredients.length > 0) {
      const first = ingredients[0];
      return [
        {
          id: 'item_' + Date.now(),
          ingredientId: first.id,
          quantity: '',
          unit: getDefaultUnit(first.dimension),
        },
      ];
    }
    return [];
  });

  // Otros costos directos (Modo Inventario)
  const [directCosts, setDirectCosts] = useState<DirectCostDraft[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasSales = isEditing && (batchToEdit.quantitySold > 0);

  // Manejo de cambio de ingrediente en un renglón
  const handleIngredientChange = (rowId: string, newIngredientId: string) => {
    const selectedIng = ingredients.find((i) => i.id === newIngredientId);
    setRecipeItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const dimension = selectedIng?.dimension;
        const currentUnitIsCompatible = dimension ? isUnitCompatible(row.unit, dimension) : true;
        const nextUnit = currentUnitIsCompatible ? row.unit : getDefaultUnit(dimension);
        return {
          ...row,
          ingredientId: newIngredientId,
          unit: nextUnit,
        };
      })
    );
  };

  // Manejo de cambio de cantidad
  const handleQuantityChange = (rowId: string, qty: string) => {
    setRecipeItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, quantity: qty } : row))
    );
  };

  // Manejo de cambio de unidad
  const handleUnitChange = (rowId: string, unit: UnitOfMeasure) => {
    setRecipeItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, unit } : row))
    );
  };

  // Agregar renglón de ingrediente
  const handleAddRecipeRow = () => {
    if (ingredients.length === 0) return;
    const first = ingredients[0];
    setRecipeItems((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        ingredientId: first.id,
        quantity: '',
        unit: getDefaultUnit(first.dimension),
      },
    ]);
  };

  // Eliminar renglón de ingrediente
  const handleRemoveRecipeRow = (rowId: string) => {
    setRecipeItems((prev) => prev.filter((row) => row.id !== rowId));
  };

  // Agregar otro costo directo
  const handleAddDirectCost = () => {
    setDirectCosts((prev) => [
      ...prev,
      {
        id: 'dc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        description: '',
        amount: '',
      },
    ]);
  };

  // Actualizar otro costo directo
  const handleDirectCostChange = (rowId: string, field: 'description' | 'amount', value: string) => {
    setDirectCosts((prev) =>
      prev.map((c) => (c.id === rowId ? { ...c, [field]: value } : c))
    );
  };

  // Eliminar otro costo directo
  const handleRemoveDirectCost = (rowId: string) => {
    setDirectCosts((prev) => prev.filter((c) => c.id !== rowId));
  };

  // Cálculo reactivo de disponibilidad y resumen previo para el modo inventario
  const recipePreview = useMemo(() => {
    let coveredCostSum = 0;
    let hasFaltantes = false;

    const itemsPreview = recipeItems.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      const qtyNum = parseFloat(item.quantity) || 0;

      if (!ing || qtyNum <= 0) {
        return {
          ...item,
          ing,
          reqBase: 0,
          availStock: ing?.physicalStock || 0,
          coveredBase: 0,
          uncoveredBase: 0,
          status: 'empty' as const,
          cost: 0,
        };
      }

      const reqBase = convertToBaseUnit(qtyNum, item.unit);
      const availStock = Math.max(0, ing.physicalStock || 0);
      const coveredBase = Math.min(reqBase, availStock);
      const uncoveredBase = Math.max(0, Math.round((reqBase - coveredBase) * 10000) / 10000);
      const cost = Math.round((coveredBase * (ing.averageCost || 0)) * 100) / 100;
      coveredCostSum += cost;

      if (uncoveredBase > 0) {
        hasFaltantes = true;
      }

      let status: 'full' | 'partial' | 'none' = 'full';
      if (availStock <= 0) {
        status = 'none';
      } else if (uncoveredBase > 0) {
        status = 'partial';
      }

      return {
        ...item,
        ing,
        reqBase,
        availStock,
        coveredBase,
        uncoveredBase,
        status,
        cost,
      };
    });

    const validDirectCosts = directCosts.filter(
      (c) => c.description.trim() && parseFloat(c.amount) > 0
    );
    const directCostsTotal = validDirectCosts.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );
    const estTotalCost = Math.round((coveredCostSum + directCostsTotal) * 100) / 100;
    const qtyProducedNum = parseInt(quantityProduced, 10) || 0;
    const estUnitCost =
      qtyProducedNum > 0 ? Math.round((estTotalCost / qtyProducedNum) * 10000) / 10000 : 0;

    return {
      itemsPreview,
      coveredCostSum,
      directCostsTotal,
      estTotalCost,
      estUnitCost,
      hasFaltantes,
    };
  }, [recipeItems, ingredients, directCosts, quantityProduced]);

  // Cálculo en tiempo real para modo manual
  const qtyNum = parseInt(quantityProduced, 10);
  const costManualNum = parseFloat(manualCost);
  const calculatedManualUnitCost =
    !isNaN(qtyNum) && qtyNum > 0 && !isNaN(costManualNum) && costManualNum >= 0
      ? costManualNum / qtyNum
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa el nombre o tipo de galleta.');
      return;
    }

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('La cantidad producida debe ser un número entero mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        // En edición: NUNCA se envía ingredientsUsed a updateBatch
        if (creationMode === 'manual') {
          if (isNaN(costManualNum) || costManualNum < 0) {
            setErrorMsg('El costo total no puede ser negativo.');
            setSubmitting(false);
            return;
          }
          await updateBatch(batchToEdit.id, {
            name: name.trim(),
            date,
            quantityProduced: hasSales ? batchToEdit.quantityProduced : qtyNum,
            totalCost: costManualNum,
            observations: observations.trim() || undefined,
          });
        } else {
          // Tanda de inventario en edición: solo campos permitidos
          await updateBatch(batchToEdit.id, {
            name: name.trim(),
            date,
            quantityProduced: hasSales ? batchToEdit.quantityProduced : qtyNum,
            observations: observations.trim() || undefined,
          });
        }
      } else {
        // Creación nueva
        if (creationMode === 'manual') {
          if (isNaN(costManualNum) || costManualNum < 0) {
            setErrorMsg('El costo total no puede ser negativo.');
            setSubmitting(false);
            return;
          }
          await addBatch({
            name: name.trim(),
            date,
            quantityProduced: qtyNum,
            totalCost: costManualNum,
            observations: observations.trim() || undefined,
          });
        } else {
          // Creación con ingredientes de inventario
          if (recipeItems.length === 0) {
            setErrorMsg('Agrega al menos un ingrediente a la receta.');
            setSubmitting(false);
            return;
          }

          // Validar renglones
          for (let i = 0; i < recipeItems.length; i++) {
            const item = recipeItems[i];
            const ing = ingredients.find((ing) => ing.id === item.ingredientId);
            if (!ing) {
              setErrorMsg(`El ingrediente seleccionado en la fila ${i + 1} no es válido.`);
              setSubmitting(false);
              return;
            }
            const q = parseFloat(item.quantity);
            if (isNaN(q) || q <= 0 || !Number.isFinite(q)) {
              setErrorMsg(`Ingresa una cantidad mayor a cero para ${ing.name}.`);
              setSubmitting(false);
              return;
            }
            if (!isUnitCompatible(item.unit, ing.dimension)) {
              setErrorMsg(
                `La unidad "${item.unit}" no es compatible con la dimensión ${ing.dimension} de ${ing.name}.`
              );
              setSubmitting(false);
              return;
            }
          }

          // Construir ingredientsUsed: envía exclusivamente los datos de la interfaz
          const ingredientsPayload = recipeItems.map((item) => {
            const ing = ingredients.find((i) => i.id === item.ingredientId)!;
            return {
              ingredientId: item.ingredientId,
              ingredientName: ing.name,
              requiredQuantity: parseFloat(item.quantity),
              requiredUnit: item.unit,
            };
          });

          // Construir otros costos directos válidos
          const validDirectCosts: BatchDirectCost[] = [];
          for (const dc of directCosts) {
            if (dc.description.trim()) {
              const amt = parseFloat(dc.amount);
              if (isNaN(amt) || amt < 0 || !Number.isFinite(amt)) {
                setErrorMsg(`El importe del costo "${dc.description}" no puede ser negativo.`);
                setSubmitting(false);
                return;
              }
              validDirectCosts.push({
                id: dc.id,
                description: dc.description.trim(),
                amount: Math.round(amt * 100) / 100,
              });
            }
          }

          // Enviar al motor addBatch (sin totalCost manual)
          await addBatch({
            name: name.trim(),
            date,
            quantityProduced: qtyNum,
            ingredientsUsed: ingredientsPayload as any,
            otherDirectCosts: validDirectCosts.length > 0 ? validDirectCosts : undefined,
            observations: observations.trim() || undefined,
          } as any);
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la tanda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#143d2b] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {isEditing ? 'Editar Tanda de Galletas' : 'Crear Tanda de Producción'}
              </h2>
              <p className="text-xs text-emerald-200/80">
                Horneado, consumo de ingredientes y costo unitario en USD ($)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modalidad de Tanda (solo visible si no está en edición) */}
          {!isEditing ? (
            <div className="p-3.5 bg-white rounded-2xl border border-stone-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Modalidad de Registro
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('inventory')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                    creationMode === 'inventory'
                      ? 'border-[#143d2b] bg-emerald-50/70 shadow-xs ring-1 ring-[#143d2b]'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <Boxes
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      creationMode === 'inventory' ? 'text-[#143d2b]' : 'text-stone-400'
                    }`}
                  />
                  <div>
                    <strong
                      className={`text-xs block font-black ${
                        creationMode === 'inventory' ? 'text-[#143d2b]' : 'text-stone-800'
                      }`}
                    >
                      Con Receta e Inventario (Recomendado)
                    </strong>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      Descuenta stock real del almacén, recalcula CPP y genera Kárdex.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                    creationMode === 'manual'
                      ? 'border-[#143d2b] bg-emerald-50/70 shadow-xs ring-1 ring-[#143d2b]'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <Calculator
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      creationMode === 'manual' ? 'text-[#143d2b]' : 'text-stone-400'
                    }`}
                  />
                  <div>
                    <strong
                      className={`text-xs block font-black ${
                        creationMode === 'manual' ? 'text-[#143d2b]' : 'text-stone-800'
                      }`}
                    >
                      Costo Manual / Histórico
                    </strong>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      Ingreso manual del costo total para tandas antiguas o sin detalle de insumos.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Banner informativo en edición */
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
              <span className="font-semibold">
                Modalidad:{' '}
                <strong>
                  {creationMode === 'inventory' ? 'Tanda con Receta e Inventario' : 'Tanda con Costo Manual'}
                </strong>
              </span>
              <span className="text-[11px] text-stone-500 italic">No convertible en edición</span>
            </div>
          )}

          {/* Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Nombre / Tipo de Galleta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Galletas con Chispas de Chocolate o Avena y Pasas"
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha de Horneado <span className="text-red-500">*</span>
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
                Cantidad Producida (Unidades) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                disabled={hasSales}
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(e.target.value)}
                placeholder="Ej. 60"
                className={`w-full p-2.5 rounded-xl border text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b] ${
                  hasSales
                    ? 'bg-stone-100 border-stone-300 cursor-not-allowed opacity-75'
                    : 'bg-white border-stone-300'
                }`}
              />
              {hasSales && (
                <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                  Bloqueado: La tanda ya registra {batchToEdit?.quantitySold} galletas vendidas.
                </p>
              )}
            </div>
          </div>

          {/* MODO MANUAL */}
          {creationMode === 'manual' && (
            <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Costo Total de Producción (USD $) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={manualCost}
                    onChange={(e) => setManualCost(e.target.value)}
                    placeholder="Ej. 15.00"
                    className="w-full pl-7 pr-3 py-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
                  />
                </div>
              </div>

              {/* Preview Costo Unitario Manual */}
              <div className="p-3 rounded-xl bg-emerald-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-200">Costo calculado por galleta:</span>
                </div>
                <span className="text-base font-black text-emerald-300">
                  {formatMoney(calculatedManualUnitCost)}
                </span>
              </div>
            </div>
          )}

          {/* MODO INVENTARIO / RECETA */}
          {creationMode === 'inventory' && (
            <div className="space-y-4">
              {/* Sección Ingredientes */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#143d2b]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                      Ingredientes de la Receta
                    </h3>
                  </div>
                  {!isEditing && ingredients.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#143d2b] border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Ingrediente
                    </button>
                  )}
                </div>

                {isEditing ? (
                  /* Modo solo lectura de ingredientes en edición */
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p>
                        Los ingredientes descontados del inventario no pueden modificarse mediante edición.
                        Para rehacer la receta, elimina la tanda (si no tiene ventas) y regístrala nuevamente.
                      </p>
                    </div>

                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                      {(batchToEdit?.ingredientsUsed || []).map((u, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900 block">{u.ingredientName}</span>
                            <span className="text-[11px] text-stone-500">
                              Requerido: {u.requiredQuantity} {u.requiredUnit} | Cubierto:{' '}
                              {u.physicallyCoveredBaseQty}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-stone-900 block">
                              {formatMoney(u.coveredCost)}
                            </span>
                            {u.uncoveredBaseQty > 0 ? (
                              <span className="text-[10px] text-amber-700 font-bold">
                                Faltante: {u.uncoveredBaseQty}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold">100% Cubierto</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : ingredients.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">No hay ingredientes registrados en el inventario.</p>
                      <p className="mt-0.5 text-[11px]">
                        Registra primero tus insumos en la pestaña «Inventario», o cambia la modalidad a «Costo Manual» para registrar esta tanda.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Constructor de Receta Activo */
                  <div className="space-y-3">
                    {recipeItems.map((item, index) => {
                      const selectedIng = ingredients.find((i) => i.id === item.ingredientId);
                      const compatibleUnits = getCompatibleUnits(selectedIng?.dimension);
                      const previewItem = recipePreview.itemsPreview[index];

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            {/* Selector Ingrediente */}
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                                Ingrediente #{index + 1}
                              </label>
                              <select
                                value={item.ingredientId}
                                onChange={(e) => handleIngredientChange(item.id, e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-semibold focus:ring-1 focus:ring-[#143d2b]"
                              >
                                {ingredients.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.physicalStock} {ing.baseUnit} disp.)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Cantidad Requerida */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="0.0001"
                                step="any"
                                required
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                placeholder="Ej. 500"
                                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-bold focus:ring-1 focus:ring-[#143d2b]"
                              />
                            </div>

                            {/* Unidad */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                                Unidad
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) => handleUnitChange(item.id, e.target.value as UnitOfMeasure)}
                                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-semibold focus:ring-1 focus:ring-[#143d2b]"
                              >
                                {compatibleUnits.map((u) => (
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

                            {/* Botón Eliminar fila */}
                            <div className="sm:col-span-1 flex justify-end items-end sm:pt-4">
                              {recipeItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipeRow(item.id)}
                                  title="Eliminar ingrediente"
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Indicador reactivo de disponibilidad física */}
                          {selectedIng && (
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-stone-200/60">
                              <div className="flex items-center gap-1.5">
                                <span className="text-stone-500">
                                  Disponible en almacén:{' '}
                                  <strong className="text-stone-800">
                                    {selectedIng.physicalStock} {selectedIng.baseUnit}
                                  </strong>
                                </span>
                              </div>

                              <div>
                                {previewItem?.status === 'empty' ? (
                                  <span className="text-stone-400 italic">Ingresa la cantidad</span>
                                ) : previewItem?.status === 'full' ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Stock suficiente (Costo est.: {formatMoney(previewItem.cost)})
                                  </span>
                                ) : previewItem?.status === 'partial' ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Faltan {previewItem.uncoveredBase} {selectedIng.baseUnit} (Costo provisional)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                                    <AlertCircle className="w-3 h-3" /> Sin stock disponible (Costo provisional)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sección Otros Costos Directos (Opcional) */}
              {!isEditing && (
                <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                        Otros Costos Directos (Opcional)
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Gas, empaques, etiquetas o mano de obra específica para esta tanda.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDirectCost}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Concepto
                    </button>
                  </div>

                  {directCosts.length > 0 && (
                    <div className="space-y-2">
                      {directCosts.map((dc) => (
                        <div key={dc.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Descripción (ej. Bolsas de papel celofán)"
                            value={dc.description}
                            onChange={(e) => handleDirectCostChange(dc.id, 'description', e.target.value)}
                            className="flex-1 p-2 bg-stone-50 rounded-lg border border-stone-300 text-xs text-stone-900 font-semibold focus:ring-1 focus:ring-[#143d2b]"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={dc.amount}
                              onChange={(e) => handleDirectCostChange(dc.id, 'amount', e.target.value)}
                              className="w-full pl-6 pr-2 py-2 bg-stone-50 rounded-lg border border-stone-300 text-xs text-stone-900 font-bold focus:ring-1 focus:ring-[#143d2b]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDirectCost(dc.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resumen previo de producción (Estimación previa reactiva) */}
              {!isEditing && (
                <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      Estimación Previa de Producción
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">USD ($)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Insumos Cubiertos
                      </span>
                      <strong className="text-sm font-black text-stone-100">
                        {formatMoney(recipePreview.coveredCostSum)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Otros Costos
                      </span>
                      <strong className="text-sm font-black text-stone-100">
                        {formatMoney(recipePreview.directCostsTotal)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Costo Total Est.
                      </span>
                      <strong className="text-sm font-black text-emerald-400">
                        {formatMoney(recipePreview.estTotalCost)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Costo por Galleta
                      </span>
                      <strong className="text-sm font-black text-emerald-300">
                        {formatMoney(recipePreview.estUnitCost)}
                      </strong>
                    </div>
                  </div>

                  {recipePreview.hasFaltantes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Tanda con costo provisional:</strong> Hay ingredientes con faltantes en inventario.
                        El almacén no se volverá negativo y los faltantes podrán regularizarse posteriormente desde producción.
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] text-stone-400 italic">
                    * La disponibilidad y costos son una previsualización. El motor addBatch realizará la transacción atómica final en Firestore.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej. Tanda especial para pedido corporativo, horneada a 180°C"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-[#143d2b]"
            />
          </div>

          {/* Botones de acción */}
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
              disabled={submitting || (!isEditing && creationMode === 'inventory' && ingredients.length === 0)}
              className="px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting
                ? 'Guardando...'
                : isEditing
                ? 'Actualizar Tanda'
                : creationMode === 'inventory'
                ? 'Hornear y Consumir Inventario'
                : 'Crear Tanda Manual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
