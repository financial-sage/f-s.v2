"use client";

import { CategoryIcon } from "@/src/components/categories/CategoryIcons";
import TransactionsView from "@/src/components/transactions/TransactionsView";
import DayCarousel from "@/src/components/common/DayCarousel";
import Calendar from "@/src/components/common/Calendar";
import { useSession } from "@/src/hooks/useSession";
import { useTransactions } from "@/src/hooks/useTransactions";
import { useState } from "react";

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
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'month' | 'calendar'>('month'); // Por defecto vista mensual

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

    // Filtrar transacciones por año, mes, categoría y opcionalmente por día
    const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth() + 1;
        const transactionDay = transactionDate.toDateString();

        const matchesYear = transactionYear === selectedYear;
        const matchesMonth = selectedMonth === 'all' || transactionMonth === selectedMonth;
        const matchesCategory = selectedCategory === 'all' || transaction.category?.id === selectedCategory;

        // Solo filtrar por día si estamos en modo día o calendario
        const matchesDay = viewMode === 'month' || transactionDay === selectedDay.toDateString();

        return matchesYear && matchesMonth && matchesCategory && matchesDay;
    });

    // Calcular balances
    const totalBalance = transactions.reduce((acc, transaction) => {
        return transaction.type === 'income'
            ? acc + transaction.amount
            : acc - transaction.amount;
    }, 0);

    const periodBalance = filteredTransactions.reduce((acc, transaction) => {
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

            return matchesYear && matchesMonth && matchesCategory;
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
    const formatAmount = (amount: number, type: 'income' | 'expense') => {
        const formattedAmount = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);

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
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl  text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
                            Transacciones
                        </h1>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Balance Total</div>
                        <div className={`text-lg font-medium ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {new Intl.NumberFormat('es-ES', {
                                style: 'currency',
                                currency: 'USD'
                            }).format(totalBalance)}
                        </div>
                    </div>
                    <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-right">
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
            <div className="flex items-center w-full justify-between border-b border-gray-300 dark:border-gray-600">
                <div className="flex items-center justify-center ">
                    <div className="flex items-center  backdrop-blur-sm border border-0 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`
                                    px-3 py-1 rounded-md text-sm font-medium transition-all duration-200
                                    ${viewMode === 'month'
                                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/10'
                                }
                                `}
                        >
                            Todo el mes
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`
                                    px-3 py-1 rounded-md text-sm font-medium transition-all duration-200
                                    ${viewMode === 'day'
                                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/10'
                                }
                                `}
                        >
                            Por día
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`
                                    px-3 py-1 rounded-md text-sm font-medium transition-all duration-200
                                    ${viewMode === 'calendar'
                                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/10'
                                }
                                `}
                        >
                            Calendario
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-end space-x-4  dark:border-gray-600 pb-4">
                    {/* Filtros categoria, de año y mes */}
                    <select
                        className="border border-gray-300 dark:border-gray-600 dark:text-gray-400 border-0"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">Todas las categorías</option>
                        {availableCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-300 dark:border-gray-600 dark:text-gray-400 border-0"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-300 dark:border-gray-600 border-0 dark:text-gray-400"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">Todo el año</option>
                        {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className=" grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                <div className=" col-span-2">
                   

                    {/* Mostrar carrusel solo en modo día */}
                    {viewMode === 'day' && (
                        <DayCarousel
                            selectedDate={selectedDay}
                            onDateChange={setSelectedDay}
                        />
                    )}


                    <div className={`card ${viewMode === 'month' ? 'mt-0' : 'mt-4'}`}>
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No hay transacciones para este período
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {filteredTransactions.map((transaction) => (
                                    <li key={transaction.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <CategoryIcon
                                                    iconName={transaction.category?.icon || "wallet"}
                                                    color={transaction.category?.color || "#6366f1"}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-gray-800 dark:text-white font-medium">
                                                        {transaction.description || transaction.category?.name || 'Sin descripción'}
                                                    </span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {transaction.category?.name || 'Sin categoría'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`font-medium ${transaction.type === 'income'
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {formatAmount(transaction.amount, transaction.type)}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
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
                <div className="col-span-1 mt-4">
                    {/* Mostrar calendario solo en modo calendario */}
                    {viewMode === 'calendar' && (
                        <Calendar
                            selectedDate={selectedDay}
                            onDateChange={setSelectedDay}
                            transactionDates={transactionDates}
                            year={selectedYear}
                            month={selectedMonth === 'all' ? new Date().getMonth() + 1 : selectedMonth}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}
