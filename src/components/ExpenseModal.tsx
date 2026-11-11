import React, { useState } from 'react';
import { X, Check, DollarSign, Calendar, Tag, AlertCircle, Boxes, Info } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { ExpenseCategory, ExpenseType, ExpenseStatus, UnitOfMeasure } from '../types/index.ts';
import { getTodayDateString } from '../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Harina',
  'Azúcar',
  'Mantequilla',
  'Chocolate',
  'Ingredientes',
  'Empaques',
  'Utensilios',
  'Transporte',
  'Servicios',
  'Otros',
];

export const ExpenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addExpense, ingredients } = useData();

  // Mode: Ordinary expense vs. Inventory raw material purchase
  const [isInventoryPurchase, setIsInventoryPurchase] = useState<boolean>(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<string>('');
  const [purchaseUnit, setPurchaseUnit] = useState<UnitOfMeasure>('kg');

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Ingredientes');
  const [type, setType] = useState<ExpenseType>('insumo');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [status, setStatus] = useState<ExpenseStatus>('pagado');
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selected ingredient object
  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  // Derivar unidades compatibles según la dimensión del ingrediente
  const getCompatibleUnits = (dimension?: string): UnitOfMeasure[] => {
    if (dimension === 'masa') return ['kg', 'g'];
    if (dimension === 'volumen') return ['l', 'ml'];
    if (dimension === 'unidad') return ['unidad'];
    return ['kg', 'g'];
  };

  const getDefaultUnit = (dimension?: string): UnitOfMeasure => {
    if (dimension === 'masa') return 'kg';
    if (dimension === 'volumen') return 'l';
    if (dimension === 'unidad') return 'unidad';
    return 'kg';
  };

  // Toggle switch inventory mode
  const handleToggleInventory = (enable: boolean) => {
    setIsInventoryPurchase(enable);
    setErrorMsg(null);
    if (enable) {
      setType('insumo');
      setCategory('Ingredientes');
      if (ingredients.length > 0) {
        const first = ingredients[0];
        setSelectedIngredientId(first.id);
        setPurchaseUnit(getDefaultUnit(first.dimension));
        if (!description.trim()) {
          setDescription(`Compra de ${first.name}`);
        }
      }
    }
  };

  // Handle ingredient selection change
  const handleIngredientSelect = (id: string) => {
    setSelectedIngredientId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setPurchaseUnit(getDefaultUnit(ing.dimension));
      if (!description.trim() || description.startsWith('Compra de ')) {
        setDescription(`Compra de ${ing.name}`);
      }
    }
  };

  // Auto-switch suggestion of type based on category (only in non-inventory mode)
  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    if (['Harina', 'Azúcar', 'Mantequilla', 'Chocolate', 'Ingredientes'].includes(cat)) {
      setType('insumo');
    } else if (['Transporte', 'Servicios'].includes(cat)) {
      setType('operativo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Ingresa un importe válido mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Ingresa una descripción del gasto o compra.');
      return;
    }

    let parsedPurchaseQuantity: number | undefined = undefined;

    if (isInventoryPurchase) {
      if (ingredients.length === 0) {
        setErrorMsg('No hay ingredientes en el catálogo. Registra primero un ingrediente en la pestaña Inventario.');
        return;
      }
      if (!selectedIngredientId || !selectedIngredient) {
        setErrorMsg('Selecciona un ingrediente válido para la compra.');
        return;
      }
      const qty = parseFloat(purchaseQuantity);
      if (isNaN(qty) || qty <= 0 || !Number.isFinite(qty)) {
        setErrorMsg('Ingresa una cantidad comprada positiva mayor a cero.');
        return;
      }
      parsedPurchaseQuantity = qty;

      const allowedUnits = getCompatibleUnits(selectedIngredient.dimension);
      if (!allowedUnits.includes(purchaseUnit)) {
        setErrorMsg(`La unidad "${purchaseUnit}" no es compatible con la dimensión ${selectedIngredient.dimension} de ${selectedIngredient.name}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isInventoryPurchase && selectedIngredient && parsedPurchaseQuantity !== undefined) {
        await addExpense({
          description: description.trim(),
          category: 'Ingredientes',
          type: 'insumo',
          amount: Math.round(parsedAmount * 100) / 100,
          date,
          status,
          observation: observation.trim() || undefined,
          ingredientId: selectedIngredient.id,
          purchaseQuantity: parsedPurchaseQuantity,
          purchaseUnit,
        });
      } else {
        await addExpense({
          description: description.trim(),
          category,
          type,
          amount: Math.round(parsedAmount * 100) / 100,
          date,
          status,
          observation: observation.trim() || undefined,
        });
      }

      // Reset form
      setDescription('');
      setAmount('');
      setPurchaseQuantity('');
      setObservation('');
      setIsInventoryPurchase(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el gasto o compra.');
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
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Registrar Gasto o Inversión</h2>
              <p className="text-xs text-emerald-200/80">Salida de dinero o compra de insumos</p>
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Switch: ¿Es una compra de materia prima para inventario? */}
          <div className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isInventoryPurchase
                    ? 'bg-[#143d2b] text-emerald-300'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <label
                  htmlFor="inventory-toggle"
                  className="text-xs font-black text-stone-900 block cursor-pointer"
                >
                  ¿Es una compra de materia prima para inventario?
                </label>
                <p className="text-[11px] text-stone-500">
                  {isInventoryPurchase
                    ? 'Incrementará el stock físico y recalculará el CPP en el Kárdex'
                    : 'Registra un gasto operativo o compra general sin afectar inventario'}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="inventory-toggle"
              onClick={() => handleToggleInventory(!isInventoryPurchase)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isInventoryPurchase ? 'bg-[#143d2b]' : 'bg-stone-300'
              }`}
              role="switch"
              aria-checked={isInventoryPurchase}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isInventoryPurchase ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Campos específicos de Compra de Materia Prima */}
          {isInventoryPurchase && (
            <div className="space-y-3.5 p-4 bg-[#fbf8f2] rounded-2xl border border-stone-200">
              {ingredients.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    No hay ingredientes en el catálogo. Registra primero un ingrediente en la pestaña{' '}
                    <strong>«Inventario»</strong> para poder asociar compras.
                  </span>
                </div>
              ) : (
                <>
                  {/* Selector de Ingrediente */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Ingrediente de Inventario <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedIngredientId}
                      onChange={(e) => handleIngredientSelect(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b]"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.physicalStock} {ing.baseUnit} disp. - CPP: ${ing.averageCost.toFixed(4)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad Comprada y Unidad de Compra */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Cantidad Comprada <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        required
                        value={purchaseQuantity}
                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                        placeholder="Ej. 2.5"
                        className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Unidad de Compra <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={purchaseUnit}
                        onChange={(e) => setPurchaseUnit(e.target.value as UnitOfMeasure)}
                        className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-[#143d2b]"
                      >
                        {getCompatibleUnits(selectedIngredient?.dimension).map((u) => (
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

                  {/* Detalle informativo del ingrediente */}
                  {selectedIngredient && (
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                      <span>Dimensión: <strong className="text-stone-800 capitalize">{selectedIngredient.dimension}</strong></span>
                      <span>Stock actual: <strong className="text-stone-800">{selectedIngredient.physicalStock} {selectedIngredient.baseUnit}</strong></span>
                      <span>CPP actual: <strong className="text-emerald-800">${selectedIngredient.averageCost.toFixed(4)}</strong></span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. 5 kg de Harina de trigo leudante"
              className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
          </div>

          {/* Category & Classification (solo si no es compra de inventario) */}
          {!isInventoryPurchase && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                    className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Tipo de Salida <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setType('insumo')}
                      className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                        type === 'insumo'
                          ? 'bg-[#143d2b] text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Insumo
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('operativo')}
                      className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                        type === 'operativo'
                          ? 'bg-rose-700 text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Operativo
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 bg-white p-2.5 rounded-xl border border-stone-200">
                {type === 'insumo' ? (
                  <span>
                    <strong>Insumo (Inversión):</strong> Se contabiliza como salida de dinero pero no se deduce otra vez de la ganancia neta, ya que se incluirá en el costo de la tanda producida.
                  </span>
                ) : (
                  <span>
                    <strong>Gasto Operativo:</strong> Se descuenta directamente de la ganancia neta (transporte, luz, gas, servicios).
                  </span>
                )}
              </p>
            </>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Importe Total (USD $) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-[#143d2b]"
              />
            </div>
          </div>

          {/* Date and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fecha
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
                Estado de Pago
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full p-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-[#143d2b]"
              >
                <option value="pagado">Pagado de inmediato</option>
                <option value="pendiente">Pendiente (Generar cuenta por pagar)</option>
              </select>
            </div>
          </div>

          {/* Observation */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Observación (Opcional)
            </label>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ej. Comprado en la distribuidora El Trigal con descuento"
              className="w-full p-2 bg-white rounded-xl border border-stone-300 text-stone-800 text-xs focus:ring-2 focus:ring-[#143d2b]"
            />
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
              disabled={submitting || (isInventoryPurchase && ingredients.length === 0)}
              className="px-6 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Guardando...' : isInventoryPurchase ? 'Registrar Compra de Insumo' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
