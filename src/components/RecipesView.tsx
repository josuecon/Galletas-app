import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertCircle,
  Boxes,
  FileText,
  Cookie,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Recipe } from '../types/index.ts';
import { formatDate } from '../utils/formatters.ts';
import { RecipeModal } from './RecipeModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';

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

export const RecipesView: React.FC = () => {
  const { recipes, ingredients, deleteRecipe } = useData();
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return safeRecipes;
    return safeRecipes.filter((recipe) =>
      (recipe.name || '').toLowerCase().includes(q)
    );
  }, [safeRecipes, searchQuery]);

  const handleOpenCreate = () => {
    setActionError(null);
    setRecipeToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setActionError(null);
    setRecipeToEdit(recipe);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return;
    setActionError(null);
    try {
      await deleteRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
    } catch (err) {
      setActionError(
        extractErrorMessage(err, 'No se pudo eliminar la receta seleccionada.')
      );
      setRecipeToDelete(null);
    }
  };

  const resolveIngredientName = (ingredientId: string, fallbackName: string) => {
    const found = safeIngredients.find((i) => i.id === ingredientId);
    return found ? found.name : fallbackName;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de Vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#143d2b]" />
            Catálogo de Recetas
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Plantillas reutilizables con rendimiento base, ingredientes e instrucciones. No modifican existencias ni costos de inventario.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Receta
        </button>
      </div>

      {/* Mensaje de error si falla eliminación u otra acción */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between gap-2 font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xs p-1 rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Buscador por nombre */}
      {safeRecipes.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar receta por nombre..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#fbf8f2] rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-[#143d2b] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs font-bold text-stone-500">
            {filteredRecipes.length}{' '}
            {filteredRecipes.length === 1 ? 'receta encontrada' : 'recetas encontradas'}
          </span>
        </div>
      )}

      {/* Estado vacío / Resultados / Grid */}
      {safeRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">
            Todavía no tienes recetas guardadas
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-5">
            Crea plantillas con las cantidades de ingredientes e instrucciones de tus galletas para consultarlas en cualquier momento sin afectar el inventario.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-xl text-xs font-black transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Receta
          </button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-3">
          <p className="text-sm font-bold text-stone-800">
            No se encontraron recetas que coincidan con «{searchQuery}»
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Mostrar todas las recetas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => {
            const recipeIngredients = Array.isArray(recipe.ingredients)
              ? recipe.ingredients
              : [];
            const lastUpdatedDate = (recipe.updatedAt || recipe.createdAt || '').split(
              'T'
            )[0];

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Título y rendimiento */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-stone-900 leading-snug">
                        {recipe.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0">
                        <Cookie className="w-3.5 h-3.5 text-[#143d2b]" />
                        {recipe.baseYield} galletas
                      </span>
                    </div>

                    {recipe.description && (
                      <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                        {recipe.description}
                      </p>
                    )}

                    {lastUpdatedDate && (
                      <p className="text-[10px] text-stone-400 mt-1.5">
                        Actualizada el {formatDate(lastUpdatedDate)}
                      </p>
                    )}
                  </div>

                  {/* Lista de ingredientes */}
                  <div className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-stone-700">
                      <span className="flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-[#143d2b]" />
                        Ingredientes ({recipeIngredients.length})
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 normal-case">
                        Para {recipe.baseYield} unid.
                      </span>
                    </div>

                    <ul className="divide-y divide-stone-200/70">
                      {recipeIngredients.map((item, idx) => (
                        <li
                          key={`${item.ingredientId}_${idx}`}
                          className="py-1.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-semibold text-stone-800 truncate">
                            {resolveIngredientName(
                              item.ingredientId,
                              item.ingredientName
                            )}
                          </span>
                          <span className="font-black text-[#143d2b] shrink-0">
                            {item.quantity}{' '}
                            {item.unit === 'unidad' ? 'unid.' : item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instrucciones opcionales */}
                  {recipe.instructions && (
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-700">
                        <FileText className="w-3.5 h-3.5 text-[#143d2b]" />
                        Instrucciones
                      </div>
                      <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed">
                        {recipe.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pie de acciones */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                  <span className="text-[10px] text-stone-400 font-medium">
                    Plantilla independiente
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(recipe)}
                      title="Editar Receta"
                      className="px-3 py-1.5 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipeToDelete(recipe)}
                      title="Eliminar Receta"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Receta */}
      <RecipeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setRecipeToEdit(null);
        }}
        recipeToEdit={recipeToEdit}
      />

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!recipeToDelete}
        title="¿Eliminar esta receta?"
        message={`Se eliminará la plantilla "${recipeToDelete?.name || ''}". Esta acción no afecta tu inventario ni modifica tandas ya registradas.`}
        confirmLabel="Eliminar Receta"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRecipeToDelete(null)}
      />
    </div>
  );
};
