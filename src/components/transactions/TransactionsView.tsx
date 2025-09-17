"use client";

import React from 'react';
import styles from '@/scss/modules/transactionsView.module.scss';
import { useTransactionContext } from '@/src/contexts/TransactionContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { formatDate, getTransactionIcon, formatStatus } from '@/src/utils/transactions';
import { TransactionWithCategory } from '@/src/lib/supabase/transactions';
import { CategoryIcon } from '../categories/CategoryIcons';

interface TransactionItemProps {
    transaction: TransactionWithCategory;
}

function TransactionItem({ transaction }: TransactionItemProps) {
    const { formatAmountWithType } = useCurrency();
    
    // Obtener información de la categoría o usar valores por defecto
    const getIconAndColor = () => {
        if (transaction.category) {
            return {
                icon: transaction.category.icon || 'plus',
                color: transaction.category.color
            };
        } else {
            // Iconos por defecto según el tipo de transacción
            return {
                icon: transaction.type === 'income' ? 'trending-up' : 'banknote',
                color: transaction.type === 'income' ? '#22c55e' : '#ef4444' // verde para ingresos, rojo para gastos
            };
        }
    };
    
    const { icon, color } = getIconAndColor();
    
    return (
        <div className={styles.transaction}>
            <div className={styles.content}>
                <div className={styles.transactionInfo}>
                    <div className={`${styles.icon} ${styles.transactionIcon}`} style={{ backgroundColor: color + '30', width: '40px', height: '40px' }}>
                        <CategoryIcon 
                            iconName={icon} 
                            color={color} 
                            size={22} 
                        />
                    </div>
                    <div className={styles.transactionDetails}>
                        <div className={styles.transactionTitle}>
                            {transaction.description || `${transaction.type === 'income' ? 'Ingreso' : 'Gasto'} sin descripción`}
                            {transaction.category && (
                                <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '0.8em', 
                                    color: '#a1a1aa',
                                    fontWeight: 'normal'
                                }}>
                                    · {transaction.category.name}
                                </span>
                            )}
                        </div>
                        <div className={styles.transactionMeta}>
                            <span className={styles.transactionDate}>
                                {formatDate(transaction.date, transaction.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={styles.transactionAmount}>
                    <div className={`${styles.amount} ${transaction.type === 'income' ? styles.income : styles.expense}`}>
                        {formatAmountWithType(transaction.amount, transaction.type)}
                    </div>
                    <div className={styles.transactionStatus}>
                        {formatStatus(transaction.status)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className={styles.scrollContainer}>
            <div className={styles.timeline}>
                <div className={styles.transaction}>
                    <div className={styles.content}>
                        <div className={styles.transactionInfo}>
                            <div className={styles.icon}>
                                <i className="fas fa-spinner fa-spin"></i>
                            </div>
                            <div className={styles.transactionDetails}>
                                <div className={styles.transactionTitle}>Cargando transacciones...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <div className={styles.scrollContainer}>
            <div className={styles.timeline}>
                <div className={styles.transaction}>
                    <div className={styles.content}>
                        <div className={styles.transactionInfo}>
                            <div className={styles.icon}>
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <div className={styles.transactionDetails}>
                                <div className={styles.transactionTitle}>Error al cargar transacciones</div>
                                <div className={styles.transactionMeta}>
                                    <span>{error}</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.transactionAmount}>
                            <button 
                                onClick={onRetry}
                                style={{ 
                                    background: 'var(--theme-color)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '5px', 
                                    padding: '8px 16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className={styles.scrollContainer}>
            <div className={styles.timeline}>
                <div className={styles.transaction}>
                    <div className={styles.content}>
                        <div className={styles.transactionInfo}>
                            <div className={styles.icon}>
                                <i className="fas fa-receipt"></i>
                            </div>
                            <div className={styles.transactionDetails}>
                                <div className={styles.transactionTitle}>No hay transacciones</div>
                                <div className={styles.transactionMeta}>
                                    <span>Aún no has registrado ninguna transacción</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TransactionsView() {
    const { transactions, loading, error, refetch } = useTransactionContext();

    // Mostrar estado de carga si las transacciones están cargando
    if (loading) {
        return <LoadingState />;
    }

    // Mostrar error si hay algún problema
    if (error) {
        return <ErrorState error={error} onRetry={refetch} />;
    }

    // Mostrar estado vacío si no hay transacciones
    if (transactions.length === 0) {
        return <EmptyState />;
    }

    // Mostrar todas las transacciones (sin limitación)
    
    return (
        <div 
            className={styles.scrollContainer}
            style={{ 
                maxHeight: '300px', // Altura fija para mostrar exactamente ~5 transacciones visualmente
                overflowY: 'auto'   // Scroll para ver todas las transacciones
            }}
        >
            <div className={styles.timeline}>
                {transactions.map((transaction: TransactionWithCategory) => (
                    <TransactionItem 
                        key={transaction.id} 
                        transaction={transaction} 
                    />
                ))}
            </div>
        </div>
    );
}
