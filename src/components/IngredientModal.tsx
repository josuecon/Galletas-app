import React, { useState, useEffect } from 'react';
import { X, Check, Boxes, AlertCircle, Info, Lock } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Ingredient, DimensionType, BaseUnit } from '../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ingredientToEdit?: Ingredient | null;
}

const COMMON_CATEGORIES = [
  'Harinas y Féculas',
  'Azúcares y Endulzantes',
  'Grasas y Lácteos',
  'Chocolates y Cacao',
  'Frutos Secos y Semillas',
  'Huevos y Líquidos',
  'Esencias y Especias',
  'Levaduras y Polvos',
  'Empaques e Insumos Directos',
  'Otros',
];

export const IngredientModal: React.FC<Props> = ({ isOpen, onClose, ingredientToEdit }) => {
  const { addIngredient, updateIngredient, inventoryMovements } = useData();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [dimension, setDimension] = useState<DimensionType>('masa');
  const [minStockAlert, setMinStockAlert] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determinar si el ingrediente ya tiene movimientos registrados en el Kárdex
  const hasMovements = ingredientToEdit
    ? inventoryMovements.some((m) => m.ingredientId === ingredientToEdit.id)
    : false;

  // Cargar datos al abrir o cambiar de ingrediente
  useEffect(() => {
    if (ingredientToEdit) {
      setName(ingredientToEdit.name);
      if (COMMON_CATEGORIES.includes(ingredientToEdit.category)) {
        setCategory(ingredientToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Otros');
        setCustomCategory(ingredientToEdit.category);
      }
      setDimension(ingredientToEdit.dimension);
      setMinStockAlert(
        ingredientToEdit.minStockAlert !== undefined && ingredientToEdit.minStockAlert !== null
          ? String(ingredientToEdit.minStockAlert)
          : ''
      );
    } else {
      setName('');
      setCategory(COMMON_CATEGORIES[0]);
      setCustomCategory('');
      setDimension('masa');
      setMinStockAlert('');
    }
    setErrorMsg(null);
  }, [ingredientToEdit, isOpen]);

  if (!isOpen) return null;

  // Derivar unidad base según la dimensión
  const baseUnit: BaseUnit =
    dimension === 'masa' ? 'g' : dimension === 'volumen' ? 'ml' : 'unidad';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Ingresa un nombre para el ingrediente.');
      return;
    }

    const finalCategory =
      category === 'Otros' && customCategory.trim()
        ? customCategory.trim()
        : category;

    let parsedMinStock: number | undefined = undefined;
    if (minStockAlert.trim() !== '') {
      const val = parseFloat(minStockAlert);
      if (isNaN(val) || val < 0) {
        setErrorMsg('El stock mínimo de alerta debe ser un número mayor o igual a 0.');
        return;
      }
      parsedMinStock = val;
    }

    setSubmitting(true);
    try {
      if (ingredientToEdit) {
        // En edición, no se modifican dimensión, unidad base ni existencias
        await updateIngredient(ingredientToEdit.id, {
          name: cleanName,
          category: finalCategory,
          minStockAlert: parsedMinStock,
        });
      } else {
        // En creación, inicializa en 0 existencias y CPP
        await addIngredient({
          name: cleanName,
          category: finalCategory,
          dimension,
          baseUnit,
          minStockAlert: parsedMinStock,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el ingrediente.');
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
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {ingredientToEdit ? 'Editar Ingrediente' : 'Nuevo Ingrediente de Inventario'}
              </h2>
              <p className="text-xs text-emerald-200/80">
                Catálogo de materia prima y control de existencias
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre del Ingrediente */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nombre del Ingrediente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Harina de Trigo Todo Uso, Mantequilla Sin Sal..."
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
            >
              {COMMON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {category === 'Otros' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Escribe la categoría personalizada..."
                className="w-full mt-2 p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-[#143d2b]"
              />
            )}
          </div>

          {/* Dimensión y Unidad Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>Dimensión Física</span>
                {hasMovements && (
                  <span title="Bloqueado por historial Kárdex">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                )}
              </label>
              <select
                disabled={Boolean(ingredientToEdit && hasMovements)}
                value={dimension}
                onChange={(e) => setDimension(e.target.value as DimensionType)}
                className={`w-full p-2.5 rounded-xl border text-sm font-semibold ${
                  ingredientToEdit && hasMovements
                    ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                    : 'bg-white border-stone-300 text-stone-900 focus:ring-2 focus:ring-[#143d2b]'
                }`}
              >
                <option value="masa">Masa (Sólidos pesables)</option>
                <option value="volumen">Volumen (Líquidos)</option>
                <option value="unidad">Unidad (Discretos / Piezas)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>Unidad Base del Sistema</span>
                {hasMovements && <Lock className="w-3.5 h-3.5 text-amber-600" />}
              </label>
              <div className="p-2.5 bg-stone-100 rounded-xl border border-stone-200 text-sm font-black text-stone-700 flex items-center justify-between">
                <span>{baseUnit === 'g' ? 'Gramos (g)' : baseUnit === 'ml' ? 'Mililitros (ml)' : 'Unidad'}</span>
                <span className="text-[10px] uppercase font-bold text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                  Fija
                </span>
              </div>
            </div>
          </div>

          {/* Notificación si la dimensión está bloqueada */}
          {ingredientToEdit && hasMovements && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                La dimensión y la unidad base están bloqueadas porque este ingrediente ya posee movimientos registrados en el Kárdex.
              </span>
            </div>
          )}

          {/* Stock Mínimo de Alerta */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Alerta de Stock Mínimo ({baseUnit}) <span className="text-stone-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              placeholder={`Ej. 1000 ${baseUnit} para advertir reposición`}
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b]"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Se mostrará un aviso visual cuando la existencia física total sea igual o menor a esta cantidad.
            </p>
          </div>

          {/* Nota informativa de existencias y costos */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>Regla de negocio:</strong> Las existencias físicas y el Costo Promedio Ponderado (CPP) nunca se editan manualmente; se alimentan automáticamente a través de las compras de insumos y consumos en tandas.
            </span>
          </div>

          {/* Botones de acción */}
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
              disabled={submitting}
              className="px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Guardando...' : ingredientToEdit ? 'Actualizar Ingrediente' : 'Crear Ingrediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
