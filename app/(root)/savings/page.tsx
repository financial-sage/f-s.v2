'use client';
import { CategoryIcon } from "@/src/components/categories/CategoryIcons";
import { Select } from "@/src/components/common";
import { useSession } from "@/src/hooks/useSession";
import { getUserAccounts } from "@/src/lib/supabase/accounts";
import { Account } from "@/src/types/types";
import { useEffect, useState } from "react";

export default function SavingsPage() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const { session } = useSession();


    const loadAccounts = async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);
            const result = await getUserAccounts(session.user.id);
            if (result.error) {
                alert(result.error.message);
            } else {
                setAccounts(result.data as Account[] || []);
            }
        } catch (error) {
            alert('Error al cargar las cuentas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [session?.user?.id]);

    return (
        <div>
            <h1 className="text-xl mb-2 dark:text-white">Ahorros</h1>
            {/* <h2 className="text-base font-medium mb-1 dark:text-white" style={{ fontWeight: "200" }}>Selecciona una cuenta para ver sus ahorros:</h2>
            <div className="max-w-xs mb-2">
                <Select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    options={[
                        { value: '', label: 'Seleccione una cuenta' },
                        ...accounts.map((account) => ({
                            value: account.id,
                            label: `${account.name} - ${account.balance}`
                        }))
                    ]}
                />
            </div> */}
            <div>
                <div className="grid lg:grid-cols-3 gap-2 mt-4">
                    <div className="col-span-2">
                        <div className="card sm p-2 max-h-[100px] flex flex-col items-center justify-center" style={{ minWidth: 0 }}>
                            <h1 >Saldo total de ahorros</h1>
                            <p className="text-2xl mb-2 dark:text-white">$10,000</p>
                            <p className="">Progreso general: 42% de tu meta anual</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 mt-2">
                            <div className="card sm p-2" style={{ minWidth: 0 }}>
                                <div className="cardHeader pb-1">
                                    <h3 className="cardTitle text-base">Fondo de Emergencia</h3>
                                </div>
                                <div className="cardContent p-2">
                                    <div className="mb-1">
                                        <div className="progress-info flex items-center justify-between mb-1">
                                            <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>$2,000 / $10,000</div>
                                            <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>59%</div>
                                        </div>
                                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                            <div className=" bg-green-500 h-1 rounded" style={{ width: '59%' }}></div>
                                        </div>
                                    </div>
                                    <div className="saving-details flex flex-row gap-2 justify-between">
                                        <div className="flex flex-col items-center bg-white/10 px-2 py-1 rounded min-w-[60px]">
                                            <div className="detail-label text-xs">Por mes</div>
                                            <div className="detail-value text-sm">$340</div>
                                        </div>
                                        <div className="flex flex-col items-center bg-white/10 px-2 py-1 rounded min-w-[60px]">
                                            <div className="detail-label text-xs">Faltan</div>
                                            <div className="detail-value text-sm">$8,000</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Agregar ahorro">
                                        <CategoryIcon iconName="plus" size={16} color="#10b981" />
                                    </button>
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Editar objetivo">
                                        <CategoryIcon iconName="edit" size={16} color="#3b82f6" />
                                    </button>
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Eliminar objetivo">
                                        <CategoryIcon iconName="trash" size={16} color="#ef4444" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="card sm p-2" style={{ minWidth: 0 }}>
                                <div className="cardHeader pb-1">
                                    <h3 className="cardTitle text-base">Fondo de Emergencia</h3>
                                </div>
                                <div className="cardContent p-2">
                                    <div className="mb-1">
                                        <div className="progress-info flex items-center justify-between mb-1">
                                            <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>$2,000 / $10,000</div>
                                            <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>59%</div>
                                        </div>
                                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                            <div className=" bg-green-500 h-1 rounded" style={{ width: '59%' }}></div>
                                        </div>
                                    </div>
                                    <div className="saving-details flex flex-row gap-2 justify-between">
                                        <div className="flex flex-col items-center bg-white/10 px-2 py-1 rounded min-w-[60px]">
                                            <div className="detail-label text-xs">Por mes</div>
                                            <div className="detail-value text-sm">$340</div>
                                        </div>
                                        <div className="flex flex-col items-center bg-white/10 px-2 py-1 rounded min-w-[60px]">
                                            <div className="detail-label text-xs">Faltan</div>
                                            <div className="detail-value text-sm">$8,000</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Agregar ahorro">
                                        <CategoryIcon iconName="plus" size={16} color="#10b981" />
                                    </button>
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Editar objetivo">
                                        <CategoryIcon iconName="edit" size={16} color="#3b82f6" />
                                    </button>
                                    <button className="rounded-full p-1 dark:bg-white/10 border border-gray-600" title="Eliminar objetivo">
                                        <CategoryIcon iconName="trash" size={16} color="#ef4444" />
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>

                    <div className="card sm p-2" style={{ minWidth: 0 }}>
                        <div className="cardHeader pb-1">
                            <h3 className="cardTitle text-base">Historial de ahorros</h3>
                        </div>
                        <div className="cardContent p-2">
                            <div className="mb-1 pr-3 pt-2">
                                <div className="progress-info flex items-center justify-between">
                                    <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>Fondo de emergencia:  $2,000 / $10,000</div>
                                    <div className="text-base font-semibold dark:text-green-400 dark:bg-green-500/20 pl-2 pr-2 pb-1 rounded-lg" style={{ fontWeight: "200" }}>59%</div>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                    <div className=" bg-green-500 h-1 rounded" style={{ width: '59%' }}></div>
                                </div>
                            </div>
                            <div className="mb-1 pr-3 pt-2">
                                <div className="progress-info flex items-center justify-between">
                                    <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>Compra de productos $2,000 / $10,000</div>
                                    <div className="text-base font-semibold dark:text-yellow-400 dark:bg-yellow-500/20 pl-2 pr-2 pb-1 rounded-lg" style={{ fontWeight: "200" }}>30%</div>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                    <div className=" bg-yellow-500 h-1 rounded" style={{ width: '30%' }}></div>
                                </div>
                            </div>
                            <div className="mb-1 pr-3 pt-2">
                                <div className="progress-info flex items-center justify-between">
                                    <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>Fondo de emergencia:  $2,000 / $10,000</div>
                                    <div className="text-base font-semibold dark:text-blue-400 dark:bg-blue-500/20 pl-2 pr-2 pb-1 rounded-lg" style={{ fontWeight: "200" }}>59%</div>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                    <div className=" bg-blue-500 h-1 rounded" style={{ width: '59%' }}></div>
                                </div>
                            </div>
                            <div className="mb-1 pr-3 pt-2">
                                <div className="progress-info flex items-center justify-between">
                                    <div className="text-base font-semibold dark:text-white" style={{ fontWeight: "200" }}>Compra de productos $2,000 / $10,000</div>
                                    <div className="text-base font-semibold dark:text-emerald-400 dark:bg-emerald-500/20 pl-2 pr-2 pb-1 rounded-lg" style={{ fontWeight: "200" }}>30%</div>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                                    <div className=" bg-emerald-500 h-1 rounded" style={{ width: '30%' }}></div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            <div className="card dark:text-zinc-300 mt-6">
                <div className="tips-title">
                    <i className="fas fa-lightbulb"></i> Consejos para Ahorrar
                </div>
                <div className="tips-grid">
                    <div className="card">
                        <div className="tip-title"><i className="fas fa-bullseye"></i> Establece metas claras</div>
                        <div className="tip-content">Define objetivos específicos, medibles y con fechas límite para mantener la motivación.</div>
                    </div>
                    <div className="card">
                        <div className="tip-title"><i className="fas fa-chart-line"></i> Automatiza tus ahorros</div>
                        <div className="tip-content">Configura transferencias automáticas para ahorrar sin esfuerzo cada mes.</div>
                    </div>
                    <div className="card">
                        <div className="tip-title"><i className="fas fa-coins"></i> Reduce gastos innecesarios</div>
                        <div className="tip-content">Identifica y elimina suscripciones o gastos que no aportan valor a tu vida.</div>
                    </div>
                    <div className="card">
                        <div className="tip-title"><i className="fas fa-piggy-bank"></i> Ahorra primero, gasta después</div>
                        <div className="tip-content">Separa tu porcentaje de ahorro al recibir ingresos, antes de hacer cualquier gasto.</div>
                    </div>
                </div>
            </div>


        </div>
    );
}