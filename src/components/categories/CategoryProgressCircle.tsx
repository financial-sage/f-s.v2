import React from 'react';
import { CategoryIcon } from './CategoryIcons';

interface CategoryProgressCircleProps {
    categoryId: string;
    categoryIcon: string;
    categoryColor: string;
    budgetLimit: number | null;
    currentExpense: number;
}

export function CategoryProgressCircle({
    categoryId,
    categoryIcon,
    categoryColor,
    budgetLimit,
    currentExpense = 0
}: CategoryProgressCircleProps) {
    // Si no hay límite de presupuesto, solo mostramos el círculo normal
    if (!budgetLimit || budgetLimit <= 0) {
        return (
            <div 
                className="rounded-full w-13 h-13 border border-zinc-700 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: categoryColor }}
            >
                <CategoryIcon 
                    iconName={categoryIcon || 'plus'} 
                    strokeWidth={1} 
                    size={30} 
                    color="white"
                />
            </div>
        );
    }

    // Calculamos el porcentaje de gasto
    const progressPercentage = Math.min((currentExpense / budgetLimit) * 100, 100);
    
    // Color de fondo más transparente
    const backgroundColor = categoryColor + '20'; // Agregamos transparencia (12.5%)
    
    // Color del progreso - más opaco según el porcentaje
    const getProgressColor = () => {
        if (progressPercentage <= 50) {
            // Verde a amarillo (0-50%)
            return categoryColor + '40'; // 25% opacidad
        } else if (progressPercentage <= 80) {
            // Amarillo (50-80%)
            return categoryColor + '60'; // 37.5% opacidad
        } else if (progressPercentage <= 100) {
            // Naranja (80-100%)
            return categoryColor + '80'; // 50% opacidad
        } else {
            // Rojo para sobrepasar (>100%)
            return '#ef4444' + '90'; // Rojo con 56% opacidad
        }
    };

    return (
        <div 
            className="rounded-full w-13 h-13 border border-zinc-700 flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden"
            style={{ backgroundColor }}
        >
            {/* Fondo de progreso - efecto "vaso llenándose" */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-in-out"
                style={{
                    height: `${progressPercentage}%`,
                    backgroundColor: getProgressColor(),
                    borderRadius: progressPercentage >= 100 ? '50%' : `0 0 ${progressPercentage > 50 ? '50%' : '0'} ${progressPercentage > 50 ? '50%' : '0'}`
                }}
            />
            
            {/* Icono siempre al frente */}
            <div className="relative z-10">
                <CategoryIcon 
                    iconName={categoryIcon || 'plus'} 
                    strokeWidth={1} 
                    size={30} 
                    color="white"
                />
            </div>
            
            {/* Indicador de sobrepasar presupuesto */}
            {progressPercentage > 100 && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
        </div>
    );
}