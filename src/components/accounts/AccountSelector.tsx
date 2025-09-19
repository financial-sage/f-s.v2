"use client";

import React, { useState, useEffect } from 'react';
import { Account } from '../../types/types';
import { getUserAccounts } from '../../lib/supabase/accounts';
import { useSession } from '../../hooks/useSession';

interface AccountSelectorProps {
    selectedAccountId?: string;
    onAccountSelect: (accountId: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

const AccountTypeIcons = {
    cash: '💵',
    bank_account: '🏦',
    credit_card: '💳',
    debit_card: '💳',
    digital_wallet: '📱'
};

const AccountTypeLabels = {
    cash: 'Efectivo',
    bank_account: 'Cuenta Bancaria',
    credit_card: 'Tarjeta de Crédito',
    debit_card: 'Tarjeta de Débito',
    digital_wallet: 'Billetera Digital'
};

export const AccountSelector: React.FC<AccountSelectorProps> = ({
    selectedAccountId,
    onAccountSelect,
    className = '',
    placeholder = 'Seleccionar cuenta',
    disabled = false
}) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { session } = useSession();

    useEffect(() => {
        const loadAccounts = async () => {
            if (!session?.user?.id) return;

            try {
                setLoading(true);
                const result = await getUserAccounts(session.user.id);

                if (result.error) {
                    setError(result.error.message);
                } else {
                    setAccounts(result.data as Account[] || []);

                    // Si no hay cuenta seleccionada y hay cuentas disponibles, seleccionar la por defecto
                    if (!selectedAccountId && result.data && Array.isArray(result.data)) {
                        const defaultAccount = result.data.find(acc => acc.is_default);
                        if (defaultAccount) {
                            onAccountSelect(defaultAccount.id);
                        }
                    }
                }
            } catch (err) {
                setError('Error al cargar las cuentas');
            } finally {
                setLoading(false);
            }
        };

        loadAccounts();
    }, [session?.user?.id, selectedAccountId, onAccountSelect]);

    const formatBalance = (balance: number, currency: string) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
        }).format(balance);
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-10 bg-gray-200 rounded-md"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-red-500 text-sm ${className}`}>
                {error}
            </div>
        );
    }

    return (
        <div className={className}>
            <select
                value={selectedAccountId || ''}
                onChange={(e) => onAccountSelect(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
                <option value="">{placeholder}</option>
                {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                        {AccountTypeIcons[account.type]} {account.name}
                        {account.bank_name && ` - ${account.bank_name}`}
                        {account.last_four_digits && ` ****${account.last_four_digits}`}
                        {' '}({formatBalance(account.balance, account.currency)})
                        {account.is_default && ' ⭐'}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Componente más visual para mostrar la cuenta seleccionada
export const AccountCard: React.FC<{
    account: Account;
    onClick?: () => void;
    isSelected?: boolean;
}> = ({ account, onClick, isSelected = false }) => {
    const formatBalance = (balance: number, currency: string) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
        }).format(balance);
    };

    return (
        <div
            onClick={onClick}
            className={`
        p-3 pt-6 pb-6 items-center justify-between cursor-pointer transition-all duration-200 dark:bg-white/5 shadow-lg w-full
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
      `}
            style={{ borderLeftColor: account.color, borderLeftWidth: '2px', borderRadius: '0px 6px 6px 0px' }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{account.icon || AccountTypeIcons[account.type]}</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-300">
                        {account.name}
                    </div>
                    <div className="text-sm text-gray-500">
                        {AccountTypeLabels[account.type]}
                        {account.bank_name && ` • ${account.bank_name}`}
                        {account.last_four_digits && ` • ****${account.last_four_digits}`}
                    </div>
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-300">
                    {formatBalance(account.balance, account.currency)}
                </div>
            </div>
        </div>
    );
};

export default AccountSelector;