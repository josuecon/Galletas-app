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
export type ExpenseStatus = 'pagado' | 'pendiente' | 'anulado';

// Dimensiones y unidades físicas de medida
export type DimensionType = 'masa' | 'volumen' | 'unidad';
export type MassUnit = 'g' | 'kg';
export type VolumeUnit = 'ml' | 'l';
export type DiscreteUnit = 'unidad';
export type UnitOfMeasure = MassUnit | VolumeUnit | DiscreteUnit;
export type BaseUnit = 'g' | 'ml' | 'unidad';

// Tipos de movimientos en el Kárdex
export type InventoryMovementType =
  | 'compra'
  | 'consumo_tanda'
  | 'regularizacion_tanda'
  | 'ajuste_sobrante'
  | 'ajuste_merma'
  | 'compensacion_edicion'
  | 'reversion_compra'
  | 'reversion_tanda';

// Catálogo de ingredientes con existencia física y valoración única en USD
export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  category: string;
  dimension: DimensionType;
  baseUnit: BaseUnit;
  physicalStock: number;   // Existencia física única en baseUnit
  averageCost: number;     // Costo promedio unitario en USD
  totalValue: number;      // physicalStock * averageCost en USD
  minStockAlert?: number;
  createdAt: string;
  updatedAt: string;
}

// Asiento inmutable en el Kárdex de inventario (en USD)
export interface InventoryMovement {
  id: string;
  userId: string;
  ingredientId: string;
  ingredientName: string;
  type: InventoryMovementType;
  enteredQuantity: number;
  enteredUnit: UnitOfMeasure;
  baseQuantity: number; // Con signo: positivo (entrada), negativo (salida)
  baseUnit: BaseUnit;
  unitCost: number;     // Costo unitario en USD
  totalAmount: number;  // Importe total en USD
  referenceId?: string; // batchId o expenseId
  batchRecipeName?: string;
  notes?: string;
  sourceType?: 'compra' | 'cpp_actual';
  referenceExpenseId?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// Desglose de consumo por ingrediente en una tanda (en USD)
export interface BatchIngredientUsage {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  requiredUnit: UnitOfMeasure;
  requiredBaseQty: number;
  physicallyCoveredBaseQty: number; // Cantidad física descontada del almacén
  valuedBaseQty: number;            // Cantidad con costo económico reconocido
  uncoveredBaseQty: number;         // Cantidad con costo pendiente de valorizar
  coveredCost: number;              // Costo monetario cubierto acumulado en USD
  unitCostAtBatch: number;          // Costo unitario promedio en baseUnit al momento del consumo en USD
  isFullyCovered: boolean;
  sourceType?: 'compra' | 'cpp_actual';
  referenceExpenseId?: string;
  referenceMovementId?: string;
}

// Costos directos de tanda (gas, empaques, mano de obra puntual en USD)
export interface BatchDirectCost {
  id: string;
  description: string;
  amount: number;
}

export type BatchCostStatus = 'definitivo' | 'provisional';
export type BatchStockStatus = 'completo' | 'stock_incompleto';

export interface Expense {
  id: string;
  userId: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType; // 'insumo' no descuenta de ganancia si entra al costo de tanda; 'operativo' sí descuenta
  amount: number;    // Monto en USD
  date: string;      // YYYY-MM-DD
  status: ExpenseStatus;
  observation?: string;
  linkedPayableId?: string;
  createdAt: string;

  // Campos de inventario (opcionales para compatibilidad)
  ingredientId?: string;
  ingredientName?: string;
  purchaseQuantity?: number;
  purchaseUnit?: UnitOfMeasure;
  inventoryMovementId?: string;
  isReversed?: boolean;
  reversalReason?: string;
  reversalDate?: string;
  updatedAt?: string;
}

export interface Batch {
  id: string;
  userId: string;
  name: string; // Ej: "Galletas Chispas de Chocolate"
  date: string; // YYYY-MM-DD
  quantityProduced: number; // Unidades producidas
  quantitySold: number;     // Unidades vendidas
  totalCost: number;        // Costo total de producción en USD
  unitCost: number;         // totalCost / quantityProduced en USD
  observations?: string;
  createdAt: string;

  // Campos de inventario y recetas
  recipeName?: string;
  ingredientsUsed?: BatchIngredientUsage[];
  otherDirectCosts?: BatchDirectCost[];
  otherDirectCostsAmount?: number;
  coveredIngredientsCost?: number;
  costStatus?: BatchCostStatus;
  stockStatus?: BatchStockStatus;
  isManualCost?: boolean;
  updatedAt?: string;
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
  salePrice: number;  // Precio unitario o paquete en USD
  totalAmount: number; // Total venta calculado en USD
  paymentStatus: PaymentStatus;
  amountPaid: number;  // Dinero efectivamente recibido en USD
  customerName?: string;
  linkedReceivableId?: string;
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  date: string;
  amount: number; // Monto en USD
  notes?: string;
}

export type DebtStatus = 'pendiente' | 'parcial' | 'pagada';

export interface Receivable {
  id: string;
  userId: string;
  customerName: string;
  concept: string;
  totalAmount: number; // En USD
  date: string;
  dueDate?: string;
  installments: PaymentInstallment[];
  totalPaid: number;       // Suma de abonos en USD
  pendingBalance: number;  // totalAmount - totalPaid en USD
  status: DebtStatus;
  linkedSaleId?: string;
  createdAt: string;
}

export interface Payable {
  id: string;
  userId: string;
  supplierName: string;
  concept: string;
  totalAmount: number; // En USD
  date: string;
  dueDate?: string;
  installments: PaymentInstallment[];
  totalPaid: number;       // Suma de abonos en USD
  pendingBalance: number;  // totalAmount - totalPaid en USD
  status: DebtStatus;
  expenseCategory?: ExpenseCategory;
  expenseType?: ExpenseType;
  linkedExpenseId?: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalInvestments: number;       // Compras e insumos registrados en USD
  totalOperatingExpenses: number; // Gastos operativos en USD
  totalSales: number;             // Ventas brutas totales en USD
  totalCollected: number;         // Dinero cobrado en USD
  totalPendingReceivable: number; // Dinero pendiente por cobrar en USD
  totalPendingPayable: number;    // Dinero pendiente por pagar en USD
  productionCostSold: number;     // Costo de tandas de las galletas vendidas en USD
  grossProfit: number;            // totalSales - productionCostSold en USD
  netProfit: number;              // grossProfit - totalOperatingExpenses en USD
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
    ingredients?: Ingredient[];
    inventoryMovements?: InventoryMovement[];
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
