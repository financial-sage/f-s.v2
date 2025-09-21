"use client";

import { CategoryIcon } from "@/src/components/categories/CategoryIcons";
import TransactionsView from "@/src/components/transactions/TransactionsView";
import DayCarousel from "@/src/components/common/DayCarousel";
import Calendar from "@/src/components/common/Calendar";
import { Select } from "@/src/components/common";
import { useSession } from "@/src/hooks/useSession";
import { useTransactions } from "@/src/hooks/useTransactions";
import { useState } from "react";
import BlendyButton from "@/src/components/modal/blendy";

export default function TransactionsPage() {
    const { session, loading: sessionLoading } = useSession();
    const { transactions, loading: transactionsLoading, error } = useTransactions(session?.user?.id || null);

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Estados para filtros
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(currentMonth);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'month' | 'calendar'>('month'); // Por defecto vista mensual

    // Función para manejar la selección de fecha desde el modal
    const handleCalendarDateChange = (date: Date, closeModal?: () => void) => {
        setSelectedDay(date);
        setViewMode('day'); // Cambiar a modo día para aplicar el filtro
        // Cerrar el modal si se proporciona la función
        if (closeModal) {
            setTimeout(() => closeModal(), 100); // Pequeño delay para mostrar la selección
        }
    };

    // Generar opciones de años (últimos 5 años y próximos 2)
    const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

    // Opciones de meses
    const monthOptions = [
        { value: '1', label: 'Enero' },
        { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' },
        { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ];

    // Obtener categorías únicas de las transacciones
    const availableCategories = transactions.reduce((categories, transaction) => {
        if (transaction.category && !categories.find(cat => cat.id === transaction.category!.id)) {
            categories.push({
                id: transaction.category.id,
                name: transaction.category.name,
                color: transaction.category.color,
                icon: transaction.category.icon
            });
        }
        return categories;
    }, [] as Array<{ id: string, name: string, color: string, icon: string | null }>);

    // Obtener cuentas únicas de las transacciones
    const availableAccounts = transactions.reduce((accounts, transaction) => {
        // Agregar cuenta principal si existe y no está ya en la lista
        if (transaction.account && !accounts.find(acc => acc.id === transaction.account!.id)) {
            accounts.push({
                id: transaction.account.id,
                name: transaction.account.name
            });
        }
        // Para transferencias, también agregar la cuenta de destino si existe
        if (transaction.type === 'transfer' && transaction.destination_account &&
            !accounts.find(acc => acc.id === transaction.destination_account!.id)) {
            accounts.push({
                id: transaction.destination_account.id,
                name: transaction.destination_account.name
            });
        }
        return accounts;
    }, [] as Array<{ id: string, name: string }>);

    // Filtrar transacciones por año, mes, categoría, cuenta y opcionalmente por día
    const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth() + 1;
        const transactionDay = transactionDate.toDateString();

        const matchesYear = transactionYear === selectedYear;
        const matchesMonth = selectedMonth === 'all' || transactionMonth === selectedMonth;
        const matchesCategory = selectedCategory === 'all' || transaction.category?.id === selectedCategory;

        // Filtrar por cuenta: incluir transacciones donde la cuenta principal o de destino coincida
        const matchesAccount = selectedAccount === 'all' ||
            transaction.account?.id === selectedAccount ||
            (transaction.type === 'transfer' && transaction.destination_account?.id === selectedAccount);

        // Solo filtrar por día si estamos en modo día o calendario
        const matchesDay = viewMode === 'month' || transactionDay === selectedDay.toDateString();

        return matchesYear && matchesMonth && matchesCategory && matchesAccount && matchesDay;
    });

    // Calcular balances (las transferencias no afectan el balance total)
    const totalBalance = transactions.reduce((acc, transaction) => {
        if (transaction.type === 'transfer') {
            return acc; // Las transferencias no cambian el balance total
        }
        return transaction.type === 'income'
            ? acc + transaction.amount
            : acc - transaction.amount;
    }, 0);

    const periodBalance = filteredTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'transfer') {
            return acc; // Las transferencias no cambian el balance del período
        }
        return transaction.type === 'income'
            ? acc + transaction.amount
            : acc - transaction.amount;
    }, 0);

    // Obtener fechas únicas que tienen transacciones (para el calendario)
    const transactionDates = transactions
        .filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const transactionYear = transactionDate.getFullYear();
            const transactionMonth = transactionDate.getMonth() + 1;

            const matchesYear = transactionYear === selectedYear;
            const matchesMonth = selectedMonth === 'all' || transactionMonth === selectedMonth;
            const matchesCategory = selectedCategory === 'all' || transaction.category?.id === selectedCategory;
            const matchesAccount = selectedAccount === 'all' ||
                transaction.account?.id === selectedAccount ||
                (transaction.type === 'transfer' && transaction.destination_account?.id === selectedAccount);

            return matchesYear && matchesMonth && matchesCategory && matchesAccount;
        })
        .map(transaction => new Date(transaction.date))
        .filter((date, index, array) =>
            array.findIndex(d => d.toDateString() === date.toDateString()) === index
        );

    // Formatear fecha
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Formatear cantidad
    const formatAmount = (amount: number, type: 'income' | 'expense' | 'transfer') => {
        const formattedAmount = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);

        if (type === 'transfer') {
            return `↔${formattedAmount}`;
        }
        return type === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
    };

    if (sessionLoading || transactionsLoading) {
        return <div className="flex justify-center items-center h-64">Cargando transacciones...</div>;
    }

    if (error) {
        return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header con indicadores financieros */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-xl lg:text-2xl text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
                            Transacciones
                        </h1>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                    <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
                        <div className="text-center sm:text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Balance Total</div>
                            <div className={`text-lg font-medium ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(totalBalance)}
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                        <div className="text-center sm:text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {viewMode === 'day' || viewMode === 'calendar'
                                    ? (selectedDay.toDateString() === new Date().toDateString() ? 'Hoy' : selectedDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }))
                                    : (selectedMonth === 'all' ? 'Este Año' : 'Este Mes')
                                }
                            </div>
                            <div className={`text-lg font-medium ${periodBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                {new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(periodBalance)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center w-full lg:justify-between border-b border-gray-300 dark:border-gray-600 pb-4 lg:pb-0 space-y-4 lg:space-y-0">
                <div className="flex items-center justify-center lg:justify-start">
                    <div className="flex items-center backdrop-blur-sm border border-0 rounded-lg p-1 pr-2 space-x-2 w-full sm:w-auto justify-center sm:justify-start">
                        <button
                            onClick={() => setViewMode('month')}
                            className='dark:bg-white/10 dark:hover:bg-white/20 rounded dark:border-gray-600 dark:text-white/80 hover:dark:text-zinc-300 transition-colors flex-1 sm:flex-none'
                            style={{ cursor: 'pointer', padding: '7px 5px' }}
                        >
                            Todo el mes
                        </button>
                        <BlendyButton
                            buttonText="📅 Seleccionar día"
                            buttonVariant="primary"
                            buttonSize="sm"
                            modalTitle="Ver calendario"
                            modalContent={(closeModal) => (
                                <Calendar
                                    selectedDate={selectedDay}
                                    onDateChange={(date) => handleCalendarDateChange(date, closeModal)}
                                    transactionDates={transactionDates}
                                    year={selectedYear}
                                    month={selectedMonth === 'all' ? new Date().getMonth() + 1 : selectedMonth}
                                />
                            )}
                        />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4 dark:border-gray-600">
                    {/* Filtros categoria, cuenta, de año y mes */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-2 lg:gap-4">
                        <div className="w-full sm:w-auto">
                            <Select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                options={[
                                    { value: 'all', label: 'Todas las categorías' },
                                    ...availableCategories.map((category) => ({
                                        value: category.id,
                                        label: category.name
                                    }))
                                ]}
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <Select
                                value={selectedAccount}
                                onChange={(e) => setSelectedAccount(e.target.value)}
                                options={[
                                    { value: 'all', label: 'Todas las cuentas' },
                                    ...availableAccounts.map((account) => ({
                                        value: account.id,
                                        label: account.name
                                    }))
                                ]}
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <Select
                                value={selectedYear.toString()}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                options={yearOptions.map((year) => ({
                                    value: year.toString(),
                                    label: year.toString()
                                }))}
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <Select
                                value={selectedMonth === 'all' ? 'all' : selectedMonth.toString()}
                                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                options={[
                                    { value: 'all', label: 'Todo el año' },
                                    ...monthOptions.map((month) => ({
                                        value: month.value,
                                        label: month.label
                                    }))
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
                <div className="lg:col-span-2 xl:col-span-3">

                    {/* Mostrar carrusel solo en modo día */}
                    {viewMode === 'day' && (
                        <div className="mb-4">
                            <DayCarousel
                                selectedDate={selectedDay}
                                onDateChange={setSelectedDay}
                            />
                        </div>
                    )}

                    <div className={`dark:bg-white/2 p-3 sm:p-4 rounded-md shadow-lg overflow-y-auto ${viewMode === 'month' ? 'mt-0' : 'mt-4'}`}>
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No hay transacciones para este período
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {filteredTransactions.map((transaction) => (
                                    <li key={transaction.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                                        <div className="flex items-start sm:items-center justify-between">
                                            <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                                                <div className="flex-shrink-0 mt-1 sm:mt-0">
                                                    <CategoryIcon
                                                        iconName={transaction.type === 'transfer'
                                                            ? "arrow-left-right"
                                                            : (transaction.category?.icon || "wallet")
                                                        }
                                                        color={transaction.type === 'transfer'
                                                            ? "#6366f1"
                                                            : (transaction.category?.color || "#6366f1")
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-sm sm:text-base text-gray-800 dark:text-white font-medium truncate">
                                                        {transaction.type === 'transfer'
                                                            ? `Transferencia: ${transaction.account?.name || 'Cuenta'} → ${transaction.destination_account?.name || 'Cuenta'}`
                                                            : (transaction.description || transaction.category?.name || 'Sin descripción')
                                                        }
                                                    </span>
                                                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {transaction.type === 'transfer'
                                                            ? (transaction.description || 'Transferencia entre cuentas')
                                                            : `${transaction.category?.name || 'Sin categoría'} • ${transaction.account?.name || 'Cuenta no especificada'}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                                <span className={`text-sm sm:text-base font-medium ${transaction.type === 'income'
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : transaction.type === 'transfer'
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {formatAmount(transaction.amount, transaction.type)}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {formatDate(transaction.date)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1 xl:col-span-1">
                    {/* Mostrar calendario solo en modo calendario */}
                    {viewMode === 'calendar' && (
                        <div className="mt-4 lg:mt-0">
                            <Calendar
                                selectedDate={selectedDay}
                                onDateChange={setSelectedDay}
                                transactionDates={transactionDates}
                                year={selectedYear}
                                month={selectedMonth === 'all' ? new Date().getMonth() + 1 : selectedMonth}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
