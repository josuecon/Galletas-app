import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { useAuth } from './AuthContext.tsx';
import {
  Expense,
  Batch,
  Sale,
  Receivable,
  Payable,
  Currency,
  CurrencySummary,
  AppBackup,
  PaymentInstallment,
} from '../types/index.ts';
import { handleFirestoreError, OperationType } from '../services/firebase.ts';

interface DataContextType {
  expenses: Expense[];
  batches: Batch[];
  sales: Sale[];
  receivables: Receivable[];
  payables: Payable[];
  loadingData: boolean;
  activeCurrency: Currency | 'ALL';
  setActiveCurrency: (cur: Currency | 'ALL') => void;
  // Calculations
  usdSummary: CurrencySummary;
  vesSummary: CurrencySummary;
  // CRUD Actions
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addBatch: (batch: Omit<Batch, 'id' | 'userId' | 'quantitySold' | 'unitCost' | 'createdAt'>) => Promise<string>;
  updateBatch: (id: string, updates: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'userId' | 'totalUnits' | 'totalAmount' | 'createdAt'>) => Promise<string>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
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
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [activeCurrency, setActiveCurrency] = useState<Currency | 'ALL'>('ALL');

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!user || !dbInstance) {
      setExpenses([]);
      setBatches([]);
      setSales([]);
      setReceivables([]);
      setPayables([]);
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

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 5) {
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

    return () => {
      unsubExpenses();
      unsubBatches();
      unsubSales();
      unsubReceivables();
      unsubPayables();
    };
  }, [user, dbInstance]);

  // Financial calculations helper for a specific currency
  const calculateCurrencySummary = (cur: Currency): CurrencySummary => {
    // 1. Total Inversiones (insumos de producción: harina, azúcar, etc.)
    const curExpenses = expenses.filter((e) => e.currency === cur);
    const totalInvestments = curExpenses
      .filter((e) => e.type === 'insumo')
      .reduce((sum, e) => sum + e.amount, 0);

    // 2. Total Gastos Operativos (transporte, servicios, empaques, etc.)
    const totalOperatingExpenses = curExpenses
      .filter((e) => e.type === 'operativo')
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Total Ventas registradas
    const curSales = sales.filter((s) => s.currency === cur);
    const totalSales = curSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // 4. Dinero Efectivamente Cobrado:
    // Dinero cobrado de contado en ventas + todos los abonos registrados en cuentas por cobrar
    const upfrontCollected = curSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const curReceivables = receivables.filter((r) => r.currency === cur);
    // Para evitar duplicar el abono inicial si ya está en upfrontCollected,
    // si una cuenta por cobrar está vinculada a una venta, sus installments representan pagos posteriores
    const installmentsCollected = curReceivables.reduce((sum, r) => {
      return sum + (r.installments || []).reduce((iSum, inst) => iSum + inst.amount, 0);
    }, 0);
    const totalCollected = upfrontCollected + installmentsCollected;

    // 5. Dinero Pendiente de Cobrar
    const totalPendingReceivable = curReceivables.reduce(
      (sum, r) => sum + Math.max(0, r.pendingBalance),
      0
    );

    // 6. Dinero Pendiente de Pagar
    const curPayables = payables.filter((p) => p.currency === cur);
    const totalPendingPayable = curPayables.reduce(
      (sum, p) => sum + Math.max(0, p.pendingBalance),
      0
    );

    // 7. Costo de producción vendido:
    // Por cada venta de esta moneda: unidades vendidas * costo unitario de su tanda
    const batchesMap = new Map<string, Batch>();
    batches.forEach((b) => batchesMap.set(b.id, b));

    const productionCostSold = curSales.reduce((sum, sale) => {
      const batch = batchesMap.get(sale.batchId);
      const unitCost = batch ? batch.unitCost : 0;
      return sum + sale.totalUnits * unitCost;
    }, 0);

    // 8. Ganancia Bruta = Total Ventas - Costo de producción vendido
    const grossProfit = totalSales - productionCostSold;

    // 9. Ganancia Neta = Ganancia Bruta - Gastos Operativos
    const netProfit = grossProfit - totalOperatingExpenses;

    return {
      currency: cur,
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
  };

  const usdSummary = useMemo(() => calculateCurrencySummary('USD'), [expenses, sales, receivables, payables, batches]);
  const vesSummary = useMemo(() => calculateCurrencySummary('VES'), [expenses, sales, receivables, payables, batches]);

  // CRUD EXPENSES
  const addExpense = async (data: Omit<Expense, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/expenses`;
    try {
      const id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let linkedPayableId: string | undefined = undefined;

      // Si el gasto queda en estado "pendiente", creamos automáticamente la cuenta por pagar
      if (data.status === 'pendiente') {
        const payableId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        linkedPayableId = payableId;
        const newPayable: Payable = {
          id: payableId,
          userId: user.uid,
          supplierName: data.description,
          concept: `Gasto pendiente: ${data.category}`,
          totalAmount: data.amount,
          currency: data.currency,
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
        await setDoc(doc(dbInstance, `users/${user.uid}/payables`, payableId), newPayable);
      }

      const newExpense: Expense = {
        ...data,
        id,
        userId: user.uid,
        linkedPayableId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, path, id), newExpense);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/expenses`;
    try {
      await updateDoc(doc(dbInstance, path, id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/expenses`;
    try {
      const target = expenses.find((e) => e.id === id);
      if (target?.linkedPayableId) {
        // Remove linked payable as well
        await deleteDoc(doc(dbInstance, `users/${user.uid}/payables`, target.linkedPayableId));
      }
      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // CRUD BATCHES
  const addBatch = async (
    data: Omit<Batch, 'id' | 'userId' | 'quantitySold' | 'unitCost' | 'createdAt'>
  ): Promise<string> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/batches`;
    try {
      if (data.quantityProduced <= 0) {
        throw new Error('La cantidad producida debe ser mayor a cero.');
      }
      if (data.totalCost < 0) {
        throw new Error('El costo total no puede ser negativo.');
      }

      const unitCost = Math.round((data.totalCost / data.quantityProduced) * 10000) / 10000;
      const id = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newBatch: Batch = {
        ...data,
        id,
        userId: user.uid,
        quantitySold: 0,
        unitCost,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(dbInstance, path, id), newBatch);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateBatch = async (id: string, updates: Partial<Batch>): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/batches`;
    try {
      const current = batches.find((b) => b.id === id);
      if (!current) throw new Error('Tanda no encontrada');

      const quantityProduced = updates.quantityProduced ?? current.quantityProduced;
      const totalCost = updates.totalCost ?? current.totalCost;
      const unitCost = Math.round((totalCost / quantityProduced) * 10000) / 10000;

      await updateDoc(doc(dbInstance, path, id), {
        ...updates,
        unitCost,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteBatch = async (id: string): Promise<void> => {
    if (!user || !dbInstance) throw new Error('No autenticado');
    const path = `users/${user.uid}/batches`;
    try {
      const hasSales = sales.some((s) => s.batchId === id);
      if (hasSales) {
        throw new Error('No se puede eliminar esta tanda porque tiene ventas asociadas. Primero elimina o reasigna sus ventas.');
      }
      await deleteDoc(doc(dbInstance, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
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

      if (batch.currency !== data.currency) {
        throw new Error(`La moneda de la venta (${data.currency}) debe coincidir con la de la tanda (${batch.currency}).`);
      }

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
            currency: data.currency,
            date: data.date,
            installments: [],
            totalPaid: 0,
            pendingBalance: remainingToCollect,
            status: 'pendiente',
            linkedSaleId: saleId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(dbInstance, `users/${user.uid}/receivables`, recId), newReceivable);
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
      await setDoc(doc(dbInstance, salesPath, saleId), newSale);

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

      await updateDoc(doc(dbInstance, salesPath, id), {
        ...updates,
        totalUnits: newTotalUnits,
      });
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
      await setDoc(doc(dbInstance, path, id), newRec);
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

      const updatedInstallments = [...(rec.installments || []), installmentItem];
      const newTotalPaid = Math.round((rec.totalPaid + inst.amount) * 100) / 100;
      const newPendingBalance = Math.max(0, Math.round((rec.totalAmount - newTotalPaid) * 100) / 100);
      const newStatus = newPendingBalance <= 0.001 ? 'pagada' : 'parcial';

      await updateDoc(doc(dbInstance, path, receivableId), {
        installments: updatedInstallments,
        totalPaid: newTotalPaid,
        pendingBalance: newPendingBalance,
        status: newStatus,
      });
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
      await setDoc(doc(dbInstance, path, id), newPayable);
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

      const updatedInstallments = [...(pay.installments || []), installmentItem];
      const newTotalPaid = Math.round((pay.totalPaid + inst.amount) * 100) / 100;
      const newPendingBalance = Math.max(0, Math.round((pay.totalAmount - newTotalPaid) * 100) / 100);
      const newStatus = newPendingBalance <= 0.001 ? 'pagada' : 'parcial';

      await updateDoc(doc(dbInstance, path, payableId), {
        installments: updatedInstallments,
        totalPaid: newTotalPaid,
        pendingBalance: newPendingBalance,
        status: newStatus,
      });

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
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userId: user?.uid || 'anonymous',
      appName: 'Mi Negocio de Galletas',
      data: {
        expenses,
        batches,
        sales,
        receivables,
        payables,
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
      if (!backup || !backup.data) {
        return { success: false, count: 0, error: 'Archivo de respaldo inválido.' };
      }

      const {
        expenses: impExpenses = [],
        batches: impBatches = [],
        sales: impSales = [],
        receivables: impReceivables = [],
        payables: impPayables = [],
      } = backup.data;

      let importedCount = 0;

      // Import batches first so sales can refer to them
      for (const item of impBatches) {
        const id = item.id || 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(dbInstance, `users/${user.uid}/batches`, id), {
          ...item,
          id,
          userId: user.uid,
        });
        importedCount++;
      }

      // Import expenses
      for (const item of impExpenses) {
        const id = item.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(dbInstance, `users/${user.uid}/expenses`, id), {
          ...item,
          id,
          userId: user.uid,
        });
        importedCount++;
      }

      // Import sales
      for (const item of impSales) {
        const id = item.id || 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(dbInstance, `users/${user.uid}/sales`, id), {
          ...item,
          id,
          userId: user.uid,
        });
        importedCount++;
      }

      // Import receivables
      for (const item of impReceivables) {
        const id = item.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(dbInstance, `users/${user.uid}/receivables`, id), {
          ...item,
          id,
          userId: user.uid,
        });
        importedCount++;
      }

      // Import payables
      for (const item of impPayables) {
        const id = item.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await setDoc(doc(dbInstance, `users/${user.uid}/payables`, id), {
          ...item,
          id,
          userId: user.uid,
        });
        importedCount++;
      }

      return { success: true, count: importedCount };
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
    loadingData,
    activeCurrency,
    setActiveCurrency,
    usdSummary,
    vesSummary,
    addExpense,
    updateExpense,
    deleteExpense,
    addBatch,
    updateBatch,
    deleteBatch,
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
