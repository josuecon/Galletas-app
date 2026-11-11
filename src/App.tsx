import React, { useState } from 'react';
import {
  Cookie,
  LayoutDashboard,
  ShoppingBag,
  DollarSign,
  UserCheck,
  CreditCard,
  History,
  LogIn,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Boxes,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider, useData } from './context/DataContext.tsx';
import { Header } from './components/Header.tsx';
import { FinancialSummary } from './components/FinancialSummary.tsx';
import { QuickActions } from './components/QuickActions.tsx';
import { ProductionView } from './components/ProductionView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { SalesView } from './components/SalesView.tsx';
import { ExpensesView } from './components/ExpensesView.tsx';
import { ReceivablesView } from './components/ReceivablesView.tsx';
import { PayablesView } from './components/PayablesView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { ExpenseModal } from './components/ExpenseModal.tsx';
import { BatchModal } from './components/BatchModal.tsx';
import { SaleModal } from './components/SaleModal.tsx';
import { ReceivableModal } from './components/ReceivableModal.tsx';
import { PayableModal } from './components/PayableModal.tsx';
import { FirebaseSetupModal } from './components/FirebaseSetupModal.tsx';
import { formatMoney } from './utils/formatters.ts';

type TabType =
  | 'dashboard'
  | 'production'
  | 'inventory'
  | 'sales'
  | 'expenses'
  | 'receivables'
  | 'payables'
  | 'history';

const MainAppContent: React.FC = () => {
  const { user, isConfigured, login, loading: authLoading } = useAuth();
  const { batches, sales, loadingData } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modal open states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // If Firebase is not configured yet, show welcoming configuration gate
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#fbf8f2] flex flex-col justify-between">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto shadow-inner">
              <Cookie className="w-12 h-12" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                Paso 1 de 2: Configuración de Firebase
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-serif mt-3">
                Bienvenido a Mi Negocio de Galletas
              </h2>
              <p className="text-sm text-stone-600 max-w-lg mx-auto mt-2 leading-relaxed">
                Para garantizar que tus datos sean 100% privados y seguros, la aplicación utiliza tu propio proyecto de <strong>Firebase Firestore</strong> y <strong>Google Authentication</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-stone-200 space-y-1">
                <ShieldCheck className="w-5 h-5 text-[#143d2b]" />
                <h4 className="text-xs font-bold text-stone-900">Acceso Privado</h4>
                <p className="text-[11px] text-stone-500">
                  Solo tú podrás ver y administrar tus galletas mediante tu cuenta de Google.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-stone-200 space-y-1">
                <Database className="w-5 h-5 text-emerald-700" />
                <h4 className="text-xs font-bold text-stone-900">Cloud Firestore</h4>
                <p className="text-[11px] text-stone-500">
                  Persistencia en la nube sin almacenar información en bases ajenas o temporales.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbf8f2] border border-stone-200 space-y-1">
                <Sparkles className="w-5 h-5 text-amber-700" />
                <h4 className="text-xs font-bold text-stone-900">Cálculos Exactos</h4>
                <p className="text-[11px] text-stone-500">
                  Gestión financiera unificada en USD, tandas, ventas y cuentas por cobrar.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowFirebaseModal(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-2xl text-sm font-black shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Database className="w-5 h-5 text-emerald-300" />
                Configurar Firebase Ahora
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
        <FirebaseSetupModal isOpen={showFirebaseModal} onClose={() => setShowFirebaseModal(false)} />
      </div>
    );
  }

  // If Firebase is configured but user is not logged in yet
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fbf8f2] flex flex-col justify-between">
        <Header />
        <main className="max-w-md mx-auto px-4 py-16 flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#ede3d1] text-[#143d2b] flex items-center justify-center mx-auto shadow-inner">
              <Cookie className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight font-serif">
                Acceso Privado del Propietario
              </h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Inicia sesión exclusivamente con tu cuenta de Google para acceder a tus registros de galletas.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                Protegido por reglas de Firestore vinculadas a tu UID de usuario. Nadie más puede leer ni modificar tus datos.
              </span>
            </div>

            <button
              type="button"
              disabled={authLoading}
              onClick={login}
              className="w-full py-3.5 bg-[#143d2b] hover:bg-[#1b4d36] text-white rounded-2xl text-sm font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-5 h-5 text-emerald-300" />
              {authLoading ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}
            </button>

            <button
              type="button"
              onClick={() => setShowFirebaseModal(true)}
              className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
            >
              Revisar o cambiar configuración de Firebase
            </button>
          </div>
        </main>
        <FirebaseSetupModal isOpen={showFirebaseModal} onClose={() => setShowFirebaseModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f2] text-stone-900 flex flex-col">
      <Header />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Panel Principal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'production'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <Cookie className="w-4 h-4" />
            Tandas de Galletas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Inventario
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Ventas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Gastos e Inversiones
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receivables')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'receivables'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Por Cobrar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payables')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'payables'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Por Pagar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#143d2b] text-white shadow-sm'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/70'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </nav>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Actions Bar */}
            <QuickActions
              onOpenExpense={() => setShowExpenseModal(true)}
              onOpenBatch={() => setShowBatchModal(true)}
              onOpenSale={() => setShowSaleModal(true)}
              onOpenReceivable={() => setShowReceivableModal(true)}
              onOpenPayable={() => setShowPayableModal(true)}
            />

            {/* Financial Summary Cards */}
            <FinancialSummary />

            {/* Live Operational Status: Recent batches with stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Batches Widget */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Cookie className="w-5 h-5 text-[#143d2b]" />
                    <h3 className="text-base font-black text-stone-900">Tandas con Galletas Disponibles</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('production')}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Ver todas &rarr;
                  </button>
                </div>

                {batches.filter((b) => b.quantityProduced - b.quantitySold > 0).length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-500">
                    <p className="font-semibold text-stone-700">No hay galletas disponibles en este momento.</p>
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="mt-3 px-4 py-2 bg-[#143d2b] text-white rounded-xl font-bold cursor-pointer"
                    >
                      Hornear una nueva tanda
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {batches
                      .filter((b) => b.quantityProduced - b.quantitySold > 0)
                      .slice(0, 4)
                      .map((b) => {
                        const avail = b.quantityProduced - b.quantitySold;
                        return (
                          <div
                            key={b.id}
                            className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <h4 className="font-black text-stone-900">{b.name}</h4>
                              <p className="text-[11px] text-stone-500">
                                Costo: {formatMoney(b.unitCost)} / galleta
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-sm text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                                {avail} disp.
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowSaleModal(true)}
                                className="px-3 py-1.5 bg-[#143d2b] text-white rounded-xl text-xs font-bold hover:bg-[#1b4d36] cursor-pointer"
                              >
                                Vender
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Recent Sales Widget */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#143d2b]" />
                    <h3 className="text-base font-black text-stone-900">Últimas Ventas Registradas</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Ver todas &rarr;
                  </button>
                </div>

                {sales.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-500">
                    <p className="font-semibold text-stone-700">Aún no se han registrado ventas.</p>
                    <button
                      type="button"
                      onClick={() => setShowSaleModal(true)}
                      className="mt-3 px-4 py-2 bg-[#143d2b] text-white rounded-xl font-bold cursor-pointer"
                    >
                      Registrar primera venta
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sales.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-2xl bg-[#fbf8f2] border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-black text-stone-900">{s.batchName}</h4>
                          <p className="text-[11px] text-stone-500">
                            {s.quantity} {s.modality === 'pack' ? 'paquetes' : 'galletas'} • {s.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-stone-900 block">
                            {formatMoney(s.totalAmount)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              s.paymentStatus === 'pagada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.paymentStatus === 'pagada' ? 'Cobrada' : 'Crédito/Parcial'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <ProductionView
            onSellBatch={() => setShowSaleModal(true)}
            onOpenCreateBatch={() => setShowBatchModal(true)}
          />
        )}

        {activeTab === 'inventory' && <InventoryView />}

        {activeTab === 'sales' && (
          <SalesView onOpenCreateSale={() => setShowSaleModal(true)} />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView onOpenCreateExpense={() => setShowExpenseModal(true)} />
        )}

        {activeTab === 'receivables' && (
          <ReceivablesView onOpenCreateReceivable={() => setShowReceivableModal(true)} />
        )}

        {activeTab === 'payables' && (
          <PayablesView onOpenCreatePayable={() => setShowPayableModal(true)} />
        )}

        {activeTab === 'history' && <HistoryView />}
      </div>

      {/* Global Modals */}
      <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} />
      <BatchModal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} />
      <SaleModal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} />
      <ReceivableModal isOpen={showReceivableModal} onClose={() => setShowReceivableModal(false)} />
      <PayableModal isOpen={showPayableModal} onClose={() => setShowPayableModal(false)} />
      <FirebaseSetupModal isOpen={showFirebaseModal} onClose={() => setShowFirebaseModal(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
