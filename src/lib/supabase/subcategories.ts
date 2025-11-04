import { supabase } from './client';
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Subcategory {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface SubcategoryWithExpenses extends Subcategory {
  total_expenses: number;
}

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  budget_limit: number | null;
  type: string;
  total_expenses: number;
  subcategories: SubcategoryWithExpenses[];
}

/**
 * Obtiene las subcategorías de una categoría específica
 */
export async function getCategorySubcategories(
  categoryId: string,
  userId: string
): Promise<{ data?: Subcategory[]; error?: { message: string } }> {
  try {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data as Subcategory[] };
  } catch (error: unknown) {
    let message = 'Error al obtener subcategorías';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Obtiene los gastos por subcategoría para el mes actual
 */
export async function getSubcategoryExpenses(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ data?: Record<string, number>; error?: { message: string } }> {
  try {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('transactions')
      .select('subcategory_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('status', 'completed')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (error) throw error;

    // Agrupa por subcategoría y suma los gastos
    const subcategoryExpenses: Record<string, number> = {};
    data?.forEach((transaction) => {
      if (transaction.subcategory_id) {
        subcategoryExpenses[transaction.subcategory_id] = 
          (subcategoryExpenses[transaction.subcategory_id] || 0) + Math.abs(transaction.amount);
      }
    });

    return { data: subcategoryExpenses };
  } catch (error: unknown) {
    let message = 'Error al obtener gastos por subcategoría';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Obtiene todas las categorías con sus subcategorías y gastos
 */
export async function getCategoriesWithSubcategories(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ data?: CategoryWithSubcategories[]; error?: { message: string } }> {
  try {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // Obtener categorías del usuario
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .eq('type', 'expense')
      .order('name', { ascending: true });

    if (categoriesError) throw categoriesError;

    // Obtener todas las subcategorías del usuario
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('user_id', userId);

    if (subcategoriesError) throw subcategoriesError;

    // Obtener todas las transacciones del período
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('category_id, subcategory_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('status', 'completed')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (transactionsError) throw transactionsError;

    // Agrupar gastos por categoría
    const categoryExpenses: Record<string, number> = {};
    const subcategoryExpenses: Record<string, number> = {};

    transactions?.forEach((transaction) => {
      if (transaction.category_id) {
        categoryExpenses[transaction.category_id] = 
          (categoryExpenses[transaction.category_id] || 0) + Math.abs(transaction.amount);
      }
      if (transaction.subcategory_id) {
        subcategoryExpenses[transaction.subcategory_id] = 
          (subcategoryExpenses[transaction.subcategory_id] || 0) + Math.abs(transaction.amount);
      }
    });

    // Construir resultado combinado
    const result: CategoryWithSubcategories[] = (categories || []).map((category) => {
      const categorySubs = (subcategories || [])
        .filter(sub => sub.category_id === category.id)
        .map(sub => ({
          ...sub,
          total_expenses: subcategoryExpenses[sub.id] || 0
        }));

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon || null,
        budget_limit: category.budget_limit || null,
        type: category.type,
        total_expenses: categoryExpenses[category.id] || 0,
        subcategories: categorySubs
      };
    });

    return { data: result };
  } catch (error: unknown) {
    let message = 'Error al obtener categorías con subcategorías';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Crea una nueva subcategoría
 */
export async function createSubcategory(
  userId: string,
  categoryId: string,
  name: string
): Promise<{ data?: Subcategory; error?: { message: string } }> {
  try {
    const { data, error } = await supabase
      .from('subcategories')
      .insert([
        {
          user_id: userId,
          category_id: categoryId,
          name: name,
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Subcategory };
  } catch (error: unknown) {
    let message = 'Error al crear la subcategoría';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}

/**
 * Elimina una subcategoría
 */
export async function deleteSubcategory(
  subcategoryId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId)
      .eq('user_id', userId);

    if (error) throw error;
    return {};
  } catch (error: unknown) {
    let message = 'Error al eliminar la subcategoría';
    if (error instanceof Error) message = error.message;
    return { error: { message } };
  }
}
