import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from './AuthContext.tsx';
import {
  Expense,
  Batch,
  Sale,
  Receivable,
  Payable,
  Ingredient,
  InventoryMovement,
  BatchIngredientUsage,
  UnitOfMeasure,
  DimensionType,
  FinancialSummary,
  AppBackup,
  PaymentInstallment,
} from '../types/index.ts';
import { handleFirestoreError, OperationType } from '../services/firebase.ts';
import { sanitizeForFirestore } from '../utils/sanitize.ts';

// Conversión exacta a unidad base: masa -> g, volumen -> ml, unidad -> unidad
export const convertToBaseUnit = (qty: number, unit: UnitOfMeasure): number => {
  if (unit === 'kg' || unit === 'l') {
    return Math.round(qty * 1000 * 10000) / 10000;
  }
  return qty;
};

// Validación de compatibilidad dimensional estricta
export const isUnitCompatible = (unit: UnitOfMeasure, dimension: DimensionType): boolean => {
  if (dimension === 'masa') return unit === 'g' || unit === 'kg';
  if (dimension === 'volumen') return unit === 'ml' || unit === 'l';
  if (dimension === 'unidad') return unit === 'unidad';
  return false;
};

// Detección multicriterio para impedir la eliminación directa de compras de inventario
export const isInventoryLinkedExpense = (expense: Expense): boolean => {
  return Boolean(
    (expense.ingredientId && expense.ingredientId.trim() !== '') ||
    (expense.inventoryMovementId && expense.inventoryMovementId.trim() !== '') ||
    (typeof expense.purchaseQuantity === 'number' && expense.purchaseQuantity > 0) ||
    (expense.purchaseUnit && expense.purchaseUnit.trim() !== '') ||
    expense.isReversed === true ||
    expense.status === 'anulado'
  );
};

interface DataContextType {
  expenses: Expense[];
  batches: Batch[];
  sales: Sale[];
  receivables: Receivable[];
  payables: Payable[];
  ingredients: Ingredient[];
  inventoryMovements: InventoryMovement[];
  loadingData: boolean;
  // Calculations
  financialSummary: FinancialSummary;
  // CRUD Ingredients
  addIngredient: (data: Omit<Ingredient, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'physicalStock' | 'averageCost' | 'totalValue'>) => Promise<string>;
  updateIngredient: (id: string, updates: Partial<Pick<Ingredient, 'name' | 'category' | 'minStockAlert'>>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  // CRUD Expenses & Inventory Purchases
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  reverseExpense: (id: string, reason?: string) => Promise<void>;
  // CRUD Batches & Regularization
  addBatch: (batch: Omit<Batch, 'id' | 'userId' | 'quantitySold' | 'unitCost' | 'createdAt'>) => Promise<string>;
  updateBatch: (id: string, updates: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  regularizeBatchIngredient: (params: {
    batchId: string;
    ingredientId: string;
    qtyToRegularize: number;
    mode: 'FISICA_Y_VALORATIVA' | 'SOLO_VALORATIVA';
    referenceCost: number;
    sourceType: 'compra' | 'cpp_actual';
    referenceExpenseId?: string;
  }) => Promise<void>;
  // CRUD Sales
  addSale: (sale: Omit<Sale, 'id' | 'userId' | 'totalUnits' | 'totalAmount' | 'createdAt'>) => Promise<string>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  // Receivables & Payables
  addReceivable: (receivable: Omit<Receivable, 'id' | 'userId' | 'totalPaid' | 'pendingBalance' | 'status' | 'createdAt' | 'installments'>) => Promise<string>;
  addReceivableInstallment: (receivableId: string, installment: Omit<PaymentInstallment, 'id'>) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;
  addPayable: (payable: Omit<Payable, 'id' | 'userId' | 'totalPaid' | 'pendingBalance' | 'status' | 'createdAt' | 'installments'>) => Promise<string>;
  addPayableInstallment: (payableId: string, installment: Omit<PaymentInstallment, 'id'>) => Promise<void>;
  deletePayable: (id: string) => Promise<void>;
  // Backup & Restore
  exportBackup: () => AppBackup;
  importBackup: (backup: AppBackup) => Promise<{ success: boolean; count: number; error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, dbInstance } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!user || !dbInstance) {
      setExpenses([]);
      setBatches([]);
      setSales([]);
      setReceivables([]);
      setPayables([]);
      setIngredients([]);
      setInventoryMovements([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const uid = user.uid;

    const expensesPath = `users/${uid}/expenses`;
    const batchesPath = `users/${uid}/batches`;
    const salesPath = `users/${uid}/sales`;
    const receivablesPath = `users/${uid}/receivables`;
    const payablesPath = `users/${uid}/payables`;
    const ingredientsPath = `users/${uid}/ingredients`;
    const inventoryMovementsPath = `users/${uid}/inventoryMovements`;

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 7) {
        setLoadingData(false);
      }
    };

    const unsubExpenses = onSnapshot(
      query(collection(dbInstance, expensesPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Expense));
        items.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, expensesPath);
      }
    );

    const unsubBatches = onSnapshot(
      query(collection(dbInstance, batchesPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Batch));
        items.sort((a, b) => b.date.localeCompare(a.date));
        setBatches(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, batchesPath);
      }
    );

    const unsubSales = onSnapshot(
      query(collection(dbInstance, salesPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Sale));
        items.sort((a, b) => b.date.localeCompare(a.date));
        setSales(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, salesPath);
      }
    );

    const unsubReceivables = onSnapshot(
      query(collection(dbInstance, receivablesPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Receivable));
        items.sort((a, b) => b.date.localeCompare(a.date));
        setReceivables(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, receivablesPath);
      }
    );

    const unsubPayables = onSnapshot(
      query(collection(dbInstance, payablesPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Payable));
        items.sort((a, b) => b.date.localeCompare(a.date));
        setPayables(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, payablesPath);
      }
    );

    const unsubIngredients = onSnapshot(
      query(collection(dbInstance, ingredientsPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Ingredient));
        items.sort((a, b) => a.name.localeCompare(b.name));
        setIngredients(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ingredientsPath);
      }
    );

    const unsubInventoryMovements = onSnapshot(
      query(collection(dbInstance, inventoryMovementsPath)),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as InventoryMovement));
        items.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
        setInventoryMovements(items);
        checkLoaded();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, inventoryMovementsPath);
      }
    );

    return () => {
      unsubExpenses();
      unsubBatches();
      unsubSales();
      unsubReceivables();
      unsubPayables();
      unsubIngredients();
      unsubInventoryMovements();
    };
  }, [user, dbInstance]);

  // Unified financial calculations in USD
  const financialSummary = useMemo<FinancialSummary>(() => {
    // 1. Total Inversiones (insumos de producción activos, excluyendo anulados)
    const activeExpenses = expenses.filter((e) => e.status !== 'anulado');
    const totalInvestments = activeExpenses
      .filter((e) => e.type === 'insumo')
      .reduce((sum, e) => sum + e.amount, 0);

    // 2. Total Gastos Operativos (transporte, servicios, empaques, etc., excluyendo anulados)
    const totalOperatingExpenses = activeExpenses
      .filter((e) => e.type === 'operativo')
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Total Ventas registradas
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    // 4. Dinero Efectivamente Cobrado:
    // Dinero cobrado de contado en ventas + todos los abonos registrados en cuentas por cobrar
    const upfrontCollected = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const installmentsCollected = receivables.reduce((sum, r) => {
      return sum + (r.installments || []).reduce((iSum, inst) => iSum + inst.amount, 0);
    }, 0);
    const totalCollected = upfrontCollected + installmentsCollected;

    // 5. Dinero Pendiente de Cobrar
    const totalPendingReceivable = receivables.reduce(
      (sum, r) => sum + Math.max(0, r.pendingBalance),
      0
    );

    // 6. Dinero Pendiente de Pagar
    const totalPendingPayable = payables.reduce(
      (sum, p) => sum + Math.max(0, p.pendingBalance),
      0
    );

    // 7. Costo de producción vendido:
    // Por cada venta: unidades vendidas * costo unitario de su tanda
    const batchesMap = new Map<string, Batch>();
    batches.forEach((b) => batchesMap.set(b.id, b));

    const productionCostSold = sales.reduce((sum, sale) => {
      const batch = batchesMap.get(sale.batchId);
      const unitCost = batch ? batch.unitCost : 0;
      return sum + sale.totalUnits * unitCost;
    }, 0);

    // 8. Ganancia Bruta = Total Ventas - Costo de producción vendido
    const grossProfit = totalSales - productionCostSold;

    // 9. Ganancia Neta = Ganancia Bruta - Gastos Operativos
    const netProfit = grossProfit - totalOperatingExpenses;

    return {
      totalInvestments: Math.round(totalInvestments * 100) / 100,
      totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalPendingReceivable: Math.round(totalPendingReceivable * 100) / 100,
      totalPendingPayable: Math.round(totalPendingPayable * 100) / 100,
      productionCostSold: Math.round(productionCostSold * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  }, [expenses, sales, receivables, payables, batches, ingredients, inventoryMovements]);

  // CRUD INGREDIENTS
  const addIngredient = async (
    data: Omit<Ingredient, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'physicalStock' | 'averageCost' | 'totalValue'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/ingredients`;
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('El nombre del ingrediente es obligatorio.');
      }
      if (!['masa', 'volumen', 'unidad'].includes(data.dimension)) {
        throw new Error('Dimensión no válida. Debe ser masa, volumen o unidad.');
      }
      const baseUnit = data.dimension === 'masa' ? 'g' : data.dimension === 'volumen' ? 'ml' : 'unidad';
      const id = 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newIng: Ingredient = {
        ...data,
        name: data.name.trim(),
        id,
        userId: user.uid,
        baseUnit,
        physicalStock: 0,
        averageCost: 0,
        totalValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, path, id), sanitizeForFirestore(newIng));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateIngredient = async (
    id: string,
    updates: Partial<Pick<Ingredient, 'name' | 'category' | 'minStockAlert'>>
  ): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/ingredients`;
    try {
      if (updates.name !== undefined && updates.name.trim() === '') {
        throw new Error('El nombre no puede estar vacío.');
      }
      const cleanUpdates = sanitizeForFirestore({
        ...updates,
        name: updates.name ? updates.name.trim() : undefined,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(dbInstance, path, id), cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteIngredient = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/ingredients`;
    try {
      const hasMovements = inventoryMovements.some((m) => m.ingredientId === id);
      if (hasMovements) {
        throw new Error('No se puede eliminar este ingrediente porque tiene movimientos de inventario registrados en el Kárdex.');
      }
      const inBatches = batches.some((b) => (b.ingredientsUsed || []).some((u) => u.ingredientId === id));
      if (inBatches) {
        throw new Error('No se puede eliminar este ingrediente porque está registrado en tandas de producción.');
      }
      const inExpenses = expenses.some((e) => e.ingredientId === id);
      if (inExpenses) {
        throw new Error('No se puede eliminar este ingrediente porque está vinculado a compras de insumos.');
      }

      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // CRUD EXPENSES & INVENTORY PURCHASES
  const addExpense = async (data: Omit<Expense, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const uid = user.uid;
    const expensesPath = `users/${uid}/expenses`;

    // 1. Compra de insumo vinculada a inventario
    if (data.ingredientId && data.ingredientId.trim() !== '') {
      try {
        if (!data.purchaseQuantity || data.purchaseQuantity <= 0 || !Number.isFinite(data.purchaseQuantity)) {
          throw new Error('La cantidad comprada debe ser un número positivo mayor a cero.');
        }
        if (!data.purchaseUnit) {
          throw new Error('La unidad de compra es requerida.');
        }
        if (data.amount <= 0 || !Number.isFinite(data.amount)) {
          throw new Error('El importe de la compra debe ser un número positivo mayor a cero.');
        }

        const expenseId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const movementId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const payableId = data.status === 'pendiente' ? 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) : undefined;

        await runTransaction(dbInstance, async (transaction) => {
          const ingRef = doc(dbInstance, `users/${uid}/ingredients`, data.ingredientId!);
          const ingSnap = await transaction.get(ingRef);
          if (!ingSnap.exists()) {
            throw new Error('El ingrediente seleccionado no existe en el catálogo.');
          }
          const ing = ingSnap.data() as Ingredient;

          if (!isUnitCompatible(data.purchaseUnit!, ing.dimension)) {
            throw new Error(`La unidad "${data.purchaseUnit}" no es compatible con la dimensión ${ing.dimension} del ingrediente.`);
          }

          const baseQty = convertToBaseUnit(data.purchaseQuantity!, data.purchaseUnit!);
          if (baseQty <= 0) throw new Error('La cantidad en unidad base debe ser mayor a cero.');

          // Cálculo del nuevo stock físico, CPP y valor total en USD
          const curStock = ing.physicalStock || 0;
          const curCost = ing.averageCost || 0;
          const newStock = Math.round((curStock + baseQty) * 10000) / 10000;
          const newAvgCost = newStock > 0
            ? Math.round((((curStock * curCost) + data.amount) / newStock) * 1000000) / 1000000
            : 0;
          const newTotalValue = Math.round((newStock * newAvgCost) * 100) / 100;

          // A. Actualizar ingrediente
          transaction.update(ingRef, {
            physicalStock: newStock,
            averageCost: newAvgCost,
            totalValue: newTotalValue,
            updatedAt: new Date().toISOString(),
          });

          // B. Registrar movimiento inmutable en Kárdex
          const movRef = doc(dbInstance, `users/${uid}/inventoryMovements`, movementId);
          const newMovement: InventoryMovement = {
            id: movementId,
            userId: uid,
            ingredientId: ing.id,
            ingredientName: ing.name,
            type: 'compra',
            enteredQuantity: data.purchaseQuantity!,
            enteredUnit: data.purchaseUnit!,
            baseQuantity: baseQty,
            baseUnit: ing.baseUnit,
            unitCost: Math.round((data.amount / baseQty) * 1000000) / 1000000,
            totalAmount: data.amount,
            referenceId: expenseId,
            date: data.date,
            createdAt: new Date().toISOString(),
          };
          transaction.set(movRef, sanitizeForFirestore(newMovement));

          // C. Registrar cuenta por pagar si está pendiente
          if (payableId) {
            const payRef = doc(dbInstance, `users/${uid}/payables`, payableId);
            const newPayable: Payable = {
              id: payableId,
              userId: uid,
              supplierName: data.description,
              concept: `Compra de insumo: ${ing.name}`,
              totalAmount: data.amount,
              date: data.date,
              installments: [],
              totalPaid: 0,
              pendingBalance: data.amount,
              status: 'pendiente',
              expenseCategory: data.category,
              expenseType: data.type,
              linkedExpenseId: expenseId,
              createdAt: new Date().toISOString(),
            };
            transaction.set(payRef, sanitizeForFirestore(newPayable));
          }

          // D. Guardar gasto con metadatos de inventario
          const expRef = doc(dbInstance, expensesPath, expenseId);
          const newExpense: Expense = {
            ...data,
            id: expenseId,
            userId: uid,
            ingredientName: ing.name,
            inventoryMovementId: movementId,
            linkedPayableId: payableId,
            createdAt: new Date().toISOString(),
          };
          transaction.set(expRef, sanitizeForFirestore(newExpense));
        });

        return expenseId;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, expensesPath);
      }
    }

    // 2. Gasto ordinario (no vinculado a inventario)
    try {
      const id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let linkedPayableId: string | undefined = undefined;

      if (data.status === 'pendiente') {
        const payableId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        linkedPayableId = payableId;
        const newPayable: Payable = {
          id: payableId,
          userId: user.uid,
          supplierName: data.description,
          concept: `Gasto pendiente: ${data.category}`,
          totalAmount: data.amount,
          date: data.date,
          installments: [],
          totalPaid: 0,
          pendingBalance: data.amount,
          status: 'pendiente',
          expenseCategory: data.category,
          expenseType: data.type,
          linkedExpenseId: id,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(dbInstance, `users/${user.uid}/payables`, payableId), sanitizeForFirestore(newPayable));
      }

      const newExpense: Expense = {
        ...data,
        id,
        userId: user.uid,
        linkedPayableId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, expensesPath, id), sanitizeForFirestore(newExpense));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, expensesPath);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/expenses`;
    try {
      const cleanUpdates = sanitizeForFirestore(updates);
      await updateDoc(doc(dbInstance, path, id), cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/expenses`;
    try {
      const target = expenses.find((e) => e.id === id);
      if (!target) return;

      // Guardia multicriterio para compras de inventario
      if (isInventoryLinkedExpense(target)) {
        throw new Error(
          'Operación rechazada: Este registro corresponde a una compra de inventario ' +
          '(o a una compra anulada vinculada al Kárdex). No se puede eliminar directamente. ' +
          'Para anular una compra activa utilice la función de reversión (reverseExpense).'
        );
      }

      if (target.linkedPayableId) {
        await deleteDoc(doc(dbInstance, `users/${user.uid}/payables`, target.linkedPayableId));
      }
      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const reverseExpense = async (id: string, reason?: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const uid = user.uid;
    const expensesPath = `users/${uid}/expenses`;

    try {
      await runTransaction(dbInstance, async (transaction) => {
        // 1. Lecturas
        const expRef = doc(dbInstance, expensesPath, id);
        const expSnap = await transaction.get(expRef);
        if (!expSnap.exists()) throw new Error('El registro de gasto no existe.');

        const exp = expSnap.data() as Expense;
        if (exp.status === 'anulado' || exp.isReversed) {
          throw new Error('Esta compra ya ha sido anulada/revertida anteriormente.');
        }
        if (!exp.ingredientId || !exp.purchaseQuantity) {
          throw new Error('Este gasto no corresponde a una compra de insumos con inventario.');
        }

        const ingRef = doc(dbInstance, `users/${uid}/ingredients`, exp.ingredientId);
        const ingSnap = await transaction.get(ingRef);
        if (!ingSnap.exists()) throw new Error('El ingrediente vinculado ya no existe.');
        const ing = ingSnap.data() as Ingredient;

        // Comprobar cuenta por pagar vinculada
        if (exp.linkedPayableId) {
          const payRef = doc(dbInstance, `users/${uid}/payables`, exp.linkedPayableId);
          const paySnap = await transaction.get(payRef);
          if (paySnap.exists()) {
            const pay = paySnap.data() as Payable;
            if (pay.totalPaid > 0) {
              throw new Error(`No se puede revertir esta compra porque la cuenta por pagar ya registra abonos pagados ($${pay.totalPaid}).`);
            }
          }
        }

        // 2. Comprobar referencias en regularizaciones de tandas
        const isReferencedInBatch = batches.some((b) =>
          (b.ingredientsUsed || []).some((u) => u.referenceExpenseId === id)
        );
        if (isReferencedInBatch) {
          throw new Error('No se puede revertir esta compra porque está siendo utilizada como costo de referencia en regularizaciones de tandas.');
        }

        // 3. Comprobar que no existan movimientos posteriores para este ingrediente
        const purchasedBaseQty = convertToBaseUnit(exp.purchaseQuantity, exp.purchaseUnit || 'g');
        const curStock = ing.physicalStock || 0;

        if (curStock < purchasedBaseQty) {
          throw new Error(`Stock insuficiente para revertir la compra. Disponible: ${curStock}, a devolver: ${purchasedBaseQty}.`);
        }

        const relatedMovements = inventoryMovements.filter(
          (m) => m.ingredientId === ing.id
        );
        const purchaseMov = relatedMovements.find(
          (m) => m.referenceId === id || m.id === exp.inventoryMovementId
        );

        if (purchaseMov) {
          const purchaseTime = purchaseMov.createdAt || purchaseMov.date;
          const hasSubsequentMovements = relatedMovements.some((m) => {
            if (m.id === purchaseMov.id) return false;
            const mTime = m.createdAt || m.date;
            return mTime > purchaseTime;
          });

          if (hasSubsequentMovements) {
            throw new Error(
              'No se puede revertir esta compra directamente porque existen movimientos posteriores en el Kárdex para este ingrediente. ' +
              'Para ajustar el saldo físico utilice un Ajuste de Merma.'
            );
          }
        }

        // 4. Calcular stock físico y CPP restaurados
        const newStock = Math.max(0, Math.round((curStock - purchasedBaseQty) * 10000) / 10000);
        const curCost = ing.averageCost || 0;
        let newAvgCost = 0;
        if (newStock > 0) {
          const remainingVal = (curStock * curCost) - exp.amount;
          newAvgCost = Math.max(0, Math.round((remainingVal / newStock) * 1000000) / 1000000);
        }
        const newTotalValue = Math.round((newStock * newAvgCost) * 100) / 100;

        // 5. Escrituras atómicas
        transaction.update(ingRef, {
          physicalStock: newStock,
          averageCost: newAvgCost,
          totalValue: newTotalValue,
          updatedAt: new Date().toISOString(),
        });

        const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const movRef = doc(dbInstance, `users/${uid}/inventoryMovements`, movId);
        const compMovement: InventoryMovement = {
          id: movId,
          userId: uid,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'reversion_compra',
          enteredQuantity: exp.purchaseQuantity,
          enteredUnit: exp.purchaseUnit || 'g',
          baseQuantity: -purchasedBaseQty,
          baseUnit: ing.baseUnit,
          unitCost: Math.round((exp.amount / purchasedBaseQty) * 1000000) / 1000000,
          totalAmount: -exp.amount,
          referenceId: exp.id,
          notes: reason ? `Reversión: ${reason}` : 'Reversión integral de compra',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        transaction.set(movRef, sanitizeForFirestore(compMovement));

        transaction.update(expRef, {
          status: 'anulado',
          isReversed: true,
          reversalReason: reason || 'Reversión de compra',
          reversalDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (exp.linkedPayableId) {
          const payRef = doc(dbInstance, `users/${uid}/payables`, exp.linkedPayableId);
          transaction.update(payRef, {
            status: 'anulado',
            pendingBalance: 0,
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, expensesPath);
    }
  };

  // CRUD BATCHES & INVENTORY PRODUCTION
  const addBatch = async (
    data: Omit<Batch, 'id' | 'userId' | 'quantitySold' | 'unitCost' | 'createdAt'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const uid = user.uid;
    const batchesPath = `users/${uid}/batches`;

    try {
      if (data.quantityProduced <= 0 || !Number.isFinite(data.quantityProduced)) {
        throw new Error('La cantidad producida debe ser mayor a cero.');
      }

      // 1. Tanda con desglose de ingredientes utilizados
      if (data.ingredientsUsed && data.ingredientsUsed.length > 0) {
        const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        // Consolidar líneas repetidas de la receta por ingrediente
        const consolidatedMap = new Map<string, {
          ingredientId: string;
          ingredientName: string;
          requiredQuantity: number;
          requiredUnit: UnitOfMeasure;
          requiredBaseQty: number;
        }>();

        for (const item of data.ingredientsUsed) {
          if (item.requiredQuantity <= 0 || !Number.isFinite(item.requiredQuantity)) {
            throw new Error(`La cantidad requerida para ${item.ingredientName} debe ser mayor a cero.`);
          }
          const baseQty = convertToBaseUnit(item.requiredQuantity, item.requiredUnit);
          const existing = consolidatedMap.get(item.ingredientId);
          if (existing) {
            existing.requiredQuantity += item.requiredQuantity;
            existing.requiredBaseQty = Math.round((existing.requiredBaseQty + baseQty) * 10000) / 10000;
          } else {
            consolidatedMap.set(item.ingredientId, {
              ingredientId: item.ingredientId,
              ingredientName: item.ingredientName,
              requiredQuantity: item.requiredQuantity,
              requiredUnit: item.requiredUnit,
              requiredBaseQty: baseQty,
            });
          }
        }

        const consolidatedItems = Array.from(consolidatedMap.values());

        await runTransaction(dbInstance, async (transaction) => {
          // Lectura atómica previa de los ingredientes
          const ingRefs = consolidatedItems.map((item) =>
            doc(dbInstance, `users/${uid}/ingredients`, item.ingredientId)
          );
          const ingSnaps = await Promise.all(ingRefs.map((ref) => transaction.get(ref)));

          for (let i = 0; i < consolidatedItems.length; i++) {
            const snap = ingSnaps[i];
            const item = consolidatedItems[i];
            if (!snap.exists()) {
              throw new Error(`El ingrediente "${item.ingredientName}" no existe en el catálogo.`);
            }
            const ing = snap.data() as Ingredient;
            if (!isUnitCompatible(item.requiredUnit, ing.dimension)) {
              throw new Error(`La unidad "${item.requiredUnit}" no es compatible con la dimensión ${ing.dimension} de ${ing.name}.`);
            }
          }

          let totalCoveredIngredientsCost = 0;
          const processedIngredientsUsed: BatchIngredientUsage[] = [];
          const ingUpdates: { ref: any; updates: any }[] = [];
          const kardexMovements: InventoryMovement[] = [];

          for (let i = 0; i < consolidatedItems.length; i++) {
            const item = consolidatedItems[i];
            const ing = ingSnaps[i].data() as Ingredient;

            const availStock = ing.physicalStock || 0;
            const currCost = ing.averageCost || 0;

            // Regla del Cero: Descontar exclusivamente disponibilidad física existente (nunca stock negativo)
            const coveredBaseQty = Math.min(item.requiredBaseQty, Math.max(0, availStock));
            const uncoveredBaseQty = Math.round((item.requiredBaseQty - coveredBaseQty) * 10000) / 10000;
            const coveredCost = Math.round((coveredBaseQty * currCost) * 100) / 100;
            totalCoveredIngredientsCost += coveredCost;

            const isFullyCovered = uncoveredBaseQty === 0;

            processedIngredientsUsed.push({
              ingredientId: ing.id,
              ingredientName: ing.name,
              requiredQuantity: item.requiredQuantity,
              requiredUnit: item.requiredUnit,
              requiredBaseQty: item.requiredBaseQty,
              physicallyCoveredBaseQty: coveredBaseQty,
              valuedBaseQty: coveredBaseQty,
              uncoveredBaseQty,
              coveredCost,
              unitCostAtBatch: currCost,
              isFullyCovered,
            });

            const newStock = Math.max(0, Math.round((availStock - coveredBaseQty) * 10000) / 10000);
            const newTotalVal = Math.round((newStock * currCost) * 100) / 100;
            ingUpdates.push({
              ref: ingSnaps[i].ref,
              updates: {
                physicalStock: newStock,
                totalValue: newTotalVal,
                updatedAt: new Date().toISOString(),
              },
            });

            if (coveredBaseQty > 0) {
              const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i;
              kardexMovements.push({
                id: movId,
                userId: uid,
                ingredientId: ing.id,
                ingredientName: ing.name,
                type: 'consumo_tanda',
                enteredQuantity: item.requiredQuantity,
                enteredUnit: item.requiredUnit,
                baseQuantity: -coveredBaseQty,
                baseUnit: ing.baseUnit,
                unitCost: currCost,
                totalAmount: coveredCost,
                referenceId: batchId,
                batchRecipeName: data.name,
                date: data.date,
                createdAt: new Date().toISOString(),
              });
            }
          }

          // Otros costos directos (empaques, gas, etc.)
          let otherDirectCostsAmount = 0;
          if (data.otherDirectCosts && data.otherDirectCosts.length > 0) {
            for (const c of data.otherDirectCosts) {
              if (c.amount < 0 || !Number.isFinite(c.amount)) {
                throw new Error(`El importe del costo "${c.description}" no puede ser negativo.`);
              }
              otherDirectCostsAmount += c.amount;
            }
          }

          const totalCost = Math.round((totalCoveredIngredientsCost + otherDirectCostsAmount) * 100) / 100;
          const unitCost = Math.round((totalCost / data.quantityProduced) * 10000) / 10000;
          const hasFaltantes = processedIngredientsUsed.some((u) => u.uncoveredBaseQty > 0);

          // Escrituras
          ingUpdates.forEach((u) => transaction.update(u.ref, u.updates));
          kardexMovements.forEach((m) => {
            const mRef = doc(dbInstance, `users/${uid}/inventoryMovements`, m.id);
            transaction.set(mRef, sanitizeForFirestore(m));
          });

          const newBatch: Batch = {
            ...data,
            id: batchId,
            userId: uid,
            quantitySold: 0,
            coveredIngredientsCost: Math.round(totalCoveredIngredientsCost * 100) / 100,
            otherDirectCostsAmount: Math.round(otherDirectCostsAmount * 100) / 100,
            totalCost,
            unitCost,
            costStatus: hasFaltantes ? 'provisional' : 'definitivo',
            stockStatus: hasFaltantes ? 'stock_incompleto' : 'completo',
            ingredientsUsed: processedIngredientsUsed,
            isManualCost: false,
            createdAt: new Date().toISOString(),
          };

          const bRef = doc(dbInstance, batchesPath, batchId);
          transaction.set(bRef, sanitizeForFirestore(newBatch));
        });

        return batchId;
      }

      // 2. Tanda con costo manual / histórica
      if (data.totalCost < 0 || !Number.isFinite(data.totalCost)) {
        throw new Error('El costo total no puede ser negativo.');
      }
      const unitCost = Math.round((data.totalCost / data.quantityProduced) * 10000) / 10000;
      const id = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newBatch: Batch = {
        ...data,
        id,
        userId: uid,
        quantitySold: 0,
        unitCost,
        isManualCost: true,
        costStatus: 'definitivo',
        stockStatus: 'completo',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, batchesPath, id), sanitizeForFirestore(newBatch));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, batchesPath);
    }
  };

  const updateBatch = async (id: string, updates: Partial<Batch>): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/batches`;
    try {
      const current = batches.find((b) => b.id === id);
      if (!current) throw new Error('Tanda no encontrada');

      // Rechazo explícito e incondicional de cualquier intento de modificar ingredientsUsed
      if (updates.ingredientsUsed !== undefined) {
        throw new Error('No se permite modificar los ingredientes de una tanda ya creada. Elimine la tanda para reintegrar el inventario y créela nuevamente.');
      }

      // Protección de tandas con ventas
      if (current.quantitySold > 0) {
        if (updates.quantityProduced !== undefined && updates.quantityProduced !== current.quantityProduced) {
          throw new Error('No se puede modificar la cantidad producida de una tanda que ya tiene ventas asociadas.');
        }
      }

      const quantityProduced = updates.quantityProduced ?? current.quantityProduced;
      const totalCost = updates.totalCost ?? current.totalCost;
      const unitCost = Math.round((totalCost / quantityProduced) * 10000) / 10000;

      const cleanUpdates = sanitizeForFirestore({
        ...updates,
        unitCost,
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(dbInstance, path, id), cleanUpdates);
    } catch (err: any) {
      if (
        err?.message === 'Tanda no encontrada' ||
        err?.message === 'No se permite modificar los ingredientes de una tanda ya creada. Elimine la tanda para reintegrar el inventario y créela nuevamente.' ||
        err?.message === 'No se puede modificar la cantidad producida de una tanda que ya tiene ventas asociadas.'
      ) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteBatch = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const uid = user.uid;
    const path = `users/${uid}/batches`;
    try {
      const target = batches.find((b) => b.id === id);
      if (!target) return;

      const hasSales = sales.some((s) => s.batchId === id) || (target.quantitySold > 0);
      if (hasSales) {
        throw new Error('No se puede eliminar esta tanda porque tiene ventas asociadas. Primero elimina o reasigna sus ventas.');
      }

      await runTransaction(dbInstance, async (transaction) => {
        const batchRef = doc(dbInstance, path, id);
        const batchSnap = await transaction.get(batchRef);
        if (!batchSnap.exists()) return;
        const batch = batchSnap.data() as Batch;

        // Revertir insumos consumidos con physicallyCoveredBaseQty > 0
        if (batch.ingredientsUsed && batch.ingredientsUsed.length > 0) {
          const usedWithPhysical = batch.ingredientsUsed.filter((u) => u.physicallyCoveredBaseQty > 0);
          if (usedWithPhysical.length > 0) {
            const ingRefs = usedWithPhysical.map((u) => doc(dbInstance, `users/${uid}/ingredients`, u.ingredientId));
            const ingSnaps = await Promise.all(ingRefs.map((ref) => transaction.get(ref)));

            for (let i = 0; i < usedWithPhysical.length; i++) {
              const u = usedWithPhysical[i];
              const snap = ingSnaps[i];
              if (snap.exists()) {
                const ing = snap.data() as Ingredient;
                const curStock = ing.physicalStock || 0;
                const curCost = ing.averageCost || 0;
                const restoredStock = Math.round((curStock + u.physicallyCoveredBaseQty) * 10000) / 10000;
                const restoredTotalVal = Math.round((restoredStock * curCost) * 100) / 100;

                transaction.update(snap.ref, {
                  physicalStock: restoredStock,
                  totalValue: restoredTotalVal,
                  updatedAt: new Date().toISOString(),
                });

                const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i;
                const movRef = doc(dbInstance, `users/${uid}/inventoryMovements`, movId);
                const revMov: InventoryMovement = {
                  id: movId,
                  userId: uid,
                  ingredientId: ing.id,
                  ingredientName: ing.name,
                  type: 'reversion_tanda',
                  enteredQuantity: u.physicallyCoveredBaseQty,
                  enteredUnit: ing.baseUnit,
                  baseQuantity: u.physicallyCoveredBaseQty,
                  baseUnit: ing.baseUnit,
                  unitCost: u.unitCostAtBatch,
                  totalAmount: -u.coveredCost,
                  referenceId: batch.id,
                  batchRecipeName: batch.name,
                  notes: 'Reversión por anulación de tanda',
                  date: new Date().toISOString().split('T')[0],
                  createdAt: new Date().toISOString(),
                };
                transaction.set(movRef, sanitizeForFirestore(revMov));
              }
            }
          }
        }

        transaction.delete(batchRef);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const regularizeBatchIngredient = async (params: {
    batchId: string;
    ingredientId: string;
    qtyToRegularize: number;
    mode: 'FISICA_Y_VALORATIVA' | 'SOLO_VALORATIVA';
    referenceCost: number;
    sourceType: 'compra' | 'cpp_actual';
    referenceExpenseId?: string;
  }): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const uid = user.uid;
    const batchesPath = `users/${uid}/batches`;

    try {
      const { batchId, ingredientId, qtyToRegularize, mode, referenceCost, sourceType, referenceExpenseId } = params;

      if (qtyToRegularize <= 0 || !Number.isFinite(qtyToRegularize)) {
        throw new Error('La cantidad a regularizar debe ser mayor a cero.');
      }
      if (referenceCost <= 0 || !Number.isFinite(referenceCost)) {
        throw new Error('El costo de referencia debe ser mayor a cero. No se permite valorizar faltantes con costo cero ni ficticio.');
      }

      await runTransaction(dbInstance, async (transaction) => {
        // 1. Lecturas
        const batchRef = doc(dbInstance, batchesPath, batchId);
        const batchSnap = await transaction.get(batchRef);
        if (!batchSnap.exists()) throw new Error('La tanda no existe.');
        const batch = batchSnap.data() as Batch;

        const usageItem = (batch.ingredientsUsed || []).find((u) => u.ingredientId === ingredientId);
        if (!usageItem) throw new Error('El ingrediente no forma parte de esta tanda.');

        if (usageItem.uncoveredBaseQty <= 0) {
          throw new Error('Este ingrediente ya no tiene faltantes pendientes (evitando regularización duplicada).');
        }
        if (qtyToRegularize > usageItem.uncoveredBaseQty) {
          throw new Error(`La cantidad a regularizar (${qtyToRegularize}) excede el faltante pendiente (${usageItem.uncoveredBaseQty}).`);
        }

        const ingRef = doc(dbInstance, `users/${uid}/ingredients`, ingredientId);
        const ingSnap = await transaction.get(ingRef);
        if (!ingSnap.exists()) throw new Error('El ingrediente no existe en el catálogo.');
        const ing = ingSnap.data() as Ingredient;

        let refExpenseDoc: Expense | null = null;
        if (sourceType === 'compra') {
          if (!referenceExpenseId) throw new Error('Debe proporcionar el ID de la compra de referencia.');
          const expRef = doc(dbInstance, `users/${uid}/expenses`, referenceExpenseId);
          const expSnap = await transaction.get(expRef);
          if (!expSnap.exists()) throw new Error('La compra de referencia seleccionada no existe.');
          refExpenseDoc = expSnap.data() as Expense;
          if (refExpenseDoc.status === 'anulado' || refExpenseDoc.isReversed) {
            throw new Error('No se puede utilizar una compra anulada como costo de referencia.');
          }
          if (refExpenseDoc.ingredientId !== ingredientId) {
            throw new Error('La compra de referencia no corresponde a este ingrediente.');
          }
        }

        const availStock = ing.physicalStock || 0;
        if (mode === 'FISICA_Y_VALORATIVA') {
          if (availStock < qtyToRegularize) {
            throw new Error(`Stock físico insuficiente en almacén. Disponible: ${availStock}, requerido: ${qtyToRegularize}.`);
          }
        }

        const additionalCost = Math.round((qtyToRegularize * referenceCost) * 100) / 100;

        // 2. Escrituras
        if (mode === 'FISICA_Y_VALORATIVA') {
          const newStock = Math.max(0, Math.round((availStock - qtyToRegularize) * 10000) / 10000);
          const newTotalVal = Math.round((newStock * (ing.averageCost || 0)) * 100) / 100;
          transaction.update(ingRef, {
            physicalStock: newStock,
            totalValue: newTotalVal,
            updatedAt: new Date().toISOString(),
          });
        }

        const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const movRef = doc(dbInstance, `users/${uid}/inventoryMovements`, movId);
        const regMovement: InventoryMovement = {
          id: movId,
          userId: uid,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'regularizacion_tanda',
          enteredQuantity: qtyToRegularize,
          enteredUnit: ing.baseUnit,
          baseQuantity: mode === 'FISICA_Y_VALORATIVA' ? -qtyToRegularize : 0,
          baseUnit: ing.baseUnit,
          unitCost: referenceCost,
          totalAmount: additionalCost,
          referenceId: batchId,
          batchRecipeName: batch.name,
          sourceType,
          referenceExpenseId: sourceType === 'compra' ? referenceExpenseId : undefined,
          notes: mode === 'FISICA_Y_VALORATIVA'
            ? 'Regularización con deducción física de existencias'
            : 'Regularización valorativa sin deducción de existencias',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        transaction.set(movRef, sanitizeForFirestore(regMovement));

        const updatedIngredientsUsed = (batch.ingredientsUsed || []).map((u) => {
          if (u.ingredientId === ingredientId) {
            const newValued = u.valuedBaseQty + qtyToRegularize;
            const newUncovered = Math.max(0, Math.round((u.requiredBaseQty - newValued) * 10000) / 10000);
            const newPhysicallyCovered = mode === 'FISICA_Y_VALORATIVA'
              ? u.physicallyCoveredBaseQty + qtyToRegularize
              : u.physicallyCoveredBaseQty;
            const newCoveredCost = Math.round((u.coveredCost + additionalCost) * 100) / 100;

            return {
              ...u,
              physicallyCoveredBaseQty: newPhysicallyCovered,
              valuedBaseQty: newValued,
              uncoveredBaseQty: newUncovered,
              coveredCost: newCoveredCost,
              isFullyCovered: newUncovered === 0,
              sourceType,
              referenceExpenseId: sourceType === 'compra' ? referenceExpenseId : u.referenceExpenseId,
              referenceMovementId: sourceType === 'compra' ? refExpenseDoc?.inventoryMovementId : u.referenceMovementId,
            };
          }
          return u;
        });

        const hasRemainingFaltantes = updatedIngredientsUsed.some((u) => u.uncoveredBaseQty > 0);
        const newCoveredIngredientsCost = Math.round(((batch.coveredIngredientsCost || 0) + additionalCost) * 100) / 100;
        const otherDirectCostsAmount = batch.otherDirectCostsAmount || 0;
        const newTotalCost = Math.round((newCoveredIngredientsCost + otherDirectCostsAmount) * 100) / 100;
        const newUnitCost = batch.quantityProduced > 0 ? Math.round((newTotalCost / batch.quantityProduced) * 10000) / 10000 : 0;

        transaction.update(batchRef, {
          ingredientsUsed: updatedIngredientsUsed,
          coveredIngredientsCost: newCoveredIngredientsCost,
          totalCost: newTotalCost,
          unitCost: newUnitCost,
          costStatus: hasRemainingFaltantes ? 'provisional' : 'definitivo',
          stockStatus: hasRemainingFaltantes ? 'stock_incompleto' : 'completo',
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, batchesPath);
    }
  };

  // CRUD SALES
  const addSale = async (
    data: Omit<Sale, 'id' | 'userId' | 'totalUnits' | 'totalAmount' | 'createdAt'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const salesPath = `users/${user.uid}/sales`;
    const batchesPath = `users/${user.uid}/batches`;

    try {
      const batch = batches.find((b) => b.id === data.batchId);
      if (!batch) throw new Error('La tanda seleccionada no existe.');

      // Convert pack sales into unit count
      const totalUnits = data.modality === 'pack' ? data.quantity * data.unitsPerPack : data.quantity;
      const availableUnits = batch.quantityProduced - batch.quantitySold;

      if (totalUnits > availableUnits) {
        throw new Error(
          `No se pueden vender ${totalUnits} unidades. Solo hay ${availableUnits} unidades disponibles en la tanda.`
        );
      }

      const totalAmount = Math.round(data.quantity * data.salePrice * 100) / 100;
      let amountPaid = 0;
      if (data.paymentStatus === 'pagada') {
        amountPaid = totalAmount;
      } else if (data.paymentStatus === 'parcial') {
        amountPaid = Math.min(totalAmount, Math.max(0, data.amountPaid || 0));
      } else {
        amountPaid = 0;
      }

      const saleId = 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let linkedReceivableId: string | undefined = undefined;

      // Auto-generación de cuenta por cobrar si está pendiente o parcial
      if (data.paymentStatus === 'pendiente' || data.paymentStatus === 'parcial') {
        const remainingToCollect = Math.round((totalAmount - amountPaid) * 100) / 100;
        if (remainingToCollect > 0) {
          const recId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          linkedReceivableId = recId;
          const newReceivable: Receivable = {
            id: recId,
            userId: user.uid,
            customerName: data.customerName?.trim() || 'Cliente sin nombre',
            concept: `Venta de ${batch.name} (${data.modality === 'pack' ? `${data.quantity} paquetes` : `${data.quantity} galletas`})`,
            totalAmount: remainingToCollect,
            date: data.date,
            installments: [],
            totalPaid: 0,
            pendingBalance: remainingToCollect,
            status: 'pendiente',
            linkedSaleId: saleId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(dbInstance, `users/${user.uid}/receivables`, recId), sanitizeForFirestore(newReceivable));
        }
      }

      const newSale: Sale = {
        ...data,
        id: saleId,
        userId: user.uid,
        batchName: batch.name,
        totalUnits,
        totalAmount,
        amountPaid,
        linkedReceivableId,
        createdAt: new Date().toISOString(),
      };

      // 1. Save sale
      await setDoc(doc(dbInstance, salesPath, saleId), sanitizeForFirestore(newSale));

      // 2. Update batch quantity sold
      const newQuantitySold = batch.quantitySold + totalUnits;
      await updateDoc(doc(dbInstance, batchesPath, batch.id), {
        quantitySold: newQuantitySold,
      });

      return saleId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, salesPath);
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const salesPath = `users/${user.uid}/sales`;
    const batchesPath = `users/${user.uid}/batches`;

    try {
      const currentSale = sales.find((s) => s.id === id);
      if (!currentSale) throw new Error('Venta no encontrada');

      const batch = batches.find((b) => b.id === currentSale.batchId);
      if (!batch) throw new Error('Tanda no encontrada');

      let newTotalUnits = currentSale.totalUnits;
      if (updates.quantity !== undefined || updates.unitsPerPack !== undefined || updates.modality !== undefined) {
        const modality = updates.modality ?? currentSale.modality;
        const qty = updates.quantity ?? currentSale.quantity;
        const upp = updates.unitsPerPack ?? currentSale.unitsPerPack;
        newTotalUnits = modality === 'pack' ? qty * upp : qty;

        const unitDifference = newTotalUnits - currentSale.totalUnits;
        const availableUnits = batch.quantityProduced - batch.quantitySold;
        if (unitDifference > availableUnits) {
          throw new Error(`No hay suficientes galletas disponibles (faltan ${unitDifference - availableUnits}).`);
        }

        // Adjust batch
        await updateDoc(doc(dbInstance, batchesPath, batch.id), {
          quantitySold: batch.quantitySold + unitDifference,
        });
      }

      const cleanUpdates = sanitizeForFirestore({
        ...updates,
        totalUnits: newTotalUnits,
      });

      await updateDoc(doc(dbInstance, salesPath, id), cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, salesPath);
    }
  };

  const deleteSale = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const salesPath = `users/${user.uid}/sales`;
    const batchesPath = `users/${user.uid}/batches`;

    try {
      const sale = sales.find((s) => s.id === id);
      if (!sale) return;

      // 1. Restore batch units
      const batch = batches.find((b) => b.id === sale.batchId);
      if (batch) {
        const newSold = Math.max(0, batch.quantitySold - sale.totalUnits);
        await updateDoc(doc(dbInstance, batchesPath, batch.id), {
          quantitySold: newSold,
        });
      }

      // 2. Remove linked receivable if exists
      if (sale.linkedReceivableId) {
        await deleteDoc(doc(dbInstance, `users/${user.uid}/receivables`, sale.linkedReceivableId));
      }

      // 3. Delete sale doc
      await deleteDoc(doc(dbInstance, salesPath, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, salesPath);
    }
  };

  // CRUD RECEIVABLES
  const addReceivable = async (
    data: Omit<Receivable, 'id' | 'userId' | 'totalPaid' | 'pendingBalance' | 'status' | 'createdAt' | 'installments'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/receivables`;
    try {
      const id = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newRec: Receivable = {
        ...data,
        id,
        userId: user.uid,
        installments: [],
        totalPaid: 0,
        pendingBalance: data.totalAmount,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, path, id), sanitizeForFirestore(newRec));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const addReceivableInstallment = async (
    receivableId: string,
    inst: Omit<PaymentInstallment, 'id'>
  ): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/receivables`;
    try {
      const rec = receivables.find((r) => r.id === receivableId);
      if (!rec) throw new Error('Cuenta por cobrar no encontrada');

      if (inst.amount <= 0) throw new Error('El abono debe ser mayor a 0');
      if (inst.amount > rec.pendingBalance + 0.001) {
        throw new Error(`El abono (${inst.amount}) supera el saldo pendiente (${rec.pendingBalance})`);
      }

      const installmentItem: PaymentInstallment = {
        ...inst,
        id: 'inst_' + Date.now(),
      };

      const cleanInstallmentItem = sanitizeForFirestore(installmentItem);
      const updatedInstallments = [...(rec.installments || []), cleanInstallmentItem];
      const newTotalPaid = Math.round((rec.totalPaid + inst.amount) * 100) / 100;
      const newPendingBalance = Math.max(0, Math.round((rec.totalAmount - newTotalPaid) * 100) / 100);
      const newStatus = newPendingBalance <= 0.001 ? 'pagada' : 'parcial';

      const cleanPayload = sanitizeForFirestore({
        installments: updatedInstallments,
        totalPaid: newTotalPaid,
        pendingBalance: newPendingBalance,
        status: newStatus,
      });

      await updateDoc(doc(dbInstance, path, receivableId), cleanPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteReceivable = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/receivables`;
    try {
      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // CRUD PAYABLES
  const addPayable = async (
    data: Omit<Payable, 'id' | 'userId' | 'totalPaid' | 'pendingBalance' | 'status' | 'createdAt' | 'installments'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/payables`;
    try {
      const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newPayable: Payable = {
        ...data,
        id,
        userId: user.uid,
        installments: [],
        totalPaid: 0,
        pendingBalance: data.totalAmount,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, path, id), sanitizeForFirestore(newPayable));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const addPayableInstallment = async (
    payableId: string,
    inst: Omit<PaymentInstallment, 'id'>
  ): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/payables`;
    try {
      const pay = payables.find((p) => p.id === payableId);
      if (!pay) throw new Error('Cuenta por pagar no encontrada');

      if (inst.amount <= 0) throw new Error('El pago debe ser mayor a 0');
      if (inst.amount > pay.pendingBalance + 0.001) {
        throw new Error(`El pago (${inst.amount}) supera el saldo pendiente (${pay.pendingBalance})`);
      }

      const installmentItem: PaymentInstallment = {
        ...inst,
        id: 'inst_p_' + Date.now(),
      };

      const cleanInstallmentItem = sanitizeForFirestore(installmentItem);
      const updatedInstallments = [...(pay.installments || []), cleanInstallmentItem];
      const newTotalPaid = Math.round((pay.totalPaid + inst.amount) * 100) / 100;
      const newPendingBalance = Math.max(0, Math.round((pay.totalAmount - newTotalPaid) * 100) / 100);
      const newStatus = newPendingBalance <= 0.001 ? 'pagada' : 'parcial';

      const cleanPayload = sanitizeForFirestore({
        installments: updatedInstallments,
        totalPaid: newTotalPaid,
        pendingBalance: newPendingBalance,
        status: newStatus,
      });

      await updateDoc(doc(dbInstance, path, payableId), cleanPayload);

      // If linked to an expense, and fully paid, mark expense status as 'pagado'
      if (pay.linkedExpenseId && newStatus === 'pagada') {
        await updateDoc(doc(dbInstance, `users/${user.uid}/expenses`, pay.linkedExpenseId), {
          status: 'pagado',
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deletePayable = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/payables`;
    try {
      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // BACKUP & RESTORE
  const exportBackup = (): AppBackup => {
    return {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      userId: user?.uid || 'anonymous',
      appName: 'Mi Negocio de Galletas',
      data: {
        expenses,
        batches,
        sales,
        receivables,
        payables,
        ingredients,
        inventoryMovements,
      },
    };
  };

  const importBackup = async (
    backup: AppBackup
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!user || !dbInstance) {
      return { success: false, count: 0, error: 'Usuario no autenticado' };
    }

    try {
      // 1. Validación de estructura general del respaldo
      if (!backup || typeof backup !== 'object') {
        return { success: false, count: 0, error: 'Archivo de respaldo inválido: formato no reconocido.' };
      }
      if (!backup.data || typeof backup.data !== 'object') {
        return { success: false, count: 0, error: 'El archivo de respaldo no contiene la sección de datos requerida.' };
      }

      const {
        expenses: impExpenses = [],
        batches: impBatches = [],
        sales: impSales = [],
        receivables: impReceivables = [],
        payables: impPayables = [],
        ingredients: impIngredients = [],
        inventoryMovements: impInventoryMovements = [],
      } = backup.data;

      const collectionsToCheck = [
        { name: 'ingredientes', key: 'ingredients', items: impIngredients },
        { name: 'movimientos de inventario', key: 'inventoryMovements', items: impInventoryMovements },
        { name: 'tandas', key: 'batches', items: impBatches },
        { name: 'gastos', key: 'expenses', items: impExpenses },
        { name: 'ventas', key: 'sales', items: impSales },
        { name: 'cuentas por cobrar', key: 'receivables', items: impReceivables },
        { name: 'cuentas por pagar', key: 'payables', items: impPayables },
      ];

      for (const col of collectionsToCheck) {
        if (!Array.isArray(col.items)) {
          return {
            success: false,
            count: 0,
            error: `La colección de ${col.name} en el respaldo no tiene un formato de lista válido.`,
          };
        }
      }

      // 2. Validación de IDs válidos y únicos por colección
      for (const col of collectionsToCheck) {
        const seenIds = new Set<string>();
        for (let idx = 0; idx < col.items.length; idx++) {
          const item = col.items[idx];
          if (!item || typeof item !== 'object') {
            return {
              success: false,
              count: 0,
              error: `Se encontró un registro inválido en la colección de ${col.name} (posición ${idx}).`,
            };
          }
          const id = (item as any).id;
          if (typeof id !== 'string' || id.trim().length === 0) {
            return {
              success: false,
              count: 0,
              error: `El respaldo contiene un registro sin identificador (ID) válido en la colección de ${col.name}.`,
            };
          }
          const cleanId = id.trim();
          if (seenIds.has(cleanId)) {
            return {
              success: false,
              count: 0,
              error: `Se encontró un ID duplicado ("${cleanId}") en la colección de ${col.name}.`,
            };
          }
          seenIds.add(cleanId);
        }
      }

      // Sets de identificación para validar integridad referencial
      const ingredientIdSet = new Set(impIngredients.map((i) => i.id));
      const movementIdSet = new Set(impInventoryMovements.map((m) => m.id));
      const batchIdSet = new Set(impBatches.map((b) => b.id));
      const expenseIdSet = new Set(impExpenses.map((e) => e.id));
      const saleIdSet = new Set(impSales.map((s) => s.id));
      const receivableIdSet = new Set(impReceivables.map((r) => r.id));
      const payableIdSet = new Set(impPayables.map((p) => p.id));

      // 3. Validación referencial: Movimientos de inventario -> Ingrediente existente
      for (const mov of impInventoryMovements) {
        if (!mov.ingredientId || !ingredientIdSet.has(mov.ingredientId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: El movimiento de inventario "${mov.id}" referencia un ingrediente inexistente ("${mov.ingredientId}").`,
          };
        }
      }

      // 4. Validación referencial: Gastos -> Movimiento, Ingrediente, Cuenta por pagar
      for (const exp of impExpenses) {
        if (exp.ingredientId && impIngredients.length > 0 && !ingredientIdSet.has(exp.ingredientId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: El gasto "${exp.id}" referencia un ingrediente inexistente ("${exp.ingredientId}").`,
          };
        }
        if (exp.inventoryMovementId && impInventoryMovements.length > 0 && !movementIdSet.has(exp.inventoryMovementId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: El gasto "${exp.id}" referencia un movimiento de inventario inexistente ("${exp.inventoryMovementId}").`,
          };
        }
        if (exp.linkedPayableId && impPayables.length > 0 && !payableIdSet.has(exp.linkedPayableId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: El gasto "${exp.id}" referencia una cuenta por pagar inexistente ("${exp.linkedPayableId}").`,
          };
        }
      }

      // 5. Validación referencial: Tandas -> Ingredientes usados y referencias de costo
      for (const batch of impBatches) {
        if (batch.ingredientsUsed && Array.isArray(batch.ingredientsUsed)) {
          for (const usage of batch.ingredientsUsed) {
            if (usage.ingredientId && impIngredients.length > 0 && !ingredientIdSet.has(usage.ingredientId)) {
              return {
                success: false,
                count: 0,
                error: `Error de integridad referencial: La tanda "${batch.id}" referencia un ingrediente inexistente ("${usage.ingredientId}").`,
              };
            }
            if (usage.referenceExpenseId && impExpenses.length > 0 && !expenseIdSet.has(usage.referenceExpenseId)) {
              return {
                success: false,
                count: 0,
                error: `Error de integridad referencial: La tanda "${batch.id}" referencia un gasto inexistente ("${usage.referenceExpenseId}").`,
              };
            }
            if (usage.referenceMovementId && impInventoryMovements.length > 0 && !movementIdSet.has(usage.referenceMovementId)) {
              return {
                success: false,
                count: 0,
                error: `Error de integridad referencial: La tanda "${batch.id}" referencia un movimiento inexistente ("${usage.referenceMovementId}").`,
              };
            }
          }
        }
      }

      // 6. Validación referencial: Ventas -> Tandas y Cuentas por cobrar
      for (const sale of impSales) {
        if (sale.batchId && impBatches.length > 0 && !batchIdSet.has(sale.batchId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: La venta "${sale.id}" referencia una tanda inexistente ("${sale.batchId}").`,
          };
        }
        const targetRecId = sale.linkedReceivableId || (sale as any).receivableId;
        if (targetRecId && impReceivables.length > 0 && !receivableIdSet.has(targetRecId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: La venta "${sale.id}" referencia una cuenta por cobrar inexistente ("${targetRecId}").`,
          };
        }
      }

      // 7. Validación referencial: Cuentas por cobrar -> Ventas
      for (const rec of impReceivables) {
        const targetSaleId = rec.linkedSaleId || (rec as any).saleId;
        if (targetSaleId && impSales.length > 0 && !saleIdSet.has(targetSaleId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: La cuenta por cobrar "${rec.id}" referencia una venta inexistente ("${targetSaleId}").`,
          };
        }
      }

      // 8. Validación referencial: Cuentas por pagar -> Gastos
      for (const pay of impPayables) {
        const targetExpId = pay.linkedExpenseId || (pay as any).expenseId;
        if (targetExpId && impExpenses.length > 0 && !expenseIdSet.has(targetExpId)) {
          return {
            success: false,
            count: 0,
            error: `Error de integridad referencial: La cuenta por pagar "${pay.id}" referencia un gasto inexistente ("${targetExpId}").`,
          };
        }
      }

      // Preparar operaciones ordenadas para writeBatch
      interface BatchOp {
        ref: ReturnType<typeof doc>;
        data: any;
      }
      const operations: BatchOp[] = [];

      // A. Ingredientes
      for (const item of impIngredients) {
        let physicalStock = 0;
        let averageCost = 0;
        let totalValue = 0;

        // Caso 1: Backup unificado v3.0.0 (ya contiene physicalStock)
        if (typeof item.physicalStock === 'number') {
          if (!Number.isFinite(item.physicalStock) || item.physicalStock < 0) {
            return {
              success: false,
              count: 0,
              error: `Error en el respaldo: El ingrediente "${item.name || item.id}" tiene un stock físico inválido o negativo (${item.physicalStock}).`,
            };
          }
          const rawAvgCost = typeof item.averageCost === 'number' ? item.averageCost : 0;
          if (!Number.isFinite(rawAvgCost) || rawAvgCost < 0) {
            return {
              success: false,
              count: 0,
              error: `Error en el respaldo: El ingrediente "${item.name || item.id}" tiene un costo promedio inválido o negativo (${item.averageCost}).`,
            };
          }
          const rawTotalVal = typeof item.totalValue === 'number' ? item.totalValue : (item.physicalStock * rawAvgCost);
          if (!Number.isFinite(rawTotalVal) || rawTotalVal < 0) {
            return {
              success: false,
              count: 0,
              error: `Error en el respaldo: El ingrediente "${item.name || item.id}" tiene una valoración total inválida o negativa (${item.totalValue}).`,
            };
          }

          physicalStock = Math.round(item.physicalStock * 10000) / 10000;
          if (physicalStock === 0) {
            averageCost = 0;
            totalValue = 0;
          } else {
            averageCost = Math.round(rawAvgCost * 1000000) / 1000000;
            totalValue = Math.round(rawTotalVal * 100) / 100;
          }
        } else {
          // Caso 2: Backup legado v2.0.0 o anterior (stockUSD, stockVES, averageCostUSD, averageCostVES)
          const rawStockUSD = (item as any).stockUSD ?? 0;
          const rawStockVES = (item as any).stockVES ?? 0;
          const rawCostUSD = (item as any).averageCostUSD ?? 0;
          const rawCostVES = (item as any).averageCostVES ?? 0;

          if (
            typeof rawStockUSD !== 'number' || !Number.isFinite(rawStockUSD) || rawStockUSD < 0 ||
            typeof rawStockVES !== 'number' || !Number.isFinite(rawStockVES) || rawStockVES < 0 ||
            typeof rawCostUSD !== 'number' || !Number.isFinite(rawCostUSD) || rawCostUSD < 0 ||
            typeof rawCostVES !== 'number' || !Number.isFinite(rawCostVES) || rawCostVES < 0
          ) {
            return {
              success: false,
              count: 0,
              error: `Error en el respaldo: El ingrediente "${item.name || item.id}" contiene cantidades o costos de stock inválidos, negativos o no numéricos.`,
            };
          }

          const combinedStock = Math.round((rawStockUSD + rawStockVES) * 10000) / 10000;
          if (combinedStock > 0) {
            const calculatedTotalValue = (rawStockUSD * rawCostUSD) + (rawStockVES * rawCostVES);
            const calculatedAvgCost = calculatedTotalValue / combinedStock;

            physicalStock = combinedStock;
            averageCost = Math.round(calculatedAvgCost * 1000000) / 1000000;
            totalValue = Math.round(calculatedTotalValue * 100) / 100;
          } else {
            physicalStock = 0;
            averageCost = 0;
            totalValue = 0;
          }
        }

        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/ingredients`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
            physicalStock,
            averageCost,
            totalValue,
          }),
        });
      }

      // B. Movimientos de inventario
      for (const item of impInventoryMovements) {
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/inventoryMovements`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
          }),
        });
      }

      // C. Tandas (marcando tandas históricas sin ingredientes como isManualCost)
      for (const item of impBatches) {
        const isHistorical = !item.ingredientsUsed || item.ingredientsUsed.length === 0;
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/batches`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
            isManualCost: isHistorical ? true : Boolean(item.isManualCost),
            ingredientsUsed: item.ingredientsUsed || [],
          }),
        });
      }

      // D. Gastos
      for (const item of impExpenses) {
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/expenses`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
          }),
        });
      }

      // E. Ventas
      for (const item of impSales) {
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/sales`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
          }),
        });
      }

      // F. Cuentas por cobrar
      for (const item of impReceivables) {
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/receivables`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
          }),
        });
      }

      // G. Cuentas por pagar
      for (const item of impPayables) {
        operations.push({
          ref: doc(dbInstance, `users/${user.uid}/payables`, item.id),
          data: sanitizeForFirestore({
            ...item,
            id: item.id,
            userId: user.uid,
          }),
        });
      }

      const totalDocs = operations.length;
      if (totalDocs === 0) {
        return { success: true, count: 0 };
      }

      // Escritura en bloques de máximo 400 documentos por batch
      const CHUNK_SIZE = 400;
      const totalChunks = Math.ceil(totalDocs / CHUNK_SIZE);
      let committedCount = 0;

      for (let i = 0; i < totalDocs; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(dbInstance);

        for (const op of chunk) {
          batch.set(op.ref, op.data);
        }

        try {
          await batch.commit();
          committedCount += chunk.length;
        } catch (err: any) {
          const errMsg = err?.message || 'Error desconocido al confirmar bloque';
          return {
            success: false,
            count: committedCount,
            error: `Error en la importación en el bloque ${chunkIndex} de ${totalChunks} (${chunk.length} documentos). Los bloques previos (${committedCount} de ${totalDocs} documentos) pudieron haberse guardado en la base de datos. Detalle: ${errMsg}`,
          };
        }
      }

      return { success: true, count: committedCount };
    } catch (e: any) {
      console.error('Failed importing backup', e);
      return { success: false, count: 0, error: e.message || 'Error importando datos' };
    }
  };

  const value = {
    expenses,
    batches,
    sales,
    receivables,
    payables,
    ingredients,
    inventoryMovements,
    loadingData,
    financialSummary,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addExpense,
    updateExpense,
    deleteExpense,
    reverseExpense,
    addBatch,
    updateBatch,
    deleteBatch,
    regularizeBatchIngredient,
    addSale,
    updateSale,
    deleteSale,
    addReceivable,
    addReceivableInstallment,
    deleteReceivable,
    addPayable,
    addPayableInstallment,
    deletePayable,
    exportBackup,
    importBackup,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
