import { supabase } from './client';
import { adjustAccountBalance } from './accounts';
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  subcategory_id?: string | null;
  account_id: string | null;
  destination_account_id?: string | null; // Para transferencias
  date: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'completed' | 'canceled';
  created_at: string;
  source: 'manual' | string;
  external_id: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string | null;
  } | null;
  destination_account?: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string | null;
  } | null;
}

export interface NewTransaction {
  amount: number;
  description?: string;
  category_id?: string;
  subcategory_id?: string;
  account_id?: string;
  destination_account_id?: string; // Para transferencias
  type: 'income' | 'expense' | 'transfer';
  date?: string;
  status?: 'pending' | 'completed' | 'canceled';
  source?: string;
  external_id?: string;
}

export interface TransactionResult {
  data?: Transaction | Transaction[] | TransactionWithCategory | TransactionWithCategory[];
  error?: Error | { message: string } | null;
}

/**
 * Obtiene todas las transacciones del usuario
 */
export async function getUserTransactions(userId: string): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;
    return { data: data as Transaction[] };
  } catch (error: unknown) {
    let message = 'Error al obtener las transacciones';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Obtiene todas las transacciones del usuario con información de categorías y cuentas
 */
export async function getUserTransactionsWithCategories(userId: string): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, color, icon),
        account:accounts!account_id(id, name, type, color, icon),
        destination_account:accounts!destination_account_id(id, name, type, color, icon)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return { data: data as TransactionWithCategory[] };
  } catch (error: unknown) {
    let message = 'Error al obtener las transacciones con categorías y cuentas';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Añade una nueva transacción y actualiza el balance de la cuenta
 */
export async function addTransaction(userId: string, tx: NewTransaction): Promise<TransactionResult> {
  try {
    // Para transferencias, validar que existan ambas cuentas
    if (tx.type === 'transfer') {
      if (!tx.account_id || !tx.destination_account_id) {
        return { error: { message: 'Las transferencias requieren cuenta de origen y destino' } };
      }
      if (tx.account_id === tx.destination_account_id) {
        return { error: { message: 'No se puede transferir a la misma cuenta' } };
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: tx.amount,
          description: tx.description || null,
          category_id: tx.category_id || null,
          subcategory_id: tx.subcategory_id || null,
          account_id: tx.account_id || null,
          destination_account_id: tx.destination_account_id || null,
          type: tx.type,
          date: tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          source: tx.source || 'manual',
          external_id: tx.external_id || null,
        },
      ])
      .select()
      .maybeSingle();
      
    if (error) throw error;

    // Actualizar balances según el tipo de transacción
    if (data && (tx.status === 'completed' || !tx.status)) {
      if (tx.type === 'transfer') {
        // Para transferencias, restar de la cuenta origen y sumar a la cuenta destino
        if (tx.account_id && tx.destination_account_id) {
          await adjustAccountBalance(tx.account_id, userId, -tx.amount); // Restar del origen
          await adjustAccountBalance(tx.destination_account_id, userId, tx.amount); // Sumar al destino
        }
      } else if (tx.account_id) {
        // Para ingresos y gastos normales
        const balanceChange = tx.type === 'income' ? tx.amount : -tx.amount;
        await adjustAccountBalance(tx.account_id, userId, balanceChange);
      }
    }

    return { data: data as Transaction };
  } catch (error: unknown) {
    let message = 'Error al crear la transacción';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Revierte los cambios de balance de una transacción
 */
async function revertTransactionBalance(tx: Transaction, userId: string): Promise<void> {
  if (tx.status !== 'completed') return;
  
  if (tx.type === 'expense' && tx.account_id) {
    // Devolver el dinero a la cuenta (revertir gasto)
    await adjustAccountBalance(tx.account_id, userId, tx.amount);
  } else if (tx.type === 'income' && tx.account_id) {
    // Quitar el dinero de la cuenta (revertir ingreso)
    await adjustAccountBalance(tx.account_id, userId, -tx.amount);
  } else if (tx.type === 'transfer') {
    // Revertir transferencia: devolver a origen, quitar de destino
    if (tx.account_id) {
      await adjustAccountBalance(tx.account_id, userId, tx.amount);
    }
    if (tx.destination_account_id) {
      await adjustAccountBalance(tx.destination_account_id, userId, -tx.amount);
    }
  }
}

/**
 * Aplica los cambios de balance de una transacción
 */
async function applyTransactionBalance(tx: Transaction, userId: string): Promise<void> {
  if (tx.status !== 'completed') return;
  
  if (tx.type === 'expense' && tx.account_id) {
    // Restar dinero de la cuenta
    await adjustAccountBalance(tx.account_id, userId, -tx.amount);
  } else if (tx.type === 'income' && tx.account_id) {
    // Sumar dinero a la cuenta
    await adjustAccountBalance(tx.account_id, userId, tx.amount);
  } else if (tx.type === 'transfer') {
    // Aplicar transferencia: restar de origen, sumar a destino
    if (tx.account_id) {
      await adjustAccountBalance(tx.account_id, userId, -tx.amount);
    }
    if (tx.destination_account_id) {
      await adjustAccountBalance(tx.destination_account_id, userId, tx.amount);
    }
  }
}

/**
 * Actualiza una transacción existente (sin ajuste de balance)
 */
export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<NewTransaction>
): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('user_id', userId) // Seguridad adicional
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Transaction };
  } catch (error: unknown) {
    let message = 'Error al actualizar la transacción';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Actualiza una transacción con ajuste automático de balances
 * Revierte los cambios de la transacción original y aplica los nuevos
 */
export async function updateTransactionWithBalanceAdjustment(
  transactionId: string,
  userId: string,
  updates: Partial<NewTransaction>
): Promise<TransactionResult> {
  try {
    // 1. Obtener transacción original
    const { data: original, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!original) throw new Error('Transacción no encontrada');

    // 2. Validaciones básicas
    if (updates.type && updates.type !== original.type) {
      throw new Error('No se puede cambiar el tipo de transacción');
    }

    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    // Validación especial para transferencias
    if (original.type === 'transfer') {
      const newAccountId = updates.account_id || original.account_id;
      const newDestinationId = updates.destination_account_id || original.destination_account_id;
      if (newAccountId === newDestinationId) {
        throw new Error('No se puede transferir a la misma cuenta');
      }
    }

    // 3. REVERTIR balances de la transacción original
    await revertTransactionBalance(original as Transaction, userId);

    // 4. ACTUALIZAR transacción en la base de datos
    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) throw new Error('Error al actualizar la transacción');

    // 5. APLICAR nuevos balances
    await applyTransactionBalance(updated as Transaction, userId);

    return { data: updated as Transaction };
  } catch (error: unknown) {
    let message = 'Error al actualizar la transacción';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Elimina una transacción (sin ajuste de balance - uso interno)
 */
export async function deleteTransaction(
  transactionId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId); // Seguridad adicional

    if (error) throw error;
    return {};
  } catch (error: unknown) {
    let message = 'Error al eliminar la transacción';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Elimina una transacción con ajuste automático de balances
 * Esta función:
 * 1. Obtiene la transacción original
 * 2. Revierte los cambios de balance que hizo
 * 3. Elimina la transacción de la base de datos
 */
export async function deleteTransactionWithBalanceAdjustment(
  transactionId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    // 1. Obtener la transacción original
    const { data: original, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!original) throw new Error('Transacción no encontrada');

    // 2. Revertir los balances de la transacción
    await revertTransactionBalance(original as Transaction, userId);

    // 3. Eliminar la transacción
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return {};
  } catch (error: unknown) {
    let message = 'Error al eliminar la transacción';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Obtiene el gasto total por categoría para el usuario
 */
export async function getCategoryExpenses(userId: string): Promise<{ data?: Record<string, number>; error?: { message: string } }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('status', 'completed');

    if (error) throw error;

    // Agrupa por categoría y suma los gastos
    const categoryExpenses: Record<string, number> = {};
    data?.forEach((transaction) => {
      if (transaction.category_id) {
        categoryExpenses[transaction.category_id] = 
          (categoryExpenses[transaction.category_id] || 0) + Math.abs(transaction.amount);
      }
    });

    return { data: categoryExpenses };
  } catch (error: unknown) {
    let message = 'Error al obtener gastos por categoría';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Crea una transferencia entre cuentas del usuario
 */
export async function createTransfer(
  userId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description?: string
): Promise<TransactionResult> {
  return addTransaction(userId, {
    type: 'transfer',
    amount,
    description: description || `Transferencia de cuenta a cuenta`,
    account_id: fromAccountId,
    destination_account_id: toAccountId,
  });
}
