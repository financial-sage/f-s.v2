"use client";
import CreditCard from "@/src/components/creditCard/creditCard";
import TransactionsView from "@/src/components/transactions/TransactionsView";
import BlendyButton from "@/src/components/modal/blendy";
import TransactionForm from "@/src/components/transactions/TransactionForm";
import { Categories } from "@/src/components/categories/categories";
import { useState, useEffect } from "react";
import { getUserCategories, type Category } from "@/src/lib/supabase/categories";
import { supabase } from "@/src/lib/supabase/client";


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
      <h1 className="text-2xl font-bold mb-4 dark:text-white" style={{fontWeight: "200"}}>Dashboard!</h1>

      <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <CreditCard />
        </div>

        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {/* Placeholder for future widgets or information */}
          <div className="card sm h-full">
            <div className="cardHeader">
              <h3 className="cardTitle">Bienvenido de nuevo!</h3>
              <p className="cardSubtitle">Aquí tienes un resumen rápido de tu cuenta.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="card sm col-span-2">
          <div className="cardHeader">
            <h3 className="cardTitle">Transacciones</h3>
            {/* <p className="cardSubtitle">Historial de transacciones</p> */}
          </div>
          <div style={{ margin: "-16px -18px -16px 0px" }}>
            <TransactionsView />
          </div>
          <div className="cardFooter">
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

    </div>
  );
}