"use client";

import { useState, useEffect } from "react";
import { AccountCard, AccountManagement } from "@/src/components/accounts";
import AccountsDashboard from "@/src/components/accounts/accountsDashboard";
import AccountsSlide from "@/src/components/accounts/AccountsSlide";
import BlendyButton from "@/src/components/modal/blendy";
import TransferForm from "@/src/components/transactions/TransferForm";
import { useSession } from "@/src/hooks/useSession";
import { getUserAccounts } from "@/src/lib/supabase/accounts";

export default function AccountsPage() {
    const { session } = useSession();
    const [hasAccounts, setHasAccounts] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserAccounts();
    }, [session]);

    const checkUserAccounts = async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        try {
            const result = await getUserAccounts(session.user.id);
            setHasAccounts(result.data && result.data.length > 0);
        } catch (error) {
            console.error('Error checking accounts:', error);
            setHasAccounts(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = () => {
        // Recargar las cuentas después de agregar una nueva
        checkUserAccounts();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div>
            {/* AccountsSlide siempre visible para crear/gestionar cuentas */}
            <AccountsSlide onAddAccount={handleAddAccount} />
            
            {/* Solo mostrar AccountManagement si el usuario ya tiene cuentas */}
            {hasAccounts && <AccountManagement />}
            
            {/* Mensaje de bienvenida para usuarios nuevos sin cuentas */}
            {!hasAccounts && (
                <div className="mt-8 max-w-2xl mx-auto">
                    <div className="card sm p-8 text-center">
                        <div className="cardContent">
                            <div className="mb-6">
                                <i className="fas fa-wallet text-6xl text-blue-500 opacity-20"></i>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">
                                ¡Bienvenido a Financial Sage! 👋
                            </h2>
                            <p className="text-zinc-400 mb-6 leading-relaxed">
                                Comienza tu viaje hacia el control financiero creando tu primera cuenta.
                                Puedes agregar cuentas bancarias, efectivo, tarjetas de crédito y más.
                            </p>
                            <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-university text-blue-400"></i>
                                    <span>Cuentas Bancarias</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-credit-card text-purple-400"></i>
                                    <span>Tarjetas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-money-bill-wave text-green-400"></i>
                                    <span>Efectivo</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-sm text-zinc-500">
                                    💡 <strong>Tip:</strong> Usa el carrusel de arriba para crear tu primera cuenta
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
