-- Script para verificar los IDs correctos de las categorías
-- Ejecuta esto primero para ver tus IDs reales

SELECT 
    id,
    name,
    type,
    budget_limit,
    user_id,
    is_default
FROM categories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' 
   OR is_default = true
ORDER BY name;

-- Resultado esperado:
-- Deberías ver 6 categorías con sus IDs reales
-- Copia esos IDs y actualiza el script principal
