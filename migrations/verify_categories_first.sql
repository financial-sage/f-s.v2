-- Script SEGURO con verificación de categorías existentes
-- User ID: 40591552-ace8-489f-ba9c-5372ee5537e8

-- =====================================================
-- PASO 1: VERIFICAR CATEGORÍAS EXISTENTES
-- =====================================================
DO $$
DECLARE
    cat_alimentacion UUID;
    cat_transporte UUID;
    cat_entretenimiento UUID;
    cat_salud UUID;
    cat_compras UUID;
    cat_hogar UUID;
BEGIN
    -- Buscar categorías por nombre
    SELECT id INTO cat_alimentacion FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND LOWER(name) LIKE '%aliment%' LIMIT 1;
    
    SELECT id INTO cat_transporte FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND LOWER(name) LIKE '%transport%' LIMIT 1;
    
    SELECT id INTO cat_entretenimiento FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND LOWER(name) LIKE '%entret%' LIMIT 1;
    
    SELECT id INTO cat_salud FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND LOWER(name) LIKE '%salud%' LIMIT 1;
    
    SELECT id INTO cat_compras FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND (LOWER(name) LIKE '%compra%' OR LOWER(name) LIKE '%ropa%') LIMIT 1;
    
    SELECT id INTO cat_hogar FROM categories 
    WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true) 
    AND LOWER(name) LIKE '%hogar%' LIMIT 1;

    -- Mostrar IDs encontrados
    RAISE NOTICE 'Categorías encontradas:';
    RAISE NOTICE 'Alimentación: %', cat_alimentacion;
    RAISE NOTICE 'Transporte: %', cat_transporte;
    RAISE NOTICE 'Entretenimiento: %', cat_entretenimiento;
    RAISE NOTICE 'Salud: %', cat_salud;
    RAISE NOTICE 'Compras: %', cat_compras;
    RAISE NOTICE 'Hogar: %', cat_hogar;
    
    -- Verificar si todas existen
    IF cat_alimentacion IS NULL THEN
        RAISE EXCEPTION 'No se encontró categoría de Alimentación';
    END IF;
    
    IF cat_transporte IS NULL THEN
        RAISE EXCEPTION 'No se encontró categoría de Transporte';
    END IF;
    
    -- Continuar con verificaciones...
    
END $$;

-- =====================================================
-- INSTRUCCIONES:
-- =====================================================
-- 1. Ejecuta SOLO este bloque de verificación primero
-- 2. Verifica que los IDs mostrados sean correctos
-- 3. Si alguno falta, crea la categoría antes de continuar
-- 4. Luego ejecuta el script completo con los IDs correctos
