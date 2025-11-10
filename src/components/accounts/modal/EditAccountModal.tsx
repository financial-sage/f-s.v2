"use client";

import { useState, useEffect } from "react";
import { supabase } from '@/src/lib/supabase/client';
import { updateAccount } from '@/src/lib/supabase/accounts';
import { Account, AccountType, NewAccount } from "@/src/types/types";
import { LiaMoneyBillWaveAltSolid } from "react-icons/lia";
import { GiSmartphone } from "react-icons/gi";
import { CiCreditCard2 } from "react-icons/ci";
import { PiBankThin, PiChartLineUpLight, PiPiggyBankLight } from "react-icons/pi";

interface EditAccountModalProps {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
}

const AccountTypeOptions = [
  { value: 'cash' as AccountType, label: 'Efectivo', icon: <LiaMoneyBillWaveAltSolid color="#4cbc3c" />, color: '#4cbc3c', iconClass: 'fa-money-bill-wave' },
  { value: 'bank_account' as AccountType, label: 'Banco', icon: <PiBankThin color="#6366f1" />, color: '#6366f1', iconClass: 'fa-university' },
  { value: 'debit_card' as AccountType, label: 'Tarjeta', icon: <CiCreditCard2 color="#10b981" />, color: '#10b981', iconClass: 'fa-credit-card' },
  { value: 'digital_wallet' as AccountType, label: 'Digital', icon: <GiSmartphone color="#f59e0b" />, color: '#f59e0b', iconClass: 'fa-mobile-alt' },
  { value: 'savings' as AccountType, label: 'Ahorros', icon: <PiPiggyBankLight color="#ef4444" />, color: '#ef4444', iconClass: 'fa-piggy-bank' },
  { value: 'investments' as AccountType, label: 'Inversiones', icon: <PiChartLineUpLight color="#8b5cf6" />, color: '#8b5cf6', iconClass: 'fa-chart-line' }
];

const monedas = [
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Libra esterlina' }
];

export default function EditAccountModal({ account, onClose, onSaved }: EditAccountModalProps) {
  const [formData, setFormData] = useState<NewAccount>({
    name: account.name,
    type: account.type,
    balance: account.balance,
    currency: account.currency,
    color: account.color,
    is_default: account.is_default,
    icon: account.icon || undefined,
    bank_name: account.bank_name || undefined,
    last_four_digits: account.last_four_digits || undefined
  });
  const [selectedAccountType, setSelectedAccountType] = useState<string>(account.type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountType) {
      setError('Por favor selecciona un tipo de cuenta');
      return;
    }

    if (!formData.name.trim()) {
      setError('Por favor ingresa un nombre para la cuenta');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No hay sesión activa');
        return;
      }

      const result = await updateAccount(account.id, session.user.id, formData);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError('Error al actualizar la cuenta');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div 
        className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-700 shadow-2xl"
        style={{ background: "var(--background-gradient)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
          <h2 className="text-lg sm:text-xl font-medium text-white">Editar Cuenta</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Tipos de cuenta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Tipo de cuenta *</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AccountTypeOptions.map((option) => {
                const isSelected = selectedAccountType === option.value;
                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => { 
                      setSelectedAccountType(option.value); 
                      setFormData({ ...formData, type: option.value, color: option.color, icon: option.iconClass }); 
                    }}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ' ') { 
                        setSelectedAccountType(option.value); 
                        setFormData({ ...formData, type: option.value, color: option.color, icon: option.iconClass }); 
                      } 
                    }}
                    className={`relative overflow-hidden flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                      isSelected 
                        ? 'bg-zinc-800/70 border-zinc-600 shadow-lg' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '3px',
                          background: option.color,
                          pointerEvents: 'none',
                        }}
                      ></div>
                    )}
                    <div className="text-2xl relative z-10">
                      {option.icon}
                    </div>
                    <div className={`text-xs mt-1.5 relative z-10 text-center leading-tight font-medium ${
                      isSelected ? 'text-white' : 'text-zinc-400'
                    }`}>
                      {option.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nombre de la cuenta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nombre de la cuenta *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              placeholder="Ej: Cuenta Principal"
              required
            />
          </div>

          {/* Balance */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Balance actual *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              placeholder="0.00"
              required
            />
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Moneda *
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              required
            >
              {monedas.map((moneda) => (
                <option key={moneda.value} value={moneda.value} className="bg-zinc-900">
                  {moneda.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre del banco (opcional) */}
          {(formData.type === 'bank_account' || formData.type === 'debit_card' || formData.type === 'credit_card') && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre del banco (opcional)
              </label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="Ej: BBVA"
              />
            </div>
          )}

          {/* Últimos 4 dígitos (opcional) */}
          {(formData.type === 'debit_card' || formData.type === 'credit_card') && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Últimos 4 dígitos (opcional)
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.last_four_digits || ''}
                onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="1234"
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors font-medium border border-zinc-700"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Guardando...
                </span>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
