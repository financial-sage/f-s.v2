"use client";

import { useState, useEffect } from 'react';

interface CalendarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    transactionDates?: Date[]; // Fechas que tienen transacciones para mostrar indicadores
    year: number;
    month: number;
}

export default function Calendar({ selectedDate, onDateChange, transactionDates = [], year, month }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date(year, month - 1, 1));

    useEffect(() => {
        setCurrentDate(new Date(year, month - 1, 1));
    }, [year, month]);

    // Obtener el primer día del mes y cuántos días tiene el mes
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = domingo, 1 = lunes, etc.

    // Nombres de los días de la semana
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Generar array de días para mostrar en el calendario
    const calendarDays = [];
    
    // Agregar días vacíos del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
        const prevMonthDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0 - (startingDayOfWeek - 1 - i));
        calendarDays.push({
            date: prevMonthDay,
            isCurrentMonth: false,
            isEmpty: false
        });
    }

    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        calendarDays.push({
            date,
            isCurrentMonth: true,
            isEmpty: false
        });
    }

    // Agregar días del siguiente mes para completar la grilla
    const remainingDays = 42 - calendarDays.length; // 6 semanas × 7 días = 42
    for (let day = 1; day <= remainingDays; day++) {
        const nextMonthDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
        calendarDays.push({
            date: nextMonthDay,
            isCurrentMonth: false,
            isEmpty: false
        });
    }

    // Verificar si una fecha tiene transacciones
    const hasTransactions = (date: Date) => {
        return transactionDates.some(transactionDate => 
            transactionDate.toDateString() === date.toDateString()
        );
    };

    // Verificar si es la fecha seleccionada
    const isSelected = (date: Date) => {
        return selectedDate.toDateString() === date.toDateString();
    };

    // Verificar si es hoy
    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Manejar clic en una fecha
    const handleDateClick = (date: Date) => {
        onDateChange(date);
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-md p-4 w-full max-w-sm mx-auto">
            {/* Encabezado con mes y año */}
            <div className="flex items-center justify-center mb-2">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
                    {currentDate.toLocaleDateString('es-ES', { 
                        month: 'long', 
                        year: 'numeric' 
                    })}
                </h3>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-0 mb-2">
                {daysOfWeek.map((day) => (
                    <div 
                        key={day} 
                        className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Grilla del calendario */}
            <div className="grid grid-cols-7 gap-0">
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const selected = isSelected(date);
                    const today = isToday(date);
                    const hasTransData = hasTransactions(date);

                    return (
                        <button
                            key={index}
                            onClick={() => handleDateClick(date)}
                            disabled={!isCurrentMonth}
                            className={`
                                relative h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200
                                flex items-center justify-center
                                ${!isCurrentMonth 
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-white/10'
                                }
                                ${selected 
                                    ? 'bg-blue-500/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-400/50' 
                                    : ''
                                }
                                ${today && !selected 
                                    ? 'bg-gray-500/20 ring-1 ring-gray-400/50' 
                                    : ''
                                }
                                ${hasTransData && isCurrentMonth 
                                    ? 'after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-green-500 after:rounded-full' 
                                    : ''
                                }
                            `}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500/50 rounded-full"></div>
                    <span>Seleccionado</span>
                </div>
                <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Con transacciones</span>
                </div>
            </div>
        </div>
    );
}