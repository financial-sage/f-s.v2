import { supabase } from './client';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  date: string;
  type: 'income' | 'expense';
  status: 'pending' | 'completed' | 'canceled';
  created_at: string;
  source: 'manual' | string;
  external_id: string | null;
}

export interface NewTransaction {
  amount: number;
  description?: string;
  category_id?: string;
  type: 'income' | 'expense';
  date?: string;
  status?: 'pending' | 'completed' | 'canceled';
  source?: string;
  external_id?: string;
}

export interface TransactionResult {
  data?: Transaction | Transaction[];
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
 * Añade una nueva transacción
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
          type: tx.type,
          date: tx.date || new Date().toISOString(),
          status: tx.status || 'completed',
          source: tx.source || 'manual',
          external_id: tx.external_id || null,
        },
      ])
      .select()
      .maybeSingle();
      console.log(data, error);
      
    if (error) throw error;
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
