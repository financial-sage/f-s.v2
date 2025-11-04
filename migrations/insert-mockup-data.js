// Script de utilidad para insertar datos mockup desde JavaScript/TypeScript
// Puedes ejecutar este script con: node migrations/insert-mockup-data.js
// O importarlo en tu aplicación Next.js

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (reemplaza con tus valores)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = '40591552-ace8-489f-ba9c-5372ee5537e8';

// IDs de categorías (actualiza según tu base de datos)
const CATEGORY_IDS = {
  alimentacion: '119ed78d-2e46-4326-bb12-0dbe108165ce',
  transporte: '14f4795d-cfda-484f5-a640-303dc266c4f3',
  entretenimiento: '37d7b0aa-cb04-4313-b59f-50939dab5e7c',
  salud: '3f9bcac2-e2e6-456ec-96bf-6da238c325ef',
  compras: '4de247f3-6abd-4811-bdee-d68301a542d',
  hogar: 'ca1d34ea-4c89-4826-b03c-88ae3d54a231'
};

// Datos de subcategorías
const subcategories = [
  // Alimentación
  { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', category_id: CATEGORY_IDS.alimentacion, name: 'Supermercado' },
  { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', category_id: CATEGORY_IDS.alimentacion, name: 'Restaurantes' },
  { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f', category_id: CATEGORY_IDS.alimentacion, name: 'Café y snacks' },
  
  // Transporte
  { id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', category_id: CATEGORY_IDS.transporte, name: 'Gasolina' },
  { id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', category_id: CATEGORY_IDS.transporte, name: 'Mantenimiento' },
  { id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d70', category_id: CATEGORY_IDS.transporte, name: 'Estacionamiento' },
  { id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d71', category_id: CATEGORY_IDS.transporte, name: 'Seguro auto' },
  
  // Entretenimiento
  { id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', category_id: CATEGORY_IDS.entretenimiento, name: 'Cine' },
  { id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', category_id: CATEGORY_IDS.entretenimiento, name: 'Streaming' },
  { id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', category_id: CATEGORY_IDS.entretenimiento, name: 'Conciertos' },
  { id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e82', category_id: CATEGORY_IDS.entretenimiento, name: 'Hobbies' },
  
  // Salud
  { id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', category_id: CATEGORY_IDS.salud, name: 'Médico general' },
  { id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', category_id: CATEGORY_IDS.salud, name: 'Medicamentos' },
  { id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f82', category_id: CATEGORY_IDS.salud, name: 'Dentista' },
  { id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f83', category_id: CATEGORY_IDS.salud, name: 'Gimnasio' },
  
  // Compras
  { id: 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', category_id: CATEGORY_IDS.compras, name: 'Ropa' },
  { id: 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8092', category_id: CATEGORY_IDS.compras, name: 'Zapatos' },
  { id: 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8093', category_id: CATEGORY_IDS.compras, name: 'Accesorios' },
  
  // Hogar
  { id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', category_id: CATEGORY_IDS.hogar, name: 'Renta/Hipoteca' },
  { id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', category_id: CATEGORY_IDS.hogar, name: 'Electricidad' },
  { id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', category_id: CATEGORY_IDS.hogar, name: 'Agua' },
  { id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', category_id: CATEGORY_IDS.hogar, name: 'Internet' },
  { id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809205', category_id: CATEGORY_IDS.hogar, name: 'Gas' }
];

// Función para crear subcategorías
async function createSubcategories() {
  console.log('📝 Creando subcategorías...');
  
  const subcategoriesWithUserId = subcategories.map(sub => ({
    ...sub,
    user_id: USER_ID
  }));

  const { data, error } = await supabase
    .from('subcategories')
    .insert(subcategoriesWithUserId)
    .select();

  if (error) {
    console.error('❌ Error creando subcategorías:', error);
    return false;
  }

  console.log(`✅ ${data.length} subcategorías creadas`);
  return true;
}

// Función para actualizar presupuestos
async function updateBudgets() {
  console.log('💰 Actualizando presupuestos...');

  const budgets = [
    { id: CATEGORY_IDS.alimentacion, budget_limit: 500 },
    { id: CATEGORY_IDS.transporte, budget_limit: 300 },
    { id: CATEGORY_IDS.entretenimiento, budget_limit: 200 },
    { id: CATEGORY_IDS.salud, budget_limit: 250 },
    { id: CATEGORY_IDS.compras, budget_limit: 150 },
    { id: CATEGORY_IDS.hogar, budget_limit: 800 }
  ];

  for (const budget of budgets) {
    const { error } = await supabase
      .from('categories')
      .update({ budget_limit: budget.budget_limit })
      .eq('id', budget.id);

    if (error) {
      console.error('❌ Error actualizando presupuesto:', error);
      return false;
    }
  }

  console.log('✅ Presupuestos actualizados');
  return true;
}

// Función para crear transacciones
async function createTransactions() {
  console.log('💳 Creando transacciones...');

  const transactions = [
    // Alimentación - Supermercado
    { amount: 85.50, description: 'Compra semanal en supermercado', category_id: CATEGORY_IDS.alimentacion, subcategory_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', date: '2025-11-02T10:30:00' },
    { amount: 92.30, description: 'Supermercado - frutas y verduras', category_id: CATEGORY_IDS.alimentacion, subcategory_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', date: '2025-11-05T14:20:00' },
    { amount: 78.90, description: 'Compra de despensa', category_id: CATEGORY_IDS.alimentacion, subcategory_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', date: '2025-11-08T16:45:00' },
    
    // Alimentación - Restaurantes
    { amount: 45.00, description: 'Cena en restaurante', category_id: CATEGORY_IDS.alimentacion, subcategory_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', date: '2025-11-01T20:30:00' },
    { amount: 38.50, description: 'Almuerzo con amigos', category_id: CATEGORY_IDS.alimentacion, subcategory_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', date: '2025-11-04T13:15:00' },
    
    // Transporte - Gasolina
    { amount: 55.00, description: 'Gasolina estación Shell', category_id: CATEGORY_IDS.transporte, subcategory_id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', date: '2025-11-02T07:30:00' },
    { amount: 48.50, description: 'Tanque lleno', category_id: CATEGORY_IDS.transporte, subcategory_id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', date: '2025-11-07T18:00:00' },
    
    // Transporte - Mantenimiento
    { amount: 120.00, description: 'Cambio de aceite y filtros', category_id: CATEGORY_IDS.transporte, subcategory_id: 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', date: '2025-11-03T09:00:00' },
    
    // Entretenimiento - Streaming
    { amount: 15.99, description: 'Netflix mensual', category_id: CATEGORY_IDS.entretenimiento, subcategory_id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', date: '2025-11-01T00:00:00' },
    { amount: 12.99, description: 'Spotify Premium', category_id: CATEGORY_IDS.entretenimiento, subcategory_id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', date: '2025-11-01T00:00:00' },
    
    // Entretenimiento - Cine
    { amount: 25.00, description: 'Boletos de cine', category_id: CATEGORY_IDS.entretenimiento, subcategory_id: 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', date: '2025-11-02T19:00:00' },
    
    // Salud
    { amount: 50.00, description: 'Consulta médica', category_id: CATEGORY_IDS.salud, subcategory_id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', date: '2025-11-03T09:30:00' },
    { amount: 18.50, description: 'Medicamentos farmacia', category_id: CATEGORY_IDS.salud, subcategory_id: 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', date: '2025-11-04T12:00:00' },
    
    // Compras - Ropa
    { amount: 85.00, description: 'Camisa y pantalón', category_id: CATEGORY_IDS.compras, subcategory_id: 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', date: '2025-11-05T17:00:00' },
    
    // Hogar
    { amount: 500.00, description: 'Pago mensual de renta', category_id: CATEGORY_IDS.hogar, subcategory_id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', date: '2025-11-01T00:00:00' },
    { amount: 95.50, description: 'Recibo de luz', category_id: CATEGORY_IDS.hogar, subcategory_id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', date: '2025-11-02T10:00:00' },
    { amount: 65.00, description: 'Internet fibra óptica', category_id: CATEGORY_IDS.hogar, subcategory_id: 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', date: '2025-11-01T00:00:00' }
  ];

  const transactionsWithUserData = transactions.map(tx => ({
    ...tx,
    user_id: USER_ID,
    type: 'expense',
    status: 'completed'
  }));

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionsWithUserData)
    .select();

  if (error) {
    console.error('❌ Error creando transacciones:', error);
    return false;
  }

  console.log(`✅ ${data.length} transacciones creadas`);
  return true;
}

// Función principal
async function main() {
  console.log('🚀 Iniciando inserción de datos mockup...\n');

  // 1. Crear subcategorías
  const subcatsSuccess = await createSubcategories();
  if (!subcatsSuccess) {
    console.log('⚠️ Saltando subcategorías (pueden ya existir)');
  }

  // 2. Actualizar presupuestos
  const budgetsSuccess = await updateBudgets();
  if (!budgetsSuccess) {
    console.log('❌ Error actualizando presupuestos');
    return;
  }

  // 3. Crear transacciones
  const transactionsSuccess = await createTransactions();
  if (!transactionsSuccess) {
    console.log('❌ Error creando transacciones');
    return;
  }

  console.log('\n✨ ¡Datos mockup insertados exitosamente!');
  console.log('📊 Puedes verificar en: /expenses-tracking');
}

// Ejecutar
main().catch(console.error);

// Exportar funciones para uso en otros archivos
export { createSubcategories, updateBudgets, createTransactions };
