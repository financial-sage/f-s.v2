'use client';

import { useState, useEffect } from 'react';
import { Account, NewAccount, AccountType } from '../../types/types';
import { getUserAccounts, createAccount } from '../../lib/supabase/accounts';
import { useSession } from '../../hooks/useSession';
import { useCurrency } from '../../contexts/CurrencyContext';
import BlendyButton from '../modal/blendy';
import { Input, Select, Button } from '@/src/components/common';

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
    const { session } = useSession();
    const { formatAmount } = useCurrency();
    const [accountsData, setAccountsData] = useState<AccountData[]>([]);
    const [currentActiveIndex, setCurrentActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<NewAccount>({
        name: '',
        type: 'cash',
        balance: 0,
        currency: 'USD',
        color: '#6366f1',
        is_default: false
    });

    // Cargar cuentas desde la base de datos
    useEffect(() => {
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
                    console.log(accounts);
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
                    // Crear tarjeta de Saldo Total al inicio
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

                    const withTotalFirst = [totalCard, ...convertedAccounts];

                    setAccountsData(withTotalFirst);
                    // Asegurar que la tarjeta de total se muestre primero
                    setCurrentActiveIndex(0);
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

        loadAccounts();
    }, [session?.user?.id, formatAmount]);

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
        setShowForm(true);
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
                    <h1>Mis Cuentas</h1>
                    <p className="subtitle">Cargando tus cuentas...</p>
                    <div className="accounts-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'white', fontSize: '1.2rem' }}>
                            <i className="fas fa-spinner fa-spin"></i> Cargando...
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

    // Mostrar mensaje si no hay cuentas
    if (totalAccounts === 0) {
        return (
            <div className="accounts-slide-container">
                <div className="container">
                    <h1>Mis Cuentas</h1>
                    <p className="subtitle">Aún no tienes cuentas registradas</p>
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
                </div>
            </div>
        );
    }

    return (
        <div className="">
            <div className="container">

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
                                onClick={() => handleAccountClick(index)}
                            >
                                {/* Franja de color superior acorde al color de la cuenta */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 5,
                                        backgroundColor: account.color || 'rgba(255,255,255,0.5)'
                                    }}
                                />
                                <div className="account-header">
                                    <div className="account-type">
                                        <i className={`fas ${account.icon} account-icon ${cashIconClass}`}></i>
                                        <span>{account.type}</span>
                                        {account.isDefault && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>⭐</span>}
                                    </div>
                                    {account.bank && (
                                        <img
                                            src={`https://via.placeholder.com/100x30/fff/000?text=${encodeURIComponent(account.bank)}`}
                                            alt={account.bank}
                                            className="account-logo"
                                        />
                                    )}
                                </div>
                                <div className={`account-balance ${cashBalanceClass}`}>
                                    {account.balance}
                                </div>
                                {/* <div className="account-number">{account.number}</div> */}
                                <div className="account-details">
                                    <div className="account-holder">
                                        <div className="label">Titular</div>
                                        <div className="value">{account.holder}</div>
                                    </div>
                                    <div className="account-status">
                                        <div className="label">Estado</div>
                                        <div className="value">{account.status}</div>
                                    </div>
                                </div>
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

                <div className="flex justify-center  gap-4">
                   {/* <button className="swiper-button-next" onClick={handlePrevClick} disabled={totalAccounts <= 1}>
                        <i className="fas fa-chevron-left"></i> Anterior
                    </button>
                    <button className="btn-slide" onClick={handleNextClick} disabled={totalAccounts <= 1}>
                        Siguiente <i className="fas fa-chevron-right"></i>
                    </button>*/}
                    <BlendyButton
                        buttonText="+ Agregar Cuenta"
                        buttonVariant="slide"
                        buttonSize="sm"
                        modalTitle="Nueva Cuenta"
                        open={showForm}
                        onClose={() => setShowForm(false)}
                        onClick={handleAddAccount}
                        modalContent={(closeModal: () => void) => (
                            <div className="max-w-md w-full mx-4">
                                <form onSubmit={(e) => handleSubmit(e, closeModal)} className="space-y-4">
                                    <Input
                                        label="Nombre de la cuenta"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="Ej: Cuenta Principal, Tarjeta Visa"
                                    />

                                    <Select
                                        label="Tipo de cuenta"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                                        required
                                        options={AccountTypeOptions.map((option) => ({
                                            value: option.value,
                                            label: `${option.icon} ${option.label}`
                                        }))}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Balance inicial"
                                            type="number"
                                            step="0.01"
                                            value={formData.balance}
                                            onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                                        />

                                        <Input
                                            label="Moneda"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            placeholder="USD"
                                        />
                                    </div>

                                    {(
                                        formData.type === 'bank_account' ||
                                        formData.type === 'credit_card' ||
                                        formData.type === 'debit_card'
                                    ) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="Banco"
                                                    value={formData.bank_name || ''}
                                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                    placeholder="Nombre del banco"
                                                />

                                                <Input
                                                    label="Últimos 4 dígitos"
                                                    value={formData.last_four_digits || ''}
                                                    onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value })}
                                                    placeholder="1234"
                                                    maxLength={4}
                                                />
                                            </div>
                                        )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Color
                                        </label>
                                        <div className="flex space-x-2">
                                            {AccountColors.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, color })}
                                                    className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <Input
                                            type="checkbox"
                                            id="is_default"
                                            checked={formData.is_default}
                                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <label htmlFor="is_default" className="text-sm">
                                            Establecer como cuenta por defecto
                                        </label>
                                    </div>

                                    <div className="flex space-x-3">
                                        <Button type="submit" variant="primary" className="flex-1">
                                            Crear Cuenta
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => { setShowForm(false); closeModal(); }}
                                            variant="secondary"
                                            className="flex-1"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    />
                </div>
                { /* <div className="account-counter">
                    <span>{currentActiveIndex + 1}</span> de <span>{totalAccounts}</span>
                </div>*/}
            </div>
        </div>
    );
}
