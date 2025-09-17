import { supabase } from './client';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  budget_limit: number | null;
  is_default: boolean;
}

export interface NewCategory {
  name: string;
  color: string;
  budget_limit?: number;
}

export interface CategoryResult {
  data?: Category | Category[];
  error?: Error | { message: string } | null;
}

/**
 * Obtiene todas las categorías del usuario
 */
export async function getUserCategories(userId: string): Promise<CategoryResult> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data as Category[] };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al obtener las categorías' } };
  }
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(userId: string, category: NewCategory): Promise<CategoryResult> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: userId,
          name: category.name,
          color: category.color,
          budget_limit: category.budget_limit || null,
          is_default: false, // Las categorías creadas por usuarios nunca son por defecto
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Category };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al crear la categoría' } };
  }
}

/**
 * Actualiza una categoría existente
 */
export async function updateCategory(
  categoryId: string,
  userId: string,
  updates: Partial<NewCategory>
): Promise<CategoryResult> {
  try {
    // Verificamos primero si la categoría es por defecto
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('is_default')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCategory?.is_default) {
      throw new Error('No se pueden modificar las categorías por defecto');
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: updates.name,
        color: updates.color,
        budget_limit: updates.budget_limit,
      })
      .eq('id', categoryId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as Category };
  } catch (error: any) {
    return { error: { message: error.message || 'Error al actualizar la categoría' } };
  }
}

/**
 * Elimina una categoría
 */
export async function deleteCategory(
  categoryId: string,
  userId: string
): Promise<{ error?: { message: string } }> {
  try {
    // Primero verificamos que no sea una categoría por defecto
    const { data: category } = await supabase
      .from('categories')
      .select('is_default')
      .eq('id', categoryId)
      .maybeSingle();

    if (category?.is_default) {
      throw new Error('No se pueden eliminar categorías por defecto');
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
    return {};
  } catch (error: any) {
    return { error: { message: error.message || 'Error al eliminar la categoría' } };
  }
}
