"use client";

import React, { useState, useEffect } from 'react';
import { Account } from '../../types/types';
import { getUserAccounts } from '../../lib/supabase/accounts';
import { useSession } from '../../hooks/useSession';

import style from '@/scss/modules/input.module.scss'

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
                className={style.webflowStyleInput}
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
    onEdit?: (accountId: string) => void;
    onDeactivate?: (accountId: string) => void;
    showActions?: boolean;
}> = ({ account, onClick, isSelected = false, onEdit, onDeactivate, showActions = false }) => {
    const formatBalance = (balance: number, currency: string) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
        }).format(balance);
    };

    return (
        <div className="w-full">
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
            
            {/* Botones de acción debajo de la tarjeta */}
            {showActions && (
                <div className="flex gap-2 mt-2 px-3">
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account.id);
                            }}
                            className="flex-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                        </button>
                    )}
                    {onDeactivate && account.is_active && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeactivate(account.id);
                            }}
                            className="flex-1 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                            </svg>
                            Desactivar
                        </button>
                    )}
                    {!account.is_active && (
                        <div className="flex-1 px-3 py-2 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded-md text-center">
                            Cuenta desactivada
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Componente para mostrar una lista de cuentas con acciones
export const AccountList: React.FC<{
    accounts: Account[];
    selectedAccountId?: string;
    onAccountSelect?: (accountId: string) => void;
    onEdit?: (accountId: string) => void;
    onDeactivate?: (accountId: string) => void;
    showActions?: boolean;
    className?: string;
}> = ({ 
    accounts, 
    selectedAccountId, 
    onAccountSelect, 
    onEdit, 
    onDeactivate, 
    showActions = false,
    className = '' 
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {accounts.map((account) => (
                <AccountCard
                    key={account.id}
                    account={account}
                    isSelected={selectedAccountId === account.id}
                    onClick={onAccountSelect ? () => onAccountSelect(account.id) : undefined}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    showActions={showActions}
                />
            ))}
        </div>
    );
};

export default AccountSelector;