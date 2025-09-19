import { supabase } from './client';
import { Account, NewAccount, AccountResult } from '../../types/types';

/**
 * Obtiene todas las cuentas del usuario
 */
export async function getUserAccounts(userId: string): Promise<AccountResult> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data as Account[] };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener las cuentas' } };
  }
}

/**
 * Obtiene la cuenta por defecto del usuario
 */
export async function getDefaultAccount(userId: string): Promise<AccountResult> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return { data: data as Account };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener la cuenta por defecto' } };
  }
}

/**
 * Crea una nueva cuenta
 */
export async function createAccount(userId: string, account: NewAccount): Promise<AccountResult> {
  try {
    // Si esta cuenta va a ser la por defecto, primero removemos el default de las otras
    if (account.is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: userId,
          name: account.name,
          type: account.type,
          balance: account.balance || 0,
          currency: account.currency || 'USD',
          is_default: account.is_default || false,
          is_active: true,
          icon: account.icon || null,
          color: account.color || '#6366f1',
          bank_name: account.bank_name || null,
          last_four_digits: account.last_four_digits || null,
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Account };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al crear la cuenta' } };
  }
}

/**
 * Actualiza una cuenta existente
 */
export async function updateAccount(
  accountId: string,
  userId: string,
  updates: Partial<NewAccount>
): Promise<AccountResult> {
  try {
    // Si estamos marcando esta cuenta como default, removemos el default de las otras
    if (updates.is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', accountId);
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({
        name: updates.name,
        type: updates.type,
        balance: updates.balance,
        currency: updates.currency,
        is_default: updates.is_default,
        icon: updates.icon,
        color: updates.color,
        bank_name: updates.bank_name,
        last_four_digits: updates.last_four_digits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Account };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al actualizar la cuenta' } };
  }
}

/**
 * Actualiza el balance de una cuenta
 */
export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalance: number
): Promise<AccountResult> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Account };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al actualizar el balance' } };
  }
}

/**
 * Ajusta el balance de una cuenta (suma o resta un monto)
 */
export async function adjustAccountBalance(
  accountId: string,
  userId: string,
  amount: number
): Promise<AccountResult> {
  try {
    // Primero obtenemos el balance actual
    const { data: account } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    const newBalance = account.balance + amount;

    return await updateAccountBalance(accountId, userId, newBalance);
  } catch (error: any) {
    return { error: { message: error.message || 'Error al ajustar el balance' } };
  }
}

/**
 * Desactiva una cuenta (eliminación suave)
 */
export async function deactivateAccount(
  accountId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    // Verificamos que no sea la cuenta por defecto
    const { data: account } = await supabase
      .from('accounts')
      .select('is_default')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (account?.is_default) {
      throw new Error('No se puede desactivar la cuenta por defecto');
    }

    const { error } = await supabase
      .from('accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
    return {};
  } catch (error: any) {
    return { error: { message: error.message || 'Error al desactivar la cuenta' } };
  }
}

/**
 * Elimina permanentemente una cuenta
 */
export async function deleteAccount(
  accountId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    // Verificamos que no sea la cuenta por defecto
    const { data: account } = await supabase
      .from('accounts')
      .select('is_default')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (account?.is_default) {
      throw new Error('No se puede eliminar la cuenta por defecto');
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
    return {};
  } catch (error: any) {
    return { error: { message: error.message || 'Error al eliminar la cuenta' } };
  }
}

/**
 * Establece una cuenta como la por defecto
 */
export async function setDefaultAccount(
  accountId: string,
  userId: string
): Promise<AccountResult> {
  try {
    // Primero removemos el default de todas las cuentas
    await supabase
      .from('accounts')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Luego establecemos la nueva cuenta como default
    const { data, error } = await supabase
      .from('accounts')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Account };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al establecer cuenta por defecto' } };
  }
}

/**
 * Obtiene el balance total de todas las cuentas activas
 */
export async function getTotalBalance(userId: string): Promise<{ data?: number; error?: { message: string } }> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    const total = data?.reduce((sum, account) => sum + account.balance, 0) || 0;
    return { data: total };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al calcular el balance total' } };
  }
}