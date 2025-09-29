"use client";

import { AccountCard, AccountManagement } from "@/src/components/accounts";
import AccountsDashboard from "@/src/components/accounts/accountsDashboard";
import AccountsSlide from "@/src/components/accounts/AccountsSlide";
import BlendyButton from "@/src/components/modal/blendy";
import TransferForm from "@/src/components/transactions/TransferForm";

export default function AccountsPage() {
    const handleAddAccount = () => {
        // Aquí podrías abrir un modal o navegar a una página de formulario
        console.log('Agregar nueva cuenta');
        // Ejemplo: router.push('/accounts/new');
        // Por ahora, mostrar un alert como placeholder
        alert('Funcionalidad para agregar nueva cuenta.\nEn una implementación real, aquí se abriría un formulario para agregar los datos de la cuenta.');
    };

    return (
        <div>
            {/* Componente con efecto glass - ahora carga datos desde la base de datos */}
            <AccountsSlide onAddAccount={handleAddAccount} />
            
            {/* Componentes alternativos comentados para referencia */}
             <AccountManagement /> 
            {/* <AccountsDashboard /> */}
        </div>
    );
}
