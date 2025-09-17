import React, { useEffect, useState, useRef } from 'react';
import { Input, Select, Button } from '@/src/components/common';
import type { Category } from '@/src/lib/supabase/categories';
import { getUserCategories, createCategory } from '@/src/lib/supabase/categories';
import { addTransaction, type NewTransaction } from '@/src/lib/supabase/transactions';
import { supabase } from '@/src/lib/supabase/client';

// Modal para nueva categoría
const NewCategoryModal = ({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (category: Category) => void; 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6'
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6'
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión');

      const result = await createCategory(session.user.id, {
        name: formData.name,
        color: formData.color,
      });

      if (result.error) throw result.error;
      if (result.data && !Array.isArray(result.data)) {
        onSave(result.data);
        handleClose();
      }
    } catch (error) {
      console.error('Error al crear categoría:', error);
      alert('Error al crear la categoría');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Nueva Categoría</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="name"
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            placeholder="ej. Supermercado, Gasolina, etc."
          />
          <Select
            name="color"
            label="Color"
            value={formData.color}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            options={[
              { value: '#EF4444', label: 'Rojo' },
              { value: '#F59E0B', label: 'Naranja' },
              { value: '#10B981', label: 'Verde' },
              { value: '#3B82F6', label: 'Azul' },
              { value: '#6366F1', label: 'Índigo' },
              { value: '#8B5CF6', label: 'Violeta' },
              { value: '#EC4899', label: 'Rosa' },
            ]}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              Crear Categoría
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TransactionFormProps {
  onSuccess?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSuccess,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [formKey, setFormKey] = useState(0); // Para forzar el reset del formulario
  const formRef = useRef<HTMLFormElement>(null);

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await getUserCategories(session.user.id);
      if (result.data && Array.isArray(result.data)) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleNewCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
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
        category_id: String(formData.get('category')),
        type: selectedType,
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
      setSelectedType('expense');
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
      <form ref={formRef} key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="amount"
            type="number"
            label="Monto"
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          
          <Select
            name="type"
            label="Tipo"
            options={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as 'income' | 'expense')}
            required
          />
        
        <Input
          name="description"
          label="Descripción"
          required
          maxLength={100}
          placeholder="Descripción de la transacción 2"
        />
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Categoría
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                name="category"
                options={categories.map(cat => ({
                  value: cat.id,
                  label: cat.name,
                  style: { borderLeftColor: cat.color, borderLeftWidth: 3, paddingLeft: 8 },
                }))}
                required
                disabled={isLoadingCategories}
                helpText={isLoadingCategories ? 'Cargando categorías...' : undefined}
              />
            </div>
            <button
              type="button"
              style={{ height: 'fit-content', marginTop: '1.3rem' }}
              className="btn btn-secondary btn-sm"
              onClick={() => setShowNewCategoryModal(true)}
            >
              + Nueva
            </button>
          </div>
        </div>
        
        <Input
          name="date"
          type="datetime-local"
          label="Fecha y Hora"
          required
          defaultValue={new Date().toISOString().slice(0, 16)}
        />
        
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoadingCategories}
        >
          Guardar Transacción
        </Button>
      </form>

      {showNewCategoryModal && (
        <NewCategoryModal
          isOpen={showNewCategoryModal}
          onClose={() => setShowNewCategoryModal(false)}
          onSave={handleNewCategory}
        />
      )}
    </>
  );
};

export default TransactionForm;
