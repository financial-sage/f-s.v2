"use client";
import CreditCard from "@/src/components/creditCard/creditCard";
import TransactionsView from "@/src/components/transactions/TransactionsView";
import BlendyButton from "@/src/components/modal/blendy";
import TransactionForm from "@/src/components/transactions/TransactionForm";
import TransferForm from "@/src/components/transactions/TransferForm";
import { Categories } from "@/src/components/categories/categories";
import { useState, useEffect } from "react";
import { getUserCategories, type Category } from "@/src/lib/supabase/categories";
import { supabase } from "@/src/lib/supabase/client";
import AccountsDashboard from "@/src/components/accounts/accountsDashboard";
import AccountManagement from "@/src/components/accounts/AccountManagement";
import { AccountsSlide } from "@/src/components/accounts";
import MonthlyTransactionsEChart from "@/src/components/charts/MonthlyTransactionsEChart";
import { getUserAccounts } from "@/src/lib/supabase/accounts";
import { useSession } from "@/src/hooks/useSession";


export default function Dashboard() {
  const { session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [hasAccounts, setHasAccounts] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await getUserCategories(session.user.id);
      if (result.data && Array.isArray(result.data)) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const checkUserAccounts = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await getUserAccounts(session.user.id);
      setHasAccounts(result.data ? (Array.isArray(result.data) && result.data.length > 0) : false);
    } catch (error) {
      console.error('Error checking accounts:', error);
      setHasAccounts(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    checkUserAccounts();
  }, [session]);

  const handleCategoriesUpdate = () => {
    loadCategories();
  };

  const handleTabChange = (tab: 'expenses' | 'income') => {
    setActiveTab(tab);
    setSelectedCategoryId(''); // Limpiar selección al cambiar de tab
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleAddAccount = () => {
    checkUserAccounts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Vista para usuarios sin cuentas
  if (!hasAccounts) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 dark:text-white" style={{ fontWeight: "200" }}>Dashboard!</h1>
        
        <div className="max-w-4xl mx-auto">
          <AccountsSlide onAddAccount={handleAddAccount} />
          
          <div className="mt-8">
            <div className="card sm p-8 text-center">
              <div className="cardContent">
                <div className="mb-6">
                  <i className="fas fa-chart-line text-6xl text-blue-500 opacity-20"></i>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  ¡Comienza a gestionar tus finanzas! 💰
                </h2>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Crea tu primera cuenta para comenzar a rastrear tus ingresos, gastos y alcanzar tus metas financieras.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <i className="fas fa-wallet text-2xl text-blue-400 mb-2"></i>
                    <h3 className="font-semibold text-white mb-1">Cuentas</h3>
                    <p className="text-zinc-500">Gestiona múltiples cuentas bancarias</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <i className="fas fa-chart-pie text-2xl text-purple-400 mb-2"></i>
                    <h3 className="font-semibold text-white mb-1">Análisis</h3>
                    <p className="text-zinc-500">Visualiza tus gastos e ingresos</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <i className="fas fa-piggy-bank text-2xl text-green-400 mb-2"></i>
                    <h3 className="font-semibold text-white mb-1">Ahorro</h3>
                    <p className="text-zinc-500">Alcanza tus metas financieras</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-zinc-500">
                    💡 <strong>Tip:</strong> Crea tu primera cuenta para desbloquear todas las funcionalidades del dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista normal para usuarios con cuentas
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-white" style={{ fontWeight: "200" }}>Dashboard!</h1>

      <div className="grid sm:grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="">
          <AccountsSlide />
          {/* <CreditCard /> */}
        </div>

        <div className="md:col-span-2 lg:col-span-2 hidden md:block">
          {/* Placeholder for future widgets or information */}
          <div className="card sm h-full">
            <div className="cardHeader">
              <h3 className="cardTitle">Gastos del mes</h3>
            </div>
            <div className="cardContent">
              <MonthlyTransactionsEChart height={260} mock={false} />
            </div>
          </div>

        </div>
      </div>

      <div className=" mt-4 grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="card sm">
          <div className="cardHeader">
            <h3 className="cardTitle">Transacciones</h3>
            {/* <p className="cardSubtitle">Historial de transacciones</p> */}
          </div>
          <div className="cardContent">
            <TransactionsView />
          </div>
        </div>

        <div className="card sm">
              <div>
                
              </div>
        </div>
      </div>

    </div>
  );
}