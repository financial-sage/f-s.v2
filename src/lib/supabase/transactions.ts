import { supabase } from './client';
import { adjustAccountBalance } from './accounts';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  account_id: string | null;
  date: string;
  type: 'income' | 'expense';
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
}

export interface NewTransaction {
  amount: number;
  description?: string;
  category_id?: string;
  account_id?: string;
  type: 'income' | 'expense';
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
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener las transacciones' } };
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
        account:accounts(id, name, type, color, icon)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return { data: data as TransactionWithCategory[] };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener las transacciones con categorías y cuentas' } };
  }
}

/**
 * Añade una nueva transacción y actualiza el balance de la cuenta
 */
export async function addTransaction(userId: string, tx: NewTransaction): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: tx.amount,
          description: tx.description || null,
          category_id: tx.category_id || null,
          account_id: tx.account_id || null,
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

    // Actualizar el balance de la cuenta si la transacción está completada y hay una cuenta asociada
    if (data && tx.account_id && (tx.status === 'completed' || !tx.status)) {
      const balanceChange = tx.type === 'income' ? tx.amount : -tx.amount;
      await adjustAccountBalance(tx.account_id, userId, balanceChange);
    }

    return { data: data as Transaction };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al crear la transacción' } };
  }
}

/**
 * Actualiza una transacción existente
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
  } catch (error: any) {
    return { error: { message: error.message || 'Error al actualizar la transacción' } };
  }
}

/**
 * Elimina una transacción
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
  } catch (error: any) {
    return { error: { message: error.message || 'Error al eliminar la transacción' } };
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
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener gastos por categoría' } };
  }
}
