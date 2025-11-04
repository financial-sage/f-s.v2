-- Script rápido para agregar datos mockup de Seguimiento de Gastos
-- User ID: 40591552-ace8-489f-ba9c-5372ee5537e8
-- Ejecutar este script en tu base de datos para probar el módulo

-- NOTA: Este script debe ejecutarse después del script principal mockup_expenses_tracking.sql
-- o puede ejecutarse independientemente si ya tienes subcategorías creadas.

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Abre tu cliente de base de datos (pgAdmin, DBeaver, etc.)
-- 2. Conéctate a tu base de datos de Supabase
-- 3. Ejecuta este script completo
-- 4. Navega a /expenses-tracking en tu aplicación
-- 5. Deberías ver todas las categorías con sus gastos
-- =====================================================

-- VERIFICACIÓN RÁPIDA: Ver categorías actuales
SELECT id, name, budget_limit, type 
FROM categories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true
ORDER BY name;

-- VERIFICACIÓN RÁPIDA: Ver subcategorías creadas
SELECT s.id, s.name as subcategoria, c.name as categoria
FROM subcategories s
JOIN categories c ON s.category_id = c.id
WHERE s.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
ORDER BY c.name, s.name;

-- VERIFICACIÓN RÁPIDA: Ver transacciones del mes actual
SELECT 
    DATE(t.date) as fecha,
    c.name as categoria,
    s.name as subcategoria,
    t.description,
    t.amount
FROM transactions t
JOIN categories c ON t.category_id = c.id
LEFT JOIN subcategories s ON t.subcategory_id = s.id
WHERE t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense'
    AND t.status = 'completed'
    AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY t.date DESC;

-- =====================================================
-- CONSULTA PARA VER EL RESUMEN COMPLETO
-- =====================================================
SELECT 
    c.name AS "Categoría",
    c.budget_limit AS "Presupuesto",
    COUNT(DISTINCT s.id) AS "Subcategorías",
    COUNT(DISTINCT t.id) AS "Transacciones",
    COALESCE(SUM(t.amount), 0) AS "Total Gastado",
    c.budget_limit - COALESCE(SUM(t.amount), 0) AS "Disponible",
    ROUND((COALESCE(SUM(t.amount), 0) / NULLIF(c.budget_limit, 0) * 100), 2) AS "% Usado"
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id AND s.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
LEFT JOIN transactions t ON t.category_id = c.id 
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense' 
    AND t.status = 'completed'
    AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
WHERE (c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR c.is_default = true)
    AND c.type = 'expense'
GROUP BY c.id, c.name, c.budget_limit
ORDER BY "% Usado" DESC;

-- =====================================================
-- LIMPIAR DATOS DE PRUEBA (OPCIONAL)
-- =====================================================
-- Descomenta las siguientes líneas si necesitas limpiar los datos de prueba:

/*
-- Eliminar transacciones de prueba
DELETE FROM transactions 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND date >= '2025-11-01'
AND description LIKE '%prueba%' OR description LIKE '%mockup%';

-- Eliminar subcategorías de prueba
DELETE FROM subcategories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';

-- Resetear presupuestos
UPDATE categories 
SET budget_limit = NULL 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';
*/

-- =====================================================
-- AGREGAR MÁS TRANSACCIONES (OPCIONAL)
-- =====================================================
-- Si quieres agregar más transacciones para el mes actual, 
-- descomenta y modifica las siguientes líneas:

/*
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 25.00, 'Nueva compra de prueba', 'ID_CATEGORIA', 'ID_SUBCATEGORIA', NOW(), 'expense', 'completed', NOW());
*/

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Los IDs de las categorías deben coincidir con los de tu base de datos
-- 2. Las subcategorías deben existir antes de crear transacciones
-- 3. Todas las transacciones tienen status 'completed' para que aparezcan en el módulo
-- 4. Las fechas están en noviembre 2025 para coincidir con el mes actual
-- 5. El presupuesto total es de $2,200 y el gasto total es ~$2,030
