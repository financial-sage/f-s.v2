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


export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

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

  useEffect(() => {
    loadCategories();
  }, []);

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


  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-white" style={{ fontWeight: "200" }}>Dashboard!</h1>

      <div className="grid sm:grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="">
          <AccountsSlide />
          {/* <CreditCard /> */}
        </div>

        <div className="md:col-span-2 lg:col-span-2">
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
          <div className="cardFooter">
            <div className="flex gap-2 mt-1">
              <BlendyButton
                buttonText="Agregar transacción"
                buttonVariant="primary"
                buttonSize="sm"
                modalTitle="Nueva Transacción"
                modalContent={
                  <div>
                    <Categories
                      onCategoriesUpdate={handleCategoriesUpdate}
                      onCategorySelect={handleCategorySelect}
                      selectedCategoryId={selectedCategoryId}
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                    />
                    <TransactionForm
                      categories={categories}
                      transactionType={activeTab === 'expenses' ? 'expense' : 'income'}
                      selectedCategoryId={selectedCategoryId}
                      onSuccess={() => {
                        // Aquí puedes agregar lógica para refrescar las transacciones
                        // Por ejemplo, disparar un evento o actualizar estado
                        window.location.reload(); // Solución temporal - podrías mejorar esto
                      }}
                    />
                  </div>
                }
              />

            </div>
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