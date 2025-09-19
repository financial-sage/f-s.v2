"use client";

import React, { useState, useEffect } from 'react';
import { AccountSelector, AccountCard } from './AccountSelector';
import { Button, Input, Select } from '@/src/components/common';
import { Account, NewAccount, AccountType } from '@/src/types/types';
import { getUserAccounts, createAccount, updateAccount, deactivateAccount } from '@/src/lib/supabase/accounts';
import { useSession } from '@/src/hooks/useSession';
import BlendyButton from '../modal/blendy';
import { TransferForm } from '../transactions/TransferForm';

const AccountTypeOptions = [
  { value: 'cash' as AccountType, label: 'Efectivo', icon: '💵' },
  { value: 'bank_account' as AccountType, label: 'Cuenta Bancaria', icon: '🏦' },
  { value: 'credit_card' as AccountType, label: 'Tarjeta de Crédito', icon: '💳' },
  { value: 'debit_card' as AccountType, label: 'Tarjeta de Débito', icon: '💳' },
  { value: 'digital_wallet' as AccountType, label: 'Billetera Digital', icon: '📱' }
];

const AccountColors = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6b7280'
];

export const AccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const { session } = useSession();

  // Estado del formulario
  const [formData, setFormData] = useState<NewAccount>({
    name: '',
    type: 'cash',
    balance: 0,
    currency: 'USD',
    color: AccountColors[0],
    is_default: false
  });

  const loadAccounts = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const result = await getUserAccounts(session.user.id);
      if (result.error) {
        alert(result.error.message);
      } else {
        setAccounts(result.data as Account[] || []);
      }
    } catch (error) {
      alert('Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [session?.user?.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      balance: 0,
      currency: 'USD',
      color: AccountColors[0],
      is_default: false
    });
    setEditingAccount(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    try {
      if (editingAccount) {
        const result = await updateAccount(editingAccount.id, session.user.id, formData);
        if (result.error) {
          alert(result.error.message);
          return;
        }
        alert('Cuenta actualizada exitosamente');
      } else {
        const result = await createAccount(session.user.id, formData);
        if (result.error) {
          alert(result.error.message);
          return;
        }
        alert('Cuenta creada exitosamente');
      }

      resetForm();
      await loadAccounts();
    } catch (error) {
      alert('Error al guardar la cuenta');
    }
  };

  const handleEdit = (account: Account) => {
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      color: account.color,
      is_default: account.is_default,
      bank_name: account.bank_name,
      last_four_digits: account.last_four_digits,
      icon: account.icon
    });
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDeactivate = async (account: Account) => {
    if (!session?.user?.id) return;

    if (account.is_default) {
      alert('No se puede desactivar la cuenta por defecto');
      return;
    }

    if (confirm(`¿Estás seguro de que quieres desactivar la cuenta "${account.name}"?`)) {
      try {
        const result = await deactivateAccount(account.id, session.user.id);
        if (result.error) {
          alert(result.error.message);
        } else {
          alert('Cuenta desactivada exitosamente');
          await loadAccounts();
        }
      } catch (error) {
        alert('Error al desactivar la cuenta');
      }
    }
  };

  // Componente de formulario para crear cuenta
  const AccountFormContent = (closeModal: () => void) => {
    return (
      <div className="max-w-md w-full mx-4">
        <form onSubmit={(e) => { handleSubmit(e); closeModal(); }} className="space-y-4">
          <Input
            label="Nombre de la cuenta"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej: Cuenta Principal, Tarjeta Visa"
          />

          <Select
            label="Tipo de cuenta"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
            required
            options={AccountTypeOptions.map((option) => ({
              value: option.value,
              label: `${option.icon} ${option.label}`
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Balance inicial"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
            />

            <Input
              label="Moneda"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              placeholder="USD"
            />
          </div>

          {(formData.type === 'bank_account' || formData.type === 'credit_card' || formData.type === 'debit_card') && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Banco"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Nombre del banco"
              />

              <Input
                label="Últimos 4 dígitos"
                value={formData.last_four_digits || ''}
                onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value })}
                placeholder="1234"
                maxLength={4}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex space-x-2">
              {AccountColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <Input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_default" className="text-sm">
              Establecer como cuenta por defecto
            </label>
          </div>

          <div className="flex space-x-3">
            <Button type="submit" variant="primary" className="flex-1">
              {editingAccount ? 'Actualizar' : 'Crear'} Cuenta
            </Button>
            <Button
              type="button"
              onClick={() => { resetForm(); closeModal(); }}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Cargando cuentas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <div className="mr-2">
          <BlendyButton
            buttonText="Transferir"
            buttonVariant="secondary"
            buttonSize="sm"
            modalTitle="Transferir entre cuentas"
            modalContent={
              <TransferForm
                onSuccess={() => {
                  window.location.reload(); // Refrescar para ver los cambios
                }}
              />
            }
          />

        </div>
        <BlendyButton
          buttonText="+ Nueva Cuenta"
          buttonVariant="primary"
          buttonSize="sm"
          modalTitle={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
          modalContent={AccountFormContent}
        />
      </div>

      {/* Lista de cuentas */}
      <div className="grid gap-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between">
            <AccountCard
              account={account}
              isSelected={selectedAccountId === account.id}
              onClick={() => setSelectedAccountId(
                selectedAccountId === account.id ? '' : account.id
              )}
            />
            <div className="flex space-x-2 ml-4">
              <Button
                onClick={() => handleEdit(account)}
                variant="secondary"
                size="sm"
              >
                Editar
              </Button>
              {!account.is_default && (
                <Button
                  onClick={() => handleDeactivate(account)}
                  variant="danger"
                  size="sm"
                >
                  Desactivar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay cuentas configuradas. Crea tu primera cuenta para comenzar.
        </div>
      )}
    </div>
  );
};

export default AccountManagement;