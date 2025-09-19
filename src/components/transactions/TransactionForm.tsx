import React, { useState, useRef } from 'react';
import { Input, Select, Button } from '@/src/components/common';
import { AccountSelector } from '@/src/components/accounts/AccountSelector';
import type { Category } from '@/src/lib/supabase/categories';
import { addTransaction, type NewTransaction } from '@/src/lib/supabase/transactions';
import { supabase } from '@/src/lib/supabase/client';

interface TransactionFormProps {
  onSuccess?: () => void;
  categories: Category[];
  transactionType: 'income' | 'expense';
  selectedCategoryId?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSuccess,
  categories,
  transactionType,
  selectedCategoryId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [formKey, setFormKey] = useState(0); // Para forzar el reset del formulario
  const formRef = useRef<HTMLFormElement>(null);

  // Filtrar categorías según el tipo de transacción
  const filteredCategories = categories.filter(category => category.type === transactionType);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validar que se haya seleccionado una categoría
    if (!selectedCategoryId) {
      alert('Por favor selecciona una categoría antes de guardar la transacción');
      setIsLoading(false);
      return;
    }

    // Guardar referencia al formulario antes de operaciones async
    const form = e.currentTarget;

    try {
      const formData = new FormData(form);

      // Obtener la sesión del usuario
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Obtener la fecha del formulario y convertir correctamente
      const dateValue = String(formData.get('date'));
      let isoDate: string;

      if (dateValue) {
        // El input datetime-local devuelve formato YYYY-MM-DDTHH:mm
        // Lo interpretamos como hora local y lo convertimos a UTC
        const localDate = new Date(dateValue);
        isoDate = localDate.toISOString();
      } else {
        // Si no hay fecha, usar la fecha actual
        isoDate = new Date().toISOString();
      }

      const transactionData: NewTransaction = {
        amount: Number(formData.get('amount')),
        description: String(formData.get('description')),
        category_id: selectedCategoryId || '',
        account_id: selectedAccountId || undefined,
        type: transactionType,
        date: isoDate,
        status: 'completed',
      };

      // Guardar la transacción usando la función de Supabase
      const result = await addTransaction(session.user.id, transactionData);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Reset form after successful submit - usar ref para mayor seguridad
      if (formRef.current) {
        formRef.current.reset();
      }
      setSelectedAccountId('');
      setFormKey(prev => prev + 1);

      alert('Transacción guardada exitosamente');

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Error al guardar la transacción:', error);
      alert(error.message || 'Error al guardar la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {filteredCategories.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          No hay categorías de {transactionType === 'expense' ? 'gastos' : 'ingresos'} disponibles.
          Crea una categoría primero usando la sección de Categorías arriba.
        </div>
      )}

      <form ref={formRef} key={formKey} onSubmit={handleSubmit} className="space-y-4">
        {/* Input oculto para el tipo de transacción */}
        <input type="hidden" name="type" value={transactionType} />

        {/* Mostrar información de la categoría seleccionada */}
        {selectedCategoryId && (
          <div className='text-zinc-400'>
            <small>Categoría seleccionada:&nbsp;</small>
            {
              filteredCategories.find(cat => cat.id === selectedCategoryId)?.name || 'Categoría no encontrada'
            }
          </div>
        )}

        {!selectedCategoryId && filteredCategories.length > 0 && (
          <small className='text-zinc-400'>
            Selecciona una categoría de {transactionType === 'expense' ? 'gastos' : 'ingresos'} arriba para continuar
          </small>
        )}

        {/* Selector de cuenta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cuenta
          </label>
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountSelect={setSelectedAccountId}
            placeholder="Seleccionar cuenta de pago"
          />
        </div>

        <div className='grid grid-cols-3 gap-2 pt-2'>
          <Input
            name="amount"
            type="number"
            label="Monto"
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />

          <div className='col-span-2'>
            <Input
              name="description"
              label="Descripción"
              required
              maxLength={100}
              placeholder="Descripción de la transacción 2"

            />

          </div>

        </div>

        <Input
          name="date"
          type="datetime-local"
          label="Fecha y Hora"
          required
          defaultValue={new Date().toISOString().slice(0, 16)}
        />
        <div className='flex gap-2 items-center content-end justify-end pt-3'>
          <Button
            type="submit"
            variant='success'
            size='sm'
            isLoading={isLoading}
            disabled={filteredCategories.length === 0 || !selectedCategoryId}
          >
            Guardar Transacción
          </Button>

        </div>
      </form>
    </>
  );
};

export default TransactionForm;
