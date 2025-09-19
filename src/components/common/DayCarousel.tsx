"use client";

import { useState, useEffect } from 'react';

interface DayCarouselProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    availableDates?: Date[];
}

export default function DayCarousel({ selectedDate, onDateChange, availableDates = [] }: DayCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dates, setDates] = useState<Date[]>([]);

    // Generar fechas para el carrusel (7 días hacia atrás y 7 hacia adelante)
    useEffect(() => {
        const generateDates = () => {
            const datesArray: Date[] = [];
            const today = new Date();
            
            // Generar 15 días (7 atrás, hoy, 7 adelante)
            for (let i = -7; i <= 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                datesArray.push(date);
            }
            
            return datesArray;
        };

        const generatedDates = generateDates();
        setDates(generatedDates);
        
        // Encontrar el índice de la fecha seleccionada
        const selectedIndex = generatedDates.findIndex(
            date => date.toDateString() === selectedDate.toDateString()
        );
        
        if (selectedIndex !== -1) {
            setCurrentIndex(selectedIndex);
        } else {
            // Si la fecha seleccionada no está en el rango, usar hoy
            const todayIndex = generatedDates.findIndex(
                date => date.toDateString() === new Date().toDateString()
            );
            setCurrentIndex(todayIndex);
        }
    }, [selectedDate]);

    const navigateLeft = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            onDateChange(dates[newIndex]);
        }
    };

    const navigateRight = () => {
        if (currentIndex < dates.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            onDateChange(dates[newIndex]);
        }
    };

    const selectDate = (index: number) => {
        setCurrentIndex(index);
        onDateChange(dates[index]);
    };

    const formatDay = (date: Date) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hoy';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Mañana';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-ES', { 
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        }
    };

    const getVisibleDates = () => {
        const visible = [];
        const start = Math.max(0, currentIndex - 1);
        const end = Math.min(dates.length, currentIndex + 2);
        
        for (let i = start; i < end; i++) {
            visible.push({
                date: dates[i],
                index: i,
                position: i - currentIndex // -1, 0, 1
            });
        }
        
        return visible;
    };

    const getOpacity = (position: number) => {
        if (position === 0) return 1; // Centro completamente visible
        if (Math.abs(position) === 1) return 0.4; // Laterales con transparencia
        return 0.1; // Muy transparente
    };

    const getScale = (position: number) => {
        if (position === 0) return 1; // Centro tamaño normal
        if (Math.abs(position) === 1) return 0.85; // Laterales más pequeños
        return 0.7; // Muy pequeños
    };

    if (dates.length === 0) return null;

    const visibleDates = getVisibleDates();

    return (
        <div className="relative flex items-center justify-center w-full max-w-md mx-auto">
            {/* Botón izquierdo */}
            <button
                onClick={navigateLeft}
                disabled={currentIndex === 0}
                className={`
                    absolute left-0 z-10 p-2 rounded-full transition-all duration-200
                    bg-white/10 backdrop-blur-lg border border-white/10
                    hover:bg-white/20 active:scale-95
                    ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}
                `}
            >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Contenedor del carrusel */}
            <div className="flex items-center justify-center space-x-1 px-12 py-4">
                {visibleDates.map(({ date, index, position }) => (
                    <div
                        key={index}
                        className="transition-all duration-300 ease-out cursor-pointer"
                        style={{
                            opacity: getOpacity(position),
                            transform: `scale(${getScale(position)})`,
                        }}
                        onClick={() => selectDate(index)}
                    >
                        <div
                            className={`
                                px-2 py-2 rounded-md text-center min-w-[80px] transition-all duration-300
                                backdrop-blur-sm 
                                ${position === 0 
                                    ? 'bg-blue-500/10 border-blue-400/50 shadow-lg' 
                                    : 'bg-white/5 border-white/20 hover:bg-white/20'
                                }
                            `}
                        >
                            <div className={`
                                text-sm font-medium
                                ${position === 0 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-600 dark:text-gray-300'
                                }
                            `}>
                                {formatDay(date)}
                            </div>
                            <div className={`
                                text-xs mt-1
                                ${position === 0 
                                    ? 'text-blue-500 dark:text-blue-300' 
                                    : 'text-gray-500 dark:text-gray-400'
                                }
                            `}>
                                {date.getDate()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botón derecho */}
            <button
                onClick={navigateRight}
                disabled={currentIndex === dates.length - 1}
                className={`
                    absolute right-0 z-10 p-2 rounded-full transition-all duration-200
                    bg-white/10 backdrop-blur-sm border border-white/20
                    hover:bg-white/20 active:scale-95
                    ${currentIndex === dates.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}
                `}
            >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Indicadores de posición */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {dates.map((_, index) => (
                    <div
                        key={index}
                        className={`
                            w-1.5 h-1.5 rounded-full transition-all duration-300
                            ${index === currentIndex 
                                ? 'bg-blue-500 dark:bg-blue-400 scale-125' 
                                : 'bg-gray-300 dark:bg-gray-600'
                            }
                        `}
                    />
                ))}
            </div>
        </div>
    );
}