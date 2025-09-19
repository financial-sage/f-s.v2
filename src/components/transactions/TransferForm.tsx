"use client";

import React, { useState, useRef } from 'react';
import { Input, Button } from '@/src/components/common';
import { AccountSelector } from '@/src/components/accounts/AccountSelector';
import { createTransfer } from '@/src/lib/supabase/transactions';
import { useSession } from '@/src/hooks/useSession';

interface TransferFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({
    onSuccess,
    onCancel
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fromAccountId, setFromAccountId] = useState<string>('');
    const [toAccountId, setToAccountId] = useState<string>('');
    const [formKey, setFormKey] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);
    const { session } = useSession();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!session?.user?.id) {
            alert('Debe estar autenticado para realizar transferencias');
            return;
        }

        if (!fromAccountId || !toAccountId) {
            alert('Debe seleccionar cuenta de origen y destino');
            return;
        }

        if (fromAccountId === toAccountId) {
            alert('No se puede transferir a la misma cuenta');
            return;
        }

        try {
            setIsLoading(true);
            
            const formData = new FormData(e.currentTarget);
            const amount = parseFloat(formData.get('amount') as string);
            const description = formData.get('description') as string;

            if (amount <= 0) {
                alert('El monto debe ser mayor a 0');
                return;
            }

            const result = await createTransfer(
                session.user.id,
                fromAccountId,
                toAccountId,
                amount,
                description || `Transferencia de cuenta a cuenta`
            );

            if (result.error) {
                alert(result.error.message);
            } else {
                // Resetear el formulario
                formRef.current?.reset();
                setFromAccountId('');
                setToAccountId('');
                setFormKey(prev => prev + 1);
                
                if (onSuccess) {
                    onSuccess();
                } else {
                    alert('¡Transferencia realizada exitosamente!');
                }
            }

        } catch (error: any) {
            console.error('Error al realizar la transferencia:', error);
            alert(error.message || 'Error al realizar la transferencia');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Transferir entre cuentas
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Transfiere dinero entre tus cuentas de forma rápida y segura
                </p>
            </div>

            <form ref={formRef} key={formKey} onSubmit={handleSubmit} className="space-y-6">
                {/* Cuenta de origen */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Desde la cuenta
                    </label>
                    <AccountSelector
                        selectedAccountId={fromAccountId}
                        onAccountSelect={setFromAccountId}
                        placeholder="Seleccionar cuenta de origen"
                        className="w-full"
                    />
                </div>

                {/* Cuenta destino */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hacia la cuenta
                    </label>
                    <AccountSelector
                        selectedAccountId={toAccountId}
                        onAccountSelect={setToAccountId}
                        placeholder="Seleccionar cuenta de destino"
                        className="w-full"
                    />
                </div>

                {/* Monto */}
                <div>
                    <Input
                        name="amount"
                        type="number"
                        label="Monto a transferir"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                    />
                </div>

                {/* Descripción opcional */}
                <div>
                    <Input
                        name="description"
                        type="text"
                        label="Descripción (opcional)"
                        placeholder="Ej: Pago de deuda, ahorro, etc."
                    />
                </div>

                {/* Resumen de la transferencia */}
                {fromAccountId && toAccountId && fromAccountId !== toAccountId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Resumen de transferencia
                        </h3>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p>• Cuenta origen: {fromAccountId}</p>
                            <p>• Cuenta destino: {toAccountId}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                La transferencia se procesará de forma inmediata
                            </p>
                        </div>
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
                        className="flex-1"
                    >
                        {isLoading ? 'Procesando...' : 'Transferir'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default TransferForm;