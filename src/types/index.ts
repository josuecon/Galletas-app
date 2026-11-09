export type Currency = 'USD' | 'VES';

export type ExpenseCategory =
  | 'Harina'
  | 'Azúcar'
  | 'Mantequilla'
  | 'Chocolate'
  | 'Ingredientes'
  | 'Empaques'
  | 'Utensilios'
  | 'Transporte'
  | 'Servicios'
  | 'Otros';

export type ExpenseType = 'insumo' | 'operativo';
export type ExpenseStatus = 'pagado' | 'pendiente';

export interface Expense {
  id: string;
  userId: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType; // 'insumo' no descuenta de ganancia si entra al costo de tanda; 'operativo' sí descuenta
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  status: ExpenseStatus;
  observation?: string;
  linkedPayableId?: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  userId: string;
  name: string; // Ej: "Galletas Chispas de Chocolate"
  date: string; // YYYY-MM-DD
  quantityProduced: number; // Unidades producidas
  quantitySold: number; // Unidades vendidas
  totalCost: number; // Costo total de producción introducido manualmente
  unitCost: number; // totalCost / quantityProduced
  currency: Currency;
  observations?: string;
  createdAt: string;
}

export type SaleModality = 'unit' | 'pack';
export type PaymentStatus = 'pagada' | 'pendiente' | 'parcial';

export interface Sale {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  batchId: string;
  batchName: string;
  modality: SaleModality;
  quantity: number; // Cantidad de unidades o paquetes
  unitsPerPack: number; // 1 si es por unidad, >1 si es paquete
  totalUnits: number; // Cantidad total de galletas deducidas
  salePrice: number; // Precio unitario o precio por paquete
  currency: Currency;
  totalAmount: number; // Total venta calculado
  paymentStatus: PaymentStatus;
  amountPaid: number; // Dinero efectivamente recibido en la venta
  customerName?: string;
  linkedReceivableId?: string;
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export type DebtStatus = 'pendiente' | 'parcial' | 'pagada';

export interface Receivable {
  id: string;
  userId: string;
  customerName: string;
  concept: string;
  totalAmount: number;
  currency: Currency;
  date: string;
  dueDate?: string;
  installments: PaymentInstallment[];
  totalPaid: number; // Suma de abonos
  pendingBalance: number; // totalAmount - totalPaid
  status: DebtStatus;
  linkedSaleId?: string;
  createdAt: string;
}

export interface Payable {
  id: string;
  userId: string;
  supplierName: string;
  concept: string;
  totalAmount: number;
  currency: Currency;
  date: string;
  dueDate?: string;
  installments: PaymentInstallment[];
  totalPaid: number;
  pendingBalance: number;
  status: DebtStatus;
  expenseCategory?: ExpenseCategory;
  expenseType?: ExpenseType;
  linkedExpenseId?: string;
  createdAt: string;
}

export interface CurrencySummary {
  currency: Currency;
  totalInvestments: number; // Compras e insumos registrados
  totalOperatingExpenses: number; // Gastos operativos
  totalSales: number; // Ventas brutas totales
  totalCollected: number; // Dinero efectivamente cobrado (ventas al contado + abonos cobrados)
  totalPendingReceivable: number; // Dinero pendiente por cobrar
  totalPendingPayable: number; // Dinero pendiente por pagar
  productionCostSold: number; // Costo de tandas de las galletas vendidas
  grossProfit: number; // totalSales - productionCostSold
  netProfit: number; // grossProfit - totalOperatingExpenses
}

export interface AppBackup {
  version: string;
  exportedAt: string;
  userId: string;
  appName: string;
  data: {
    expenses: Expense[];
    batches: Batch[];
    sales: Sale[];
    receivables: Receivable[];
    payables: Payable[];
  };
}

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}
