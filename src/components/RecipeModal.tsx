import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  BookOpen,
  AlertCircle,
  Plus,
  Trash2,
  Boxes,
  FileText,
} from 'lucide-react';
import { useData, isUnitCompatible } from '../context/DataContext.tsx';
import {
  Recipe,
  RecipeIngredientItem,
  UnitOfMeasure,
  DimensionType,
} from '../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recipeToEdit?: Recipe | null;
}

interface RecipeRowDraft {
  id: string;
  ingredientId: string;
  quantity: string;
  unit: UnitOfMeasure;
}

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

const getUnitLabel = (u: UnitOfMeasure): string => {
  switch (u) {
    case 'kg':
      return 'Kilogramos (kg)';
    case 'g':
      return 'Gramos (g)';
    case 'l':
      return 'Litros (l)';
    case 'ml':
      return 'Mililitros (ml)';
    case 'unidad':
      return 'Unidades';
    default:
      return u;
  }
};

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Error directo no serializado
  }
  return raw || fallback;
};

const RecipeModalContent: React.FC<Props> = ({ isOpen, onClose, recipeToEdit }) => {
  const { ingredients, addRecipe, updateRecipe } = useData();
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const isEditing = !!recipeToEdit;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseYield, setBaseYield] = useState('');
  const [instructions, setInstructions] = useState('');
  const [rows, setRows] = useState<RecipeRowDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(false);

    if (recipeToEdit) {
      setName(recipeToEdit.name || '');
      setDescription(recipeToEdit.description || '');
      setBaseYield(
        recipeToEdit.baseYield !== undefined ? String(recipeToEdit.baseYield) : ''
      );
      setInstructions(recipeToEdit.instructions || '');
      const initialRows: RecipeRowDraft[] = (recipeToEdit.ingredients || []).map(
        (item, idx) => {
          const catalogIng = safeIngredients.find((i) => i.id === item.ingredientId);
          const validUnit =
            catalogIng && !isUnitCompatible(item.unit, catalogIng.dimension)
              ? getDefaultUnit(catalogIng.dimension)
              : item.unit;
          return {
            id: `rrow_${Date.now()}_${idx}`,
            ingredientId: item.ingredientId,
            quantity: item.quantity !== undefined ? String(item.quantity) : '',
            unit: validUnit,
          };
        }
      );
      setRows(initialRows);
    } else {
      setName('');
      setDescription('');
      setBaseYield('');
      setInstructions('');
      if (safeIngredients.length > 0) {
        const first = safeIngredients[0];
        setRows([
          {
            id: 'rrow_' + Date.now(),
            ingredientId: first.id,
            quantity: '',
            unit: getDefaultUnit(first.dimension),
          },
        ]);
      } else {
        setRows([]);
      }
    }
  }, [isOpen, recipeToEdit]);

  const usedIngredientIds = useMemo(() => {
    return new Set(rows.map((r) => r.ingredientId).filter(Boolean));
  }, [rows]);

  const availableIngredientsToAdd = useMemo(() => {
    return safeIngredients.filter((ing) => !usedIngredientIds.has(ing.id));
  }, [safeIngredients, usedIngredientIds]);

  if (!isOpen) return null;

  const handleIngredientChange = (rowId: string, newIngredientId: string) => {
    setErrorMsg(null);
    setInfoMsg(null);

    const duplicateRow = rows.find(
      (r) => r.id !== rowId && r.ingredientId === newIngredientId
    );
    if (duplicateRow) {
      const ingName =
        safeIngredients.find((i) => i.id === newIngredientId)?.name ||
        'Ese ingrediente';
      setInfoMsg(
        `${ingName} ya está incluido en esta receta. Edita su cantidad en la fila existente.`
      );
      rowRefs.current[duplicateRow.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      return;
    }

    const selectedIng = safeIngredients.find((i) => i.id === newIngredientId);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const dim = selectedIng?.dimension;
        const unitValid = dim ? isUnitCompatible(row.unit, dim) : true;
        return {
          ...row,
          ingredientId: newIngredientId,
          unit: unitValid ? row.unit : getDefaultUnit(dim),
        };
      })
    );
  };

  const handleQuantityChange = (rowId: string, qty: string) => {
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, quantity: qty } : row))
    );
  };

  const handleUnitChange = (rowId: string, unit: UnitOfMeasure) => {
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, unit } : row))
    );
  };

  const handleAddRow = () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (safeIngredients.length === 0) return;

    const nextAvailable = availableIngredientsToAdd[0];
    if (!nextAvailable) {
      setInfoMsg(
        'Todos los ingredientes disponibles en tu inventario ya están agregados. Edita sus cantidades directamente en sus filas.'
      );
      return;
    }

    const newId =
      'rrow_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        ingredientId: nextAvailable.id,
        quantity: '',
        unit: getDefaultUnit(nextAvailable.dimension),
      },
    ]);

    requestAnimationFrame(() => {
      rowRefs.current[newId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const handleRemoveRow = (rowId: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Por favor ingresa el nombre de la receta.');
      return;
    }

    const yieldNum = Number(baseYield);
    if (
      !baseYield.trim() ||
      !Number.isFinite(yieldNum) ||
      !Number.isInteger(yieldNum) ||
      yieldNum <= 0
    ) {
      setErrorMsg(
        'El rendimiento base debe ser un número entero mayor a cero (en galletas).'
      );
      return;
    }

    if (rows.length === 0) {
      setErrorMsg('La receta debe incluir al menos un ingrediente del inventario.');
      return;
    }

    const seenIds = new Set<string>();
    const parsedIngredients: RecipeIngredientItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const catalogIng = safeIngredients.find((ing) => ing.id === row.ingredientId);
      if (!catalogIng) {
        setErrorMsg(
          `El ingrediente en la fila ${i + 1} no existe en el inventario actual. Selecciónalo nuevamente o elimínalo.`
        );
        return;
      }

      if (seenIds.has(catalogIng.id)) {
        setErrorMsg(
          `El ingrediente "${catalogIng.name}" está duplicado. Ajusta su cantidad en una sola fila.`
        );
        return;
      }
      seenIds.add(catalogIng.id);

      const qtyNum = parseFloat(row.quantity);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        setErrorMsg(`Ingresa una cantidad mayor a cero para "${catalogIng.name}".`);
        return;
      }

      if (!isUnitCompatible(row.unit, catalogIng.dimension)) {
        setErrorMsg(
          `La unidad "${row.unit}" no es compatible con la dimensión ${catalogIng.dimension} de "${catalogIng.name}".`
        );
        return;
      }

      parsedIngredients.push({
        ingredientId: catalogIng.id,
        ingredientName: catalogIng.name,
        quantity: Math.round(qtyNum * 10000) / 10000,
        unit: row.unit,
      });
    }

    setSubmitting(true);
    try {
      if (isEditing && recipeToEdit) {
        await updateRecipe(recipeToEdit.id, {
          name: trimmedName,
          description: description.trim(),
          baseYield: yieldNum,
          ingredients: parsedIngredients,
          instructions: instructions.trim(),
        });
      } else {
        await addRecipe({
          name: trimmedName,
          description: description.trim() || undefined,
          baseYield: yieldNum,
          ingredients: parsedIngredients,
          instructions: instructions.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        extractErrorMessage(err, 'No se pudo guardar la receta en la base de datos.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-dvh pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-hidden">
      <div className="bg-[#fbf8f2] text-stone-900 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-full shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        {/* Encabezado fijo */}
        <div className="shrink-0 bg-[#143d2b] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                {isEditing ? 'Editar Receta' : 'Nueva Receta de Galletas'}
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 truncate">
                Plantilla reutilizable • No descuenta existencias ni afecta costos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de receta"
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Cuerpo desplazable */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Datos Generales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nombre de la Receta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Galletas Clásicas con Chispas de Chocolate"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Rendimiento Base <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={baseYield}
                  onChange={(e) => setBaseYield(e.target.value)}
                  placeholder="Ej. 24"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
                />
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  Unidades de galletas
                </span>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Textura suave al centro y bordes dorados con chocolate semi-amargo"
                  className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Ingredientes de la Receta */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#143d2b]" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                      Ingredientes del Inventario <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Cantidades exactas para el rendimiento base indicado.
                    </p>
                  </div>
                </div>
                {safeIngredients.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={availableIngredientsToAdd.length === 0}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#143d2b] border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Ingrediente
                  </button>
                )}
              </div>

              {safeIngredients.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      No hay ingredientes registrados en el inventario.
                    </p>
                    <p className="mt-0.5 text-[11px]">
                      Registra primero tus insumos en la pestaña «Inventario» para poder vincularlos a una receta.
                    </p>
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-2">
                  <p className="text-xs text-stone-600 font-semibold">
                    Esta receta no tiene ingredientes asignados.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Primer Ingrediente
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row, index) => {
                    const selectedIng = safeIngredients.find(
                      (i) => i.id === row.ingredientId
                    );
                    const compatibleUnits = getCompatibleUnits(selectedIng?.dimension);
                    const originalRecipeItem = recipeToEdit?.ingredients?.find(
                      (orig) => orig.ingredientId === row.ingredientId
                    );

                    return (
                      <div
                        key={row.id}
                        ref={(el) => {
                          rowRefs.current[row.id] = el;
                        }}
                        className="p-3 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5 min-w-0">
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                              Ingrediente #{index + 1}
                            </label>
                            <select
                              value={row.ingredientId}
                              onChange={(e) =>
                                handleIngredientChange(row.id, e.target.value)
                              }
                              className="w-full min-w-0 p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-semibold focus:ring-1 focus:ring-[#143d2b]"
                            >
                              {!selectedIng && row.ingredientId && (
                                <option value={row.ingredientId}>
                                  {originalRecipeItem?.ingredientName || row.ingredientId} (no encontrado en inventario)
                                </option>
                              )}
                              {safeIngredients.map((ing) => {
                                const alreadyInOtherRow = rows.some(
                                  (other) =>
                                    other.id !== row.id &&
                                    other.ingredientId === ing.id
                                );
                                return (
                                  <option
                                    key={ing.id}
                                    value={ing.id}
                                    disabled={alreadyInOtherRow}
                                  >
                                    {ing.name} ({ing.baseUnit})
                                    {alreadyInOtherRow ? ' — ya agregado' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="sm:col-span-3 min-w-0">
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              required
                              value={row.quantity}
                              onChange={(e) =>
                                handleQuantityChange(row.id, e.target.value)
                              }
                              placeholder="Ej. 250"
                              className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-bold focus:ring-1 focus:ring-[#143d2b]"
                            />
                          </div>

                          <div className="sm:col-span-3 min-w-0">
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                              Unidad
                            </label>
                            <select
                              value={row.unit}
                              onChange={(e) =>
                                handleUnitChange(
                                  row.id,
                                  e.target.value as UnitOfMeasure
                                )
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-300 text-stone-900 text-xs font-semibold focus:ring-1 focus:ring-[#143d2b]"
                            >
                              {compatibleUnits.map((u) => (
                                <option key={u} value={u}>
                                  {getUnitLabel(u)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-1 flex justify-end items-end sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              title="Quitar ingrediente de la receta"
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {!selectedIng && row.ingredientId && (
                          <p className="text-[11px] text-rose-700 font-semibold">
                            Este ingrediente ya no figura en el inventario. Selecciónalo nuevamente o quita esta fila.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instrucciones de preparación */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                <FileText className="w-3.5 h-3.5 text-[#143d2b]" />
                Instrucciones de Preparación (Opcional)
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej.&#10;1. Cremar mantequilla con azúcar por 3 minutos.&#10;2. Incorporar huevos y vainilla.&#10;3. Integrar harina y chispas. Hornear a 180°C durante 12 minutos."
                className="w-full p-3 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs leading-relaxed focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden resize-y"
              />
            </div>
          </div>

          {/* Pie fijo de acciones */}
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-[#fbf8f2] border-t border-stone-200 flex flex-wrap items-center justify-end gap-2">
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
              disabled={submitting || safeIngredients.length === 0 || rows.length === 0}
              className="px-5 sm:px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 shrink-0" />
              {submitting
                ? 'Guardando...'
                : isEditing
                ? 'Actualizar Receta'
                : 'Guardar Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const RecipeModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null;
  return <RecipeModalContent {...props} />;
};
