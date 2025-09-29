import React from 'react';
import { FiPlus, FiCreditCard, FiDollarSign, FiPieChart, FiTrendingUp, FiZap } from 'react-icons/fi';

// Datos de ejemplo para las cuentas
const sampleAccounts = [
  {
    id: 1,
    name: 'Cuenta Principal',
    type: 'checking',
    balance: 12500.75,
    currency: 'USD',
    color: '#3b82f6',
    lastTransaction: 'Hace 2 horas'
  },
  {
    id: 2,
    name: 'Ahorros',
    type: 'savings',
    balance: 8500.30,
    currency: 'USD',
    color: '#10b981',
    lastTransaction: 'Ayer'
  },
  {
    id: 3,
    name: 'Tarjeta de Crédito',
    type: 'credit',
    balance: -1250.40,
    currency: 'USD',
    color: '#ef4444',
    lastTransaction: 'Hoy'
  },
  {
    id: 4,
    name: 'Inversiones',
    type: 'investment',
    balance: 25300.00,
    currency: 'USD',
    color: '#8b5cf6',
    lastTransaction: 'Hace 3 días'
  },
  {
    id: 5,
    name: 'Efectivo',
    type: 'cash',
    balance: 350.00,
    currency: 'USD',
    color: '#f59e0b',
    lastTransaction: 'Hace 1 semana'
  }
];

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'checking':
      return <FiCreditCard className="text-xl" />;
    case 'savings':
      return <FiTrendingUp className="text-xl" />;
    case 'credit':
      return <FiCreditCard className="text-xl" />;
    case 'investment':
      return <FiPieChart className="text-xl" />;
    case 'cash':
      return <FiDollarSign className="text-xl" />;
    default:
      return <FiZap className="text-xl" />;
  }
};

export default function AccountsDashboard() {
  const totalBalance = sampleAccounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      {/* <div className="flex justify-between items-center">
        <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <FiPlus />
          <span>Agregar Cuenta</span>
        </button>
      </div> */}

      

      {/* Lista de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleAccounts.map((account) => (
          <div 
            key={account.id} 
            className="bg-white/5 rounded-md shadow overflow-hidden hover:shadow-md transition-shadow"
          >
            <div 
              className="h-1 w-full" 
              style={{ backgroundColor: account.color }}
            />
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg" 
                    style={{ backgroundColor: `${account.color}20` }}
                  >
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-300">{account.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${account.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {account.balance < 0 ? '-' : ''}${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-200">{account.currency}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200 text-xs text-zinc-400">
                Última transacción: {account.lastTransaction}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}