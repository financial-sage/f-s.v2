'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Account, NewAccount, AccountType } from '../../types/types';
import { getUserAccounts, createAccount } from '../../lib/supabase/accounts';
import { useSession } from '../../hooks/useSession';
import { useCurrency } from '../../contexts/CurrencyContext';
import AccountTransactionModal from '../transactions/modals/AddExpensesModal';
import { Category } from '../../lib/supabase/categories';
import AddAccountModal from './modal/AddAccountModal';
import AddTransferModal from '../transactions/modals/AddTransferModal';
import { Loader } from '../common';

interface AccountData {
    id: string;
    type: string;
    balance: string;
    number: string;
    holder: string;
    status: string;
    icon: string;
    isCash?: boolean;
    bank?: string;
    isDefault?: boolean;
    // Marca interna para identificar la tarjeta de saldo total
    isTotal?: boolean;
    color?: string;
    name?: string;
}

interface AccountsSlideProps {
    onAddAccount?: () => void;
}

// Mapeo de tipos de cuenta a iconos FontAwesome
const AccountTypeIcons = {
    cash: 'fa-money-bill-wave',
    bank_account: 'fa-university',
    credit_card: 'fa-credit-card',
    debit_card: 'fa-credit-card',
    digital_wallet: 'fa-mobile-alt'
};

// Mapeo de tipos de cuenta a nombres en español
const AccountTypeLabels = {
    cash: 'Efectivo',
    bank_account: 'Cuenta Bancaria',
    credit_card: 'Tarjeta de Crédito',
    debit_card: 'Tarjeta de Débito',
    digital_wallet: 'Billetera Digital'
};

export default function AccountsSlide({ onAddAccount }: AccountsSlideProps) {
    const router = useRouter();
    const { session } = useSession();
    const { formatAmount } = useCurrency();
    const [accountsData, setAccountsData] = useState<AccountData[]>([]);
    const [showTxModalIndex, setShowTxModalIndex] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [currentActiveIndex, setCurrentActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const addAccountButtonRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState<NewAccount>({
        name: '',
        type: 'cash',
        balance: 0,
        currency: 'USD',
        color: '#6366f1',
        is_default: false
    });

    // Cargar categorías una sola vez
    useEffect(() => {
        async function fetchCategories() {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            const res = await import('../../lib/supabase/categories');
            const result = await res.getUserCategories(userId);
            if (result.data && Array.isArray(result.data)) setCategories(result.data);
        }
        fetchCategories();
    }, []);

    // Cargar cuentas desde la base de datos
    const loadAccounts = async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await getUserAccounts(session.user.id);

            if (result.error) {
                setError(result.error.message);
                setAccountsData([]);
            } else if (result.data) {
                const accounts = result.data as Account[];
                const convertedAccounts: AccountData[] = accounts.map(account => ({
                    id: account.id,
                    type: account.type,
                    balance: formatAmount(account.balance || 0),
                    number: account.last_four_digits ? `**** ${account.last_four_digits}` : account.name,
                    holder: session.user?.full_name || 'Usuario',
                    status: account.is_active ? (account.is_default ? 'Por defecto' : 'Activa') : 'Inactiva',
                    icon: account.icon || AccountTypeIcons[account.type] || 'fa-university',
                    isCash: account.type === 'cash',
                    bank: account.bank_name,
                    isDefault: account.is_default,
                    color: account.color,
                    name: account.name
                }));
                // Crear tarjeta de Saldo Total al inicio
                const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
                const totalCard: AccountData = {
                    id: 'total-balance',
                    type: 'Saldo Total',
                    balance: formatAmount(totalBalance),
                    number: 'Todas las cuentas',
                    holder: session.user?.full_name || 'Usuario',
                    status: 'Resumen',
                    icon: 'fa-coins',
                    isTotal: true,
                    color: '#6b7280'
                };

                const withTotalFirst = [totalCard, ...convertedAccounts];

                setAccountsData(withTotalFirst);
                // Solo reseteamos el índice si no hay un índice activo
                if (currentActiveIndex === null || currentActiveIndex === undefined) {
                    setCurrentActiveIndex(0);
                }
            } else {
                setAccountsData([]);
            }
        } catch (err) {
            setError('Error al cargar las cuentas');
            setAccountsData([]);
        } finally {
            setLoading(false);
        }
    };

    // Cargar cuentas cuando cambie el usuario o cuando se monte el componente
    useEffect(() => {
        loadAccounts();
    }, [session?.user?.id]);

    // Solo actualizar el formato de los números cuando cambie formatAmount
    useEffect(() => {
        if (accountsData.length > 0) {
            // Actualizar los balances manteniendo los valores originales
            const updatedAccounts = accountsData.map(account => {
                const originalBalance = account.isTotal 
                    ? accountsData.slice(1).reduce((sum, acc) => {
                        const cleanNumber = acc.balance.replace(/[^0-9.-]+/g, '');
                        return sum + parseFloat(cleanNumber);
                      }, 0)
                    : parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
                
                return {
                    ...account,
                    balance: formatAmount(originalBalance)
                };
            });
            setAccountsData(updatedAccounts);
        }
    }, [formatAmount]);

    const totalAccounts = accountsData.length;

    const updateActiveAccount = (newIndex: number) => {
        // Validar el índice con wraparound
        if (newIndex < 0) newIndex = totalAccounts - 1;
        if (newIndex >= totalAccounts) newIndex = 0;
        setCurrentActiveIndex(newIndex);
    };

    const handlePrevClick = () => {
        updateActiveAccount(currentActiveIndex - 1);
    };

    const handleNextClick = () => {
        updateActiveAccount(currentActiveIndex + 1);
    };

    const handleAccountClick = (index: number) => {
        updateActiveAccount(index);
    };

    const handleAddAccount = () => {
        // Hacer clic programáticamente en el botón del modal
        if (addAccountButtonRef.current) {
            const button = addAccountButtonRef.current.querySelector('button');
            if (button) {
                button.click();
            }
        }
        
        // Llamar al callback si existe
        if (onAddAccount) {
            onAddAccount();
        }
    };

    const handleCardClick = (account: AccountData) => {
        // No redirigir si es la tarjeta de "Saldo Total"
        if (account.isTotal) return;
        
        // Redirigir a expenses-tracking con el accountId como parámetro
        router.push(`/expenses-tracking?accountId=${account.id}`);
    };

    const AccountColors = [
        '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
        '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6b7280'
    ];

    const AccountTypeOptions = [
        { value: 'cash' as AccountType, label: 'Efectivo', icon: '💵' },
        { value: 'bank_account' as AccountType, label: 'Cuenta Bancaria', icon: '🏦' },
        { value: 'credit_card' as AccountType, label: 'Tarjeta de Crédito', icon: '💳' },
        { value: 'debit_card' as AccountType, label: 'Tarjeta de Débito', icon: '💳' },
        { value: 'digital_wallet' as AccountType, label: 'Billetera Digital', icon: '📱' }
    ];

    const handleSubmit = async (e: React.FormEvent, closeModal: () => void) => {
        e.preventDefault();
        if (!session?.user?.id) return;
        try {
            const result = await createAccount(session.user.id, formData);
            if (result.error) {
                alert(result.error.message);
                return;
            }
            // Refrescar datos locales sin recargar toda la página
            setShowForm(false);
            setFormData({
                name: '',
                type: 'cash',
                balance: 0,
                currency: 'USD',
                color: AccountColors[0],
                is_default: false
            });
            closeModal();
            // Volver a cargar las cuentas
            const reload = await getUserAccounts(session.user.id);
            if (!reload.error && reload.data) {
                const accounts = reload.data as Account[];
                const convertedAccounts: AccountData[] = accounts.map(account => ({
                    id: account.id,
                    type: AccountTypeLabels[account.type] || account.name,
                    balance: formatAmount(account.balance),
                    number: account.last_four_digits ? `**** ${account.last_four_digits}` : account.name,
                    holder: session.user?.full_name || 'Usuario',
                    status: account.is_active ? (account.is_default ? 'Por defecto' : 'Activa') : 'Inactiva',
                    icon: AccountTypeIcons[account.type] || 'fa-university',
                    isCash: account.type === 'cash',
                    bank: account.bank_name,
                    isDefault: account.is_default,
                    color: account.color
                }));
                const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                const totalCard: AccountData = {
                    id: 'total-balance',
                    type: 'Saldo Total',
                    balance: formatAmount(totalBalance),
                    number: 'Todas las cuentas',
                    holder: session.user?.full_name || 'Usuario',
                    status: 'Resumen',
                    icon: 'fa-coins',
                    isTotal: true,
                    color: '#6b7280'
                };
                setAccountsData([totalCard, ...convertedAccounts]);
                setCurrentActiveIndex(0);
            }
        } catch (err) {
            alert('Error al guardar la cuenta');
        }
    };

    // Mostrar estado de carga
    if (loading) {
        return (
            <div className="">
                <div className="container">
                    <div className="accounts-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                        <div className="flex flex-col items-center gap-3">
                            <Loader size={48} primaryColor="#ffffff" secondaryColor="#ff4c4c" />
                            <div style={{ color: 'white', fontSize: '0.875rem' }}>Cargando cuentas...</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Mostrar error
    if (error) {
        return (
            <div className="accounts-slide-container">
                <div className="container">
                    <h1>Mis Cuentas</h1>
                    <p className="subtitle">Error al cargar las cuentas</p>
                    <div className="accounts-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'white', fontSize: '1.2rem', textAlign: 'center' }}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <br />
                            {error}
                        </div>
                    </div>
                    <button className="btn-slide btn-slide-add" onClick={() => window.location.reload()}>
                        <i className="fas fa-refresh"></i> Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Mostrar mensaje si no hay cuentas (solo contar cuentas reales, sin la tarjeta de total)
    const realAccountsCount = accountsData.filter(acc => !acc.isTotal).length;
    
    if (realAccountsCount === 0) {
        return (
            <div className="accounts-slide-container">
                <div className="container">
                   <div className="accounts-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'white', fontSize: '1.2rem', textAlign: 'center' }}>
                            <i className="fas fa-wallet" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                            <br />
                            Agrega tu primera cuenta para comenzar
                        </div>
                    </div>
                    <button className="btn-slide btn-slide-add" onClick={handleAddAccount}>
                        <i className="fas fa-plus"></i> Agregar Primera Cuenta
                    </button>
                    
                    {/* Modal oculto - el botón anterior hará clic programáticamente en su botón */}
                    <div ref={addAccountButtonRef} style={{ display: 'none' }}>
                        <AddAccountModal 
                            accountId="new" 
                            categories={categories} 
                            onSaved={() => {
                                loadAccounts();
                                if (onAddAccount) {
                                    onAddAccount();
                                }
                            }} 
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div >
            <div className="container flex flex-col gap-12">
                <div className="accounts-stack" id="accountsStack">
                    {accountsData.map((account, index) => {
                        const isCash = account.isCash || false;
                        const cashIconClass = isCash ? 'cash-icon' : '';
                        const cashBalanceClass = '';
                        const isActive = index === currentActiveIndex;
                        return (
                            <div 
                                key={account.id} 
                                className={`account-card ${isActive ? 'active' : ''}`} 
                                data-index={index}
                                onClick={() => isActive && handleCardClick(account)}
                                style={{ 
                                    cursor: isActive && !account.isTotal ? 'pointer' : 'default',
                                    transition: 'transform 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (isActive && !account.isTotal) {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (isActive && !account.isTotal) {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }
                                }}
                                title={isActive && !account.isTotal ? 'Click para ver detalles de gastos' : undefined}
                            >
                                {/* Franja de color superior acorde al color de la cuenta */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: account.color || 'rgba(255,255,255,0.5)' }} />
                                {/* Overlay de color de fondo con transparencia */}
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: account.color || 'transparent', opacity: 0.10, zIndex: 0, pointerEvents: 'none' }} />
                                {/* Indicador de click (solo en tarjeta activa y no "Saldo Total") */}
                                {isActive && !account.isTotal && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '10px', 
                                        right: '10px', 
                                        zIndex: 10,
                                        backgroundColor: 'rgba(59, 130, 246, 0.9)',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '14px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}>
                                        <i className="fas fa-chart-line"></i>
                                    </div>
                                )}
                                <div className="account-header" style={{ position: 'relative', zIndex: 1 }}>
                                    <div className="account-type">
                                        <i className={`fas ${account.icon} account-icon ${cashIconClass}`}></i>
                                        <span>{account.name || account.type}</span>
                                        {account.isDefault && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>⭐</span>}
                                    </div>
                                    {account.bank && (
                                        <img src={`https://via.placeholder.com/100x30/fff/000?text=${encodeURIComponent(account.bank)}`} alt={account.bank} className="account-logo" />
                                    )}
                                </div>
                                <div className={`flex items-center justify-center ${cashBalanceClass}`} style={{ position: 'relative', zIndex: 1, fontSize: '2.3rem', fontWeight: '500', textShadow: '5px 4px 5px rgba(0,0,0,0.2)' }}>
                                    {account.balance}
                                </div>
                                <div className="account-details" style={{ position: 'relative', zIndex: 1 }}>
                                    <div className="account-holder">
                                        <div className="label">Titular</div>
                                        <div className="value">{account.holder}</div>
                                    </div>
                                    <div className="account-status">
                                        <div className="label">Estado</div>
                                        <div className="value">{account.status}</div>
                                    </div>
                                </div>
                                {/* Botón para agregar transacción y modal blendy independiente (moved) */}
                            </div>
                        );
                    })}
                    {/* Botones de navegación circulares en los extremos */}
                    <button className="nav-btn prev" id="prevBtn" onClick={handlePrevClick} disabled={totalAccounts <= 1}>
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <button className="nav-btn next" id="nextBtn" onClick={handleNextClick} disabled={totalAccounts <= 1}>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div className="flex justify-center gap-4 border border-white/10 rounded-lg p-2">
                    {/* Modal para agregar gasto a la cuenta actualmente activa */}
                    {accountsData[currentActiveIndex].type === 'bank_account' || accountsData[currentActiveIndex].type === 'cash' ? (
                        <div className="flex flex-col items-center">
                            <AccountTransactionModal 
                                accountId={accountsData[currentActiveIndex].id} 
                                type="expense" 
                                onTransactionComplete={() => {
                                    loadAccounts();
                                    setCurrentActiveIndex(currentActiveIndex);
                                }}
                            />
                        </div>
                    ) : null}

                    
                        <div className="flex flex-col items-center">
                            <AccountTransactionModal 
                                accountId={accountsData[currentActiveIndex].id} 
                                type="income" 
                                preselectedAccountId={accountsData[currentActiveIndex].id}
                                onTransactionComplete={() => {
                                    loadAccounts();
                                    setCurrentActiveIndex(currentActiveIndex);
                                }}
                            />
                        </div>

                    {/* Botón para agregar cuenta */}
                    <div className="flex flex-col items-center">
                        <AddAccountModal accountId={accountsData[currentActiveIndex].id} categories={categories} onSaved={loadAccounts} />
                    </div>

                    <div className="flex flex-col items-center">
                        <AddTransferModal/>
                    </div>

                </div>

            </div>
        </div>
    );
}
