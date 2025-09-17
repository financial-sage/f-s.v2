"use client";
import CreditCard from "@/src/components/creditCard/creditCard";
import TransactionsView from "@/src/components/transactions/TransactionsView";
import BlendyButton from "@/src/components/modal/blendy";
import TransactionForm from "@/src/components/transactions/TransactionForm";


export default function Dashboard() {

  
  return (
    <div>
      <h1 style={{ fontWeight: "300", color: "white", fontSize: "1.7rem", marginBottom: "1rem" }}>Dashboard!</h1>

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
                  <TransactionForm 
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