-- Script de datos mockup CORREGIDO con IDs reales
-- User ID: 40591552-ace8-489f-ba9c-5372ee5537e8
-- Fecha: Noviembre 2025

-- =====================================================
-- CATEGORÍAS DISPONIBLES:
-- =====================================================
-- 4de247f3-6abd-4811-bdee-d683018a542d → Ahorros
-- 37d7b0aa-cb04-4313-b59f-50939dab5e7c → Gasolina
-- 3f9bcac2-e2e6-45ec-95bf-6da238c325ef → Juegos
-- 119ed78d-2e46-4326-bb12-0dbe108165ce → Juegos (duplicado)
-- 14f4795d-cfda-4845-a640-303dc266c4f3 → Nómina
-- ca1d34ea-4c89-4826-b03c-88ae3d54a231 → Rest.

-- =====================================================
-- 1. CREAR SUBCATEGORÍAS
-- =====================================================

-- Subcategorías para GASOLINA (37d7b0aa-cb04-4313-b59f-50939dab5e7c)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Combustible regular', NOW()),
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Premium', NOW()),
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d70', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Diesel', NOW());

-- Subcategorías para JUEGOS (3f9bcac2-e2e6-45ec-95bf-6da238c325ef)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Videojuegos', NOW()),
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Suscripciones gaming', NOW()),
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Accesorios', NOW());

-- Subcategorías para AHORROS (4de247f3-6abd-4811-bdee-d683018a542d)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', '4de247f3-6abd-4811-bdee-d683018a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Emergencias', NOW()),
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8092', '4de247f3-6abd-4811-bdee-d683018a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Vacaciones', NOW()),
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8093', '4de247f3-6abd-4811-bdee-d683018a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Inversión', NOW());

-- Subcategorías para REST (Restaurantes) (ca1d34ea-4c89-4826-b03c-88ae3d54a231)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Comida rápida', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Restaurantes', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Café', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Delivery', NOW());

-- Subcategorías para JUEGOS (119ed78d-2e46-4326-bb12-0dbe108165ce) - Segunda categoría
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Juegos móviles', NOW()),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Juegos de mesa', NOW());

-- Subcategorías para NÓMINA (14f4795d-cfda-4845-a640-303dc266c4f3)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Salario base', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Bonos', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f82', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Comisiones', NOW());

-- =====================================================
-- 2. ACTUALIZAR PRESUPUESTOS
-- =====================================================

UPDATE categories SET budget_limit = 300.00 WHERE id = '37d7b0aa-cb04-4313-b59f-50939dab5e7c'; -- Gasolina
UPDATE categories SET budget_limit = 150.00 WHERE id = '3f9bcac2-e2e6-45ec-95bf-6da238c325ef'; -- Juegos
UPDATE categories SET budget_limit = 500.00 WHERE id = '4de247f3-6abd-4811-bdee-d683018a542d'; -- Ahorros
UPDATE categories SET budget_limit = 400.00 WHERE id = 'ca1d34ea-4c89-4826-b03c-88ae3d54a231'; -- Restaurantes
UPDATE categories SET budget_limit = 100.00 WHERE id = '119ed78d-2e46-4326-bb12-0dbe108165ce'; -- Juegos 2
UPDATE categories SET budget_limit = 3000.00 WHERE id = '14f4795d-cfda-4845-a640-303dc266c4f3'; -- Nómina

-- =====================================================
-- 3. CREAR TRANSACCIONES - NOVIEMBRE 2025
-- =====================================================

-- GASOLINA (37d7b0aa-cb04-4313-b59f-50939dab5e7c) - Total: ~$320 (107% del presupuesto)
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 55.00, 'Gasolina estación Shell', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-02 07:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 52.50, 'Tanque lleno', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-04 18:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 48.30, 'Gasolina regular', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-06 12:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 60.00, 'Premium para viaje', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '2025-11-08 09:15:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 54.20, 'Gasolina fin de semana', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-09 16:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 50.00, 'Tanque medio', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-10 14:00:00', 'expense', 'completed', NOW());

-- JUEGOS (3f9bcac2-e2e6-45ec-95bf-6da238c325ef) - Total: ~$135 (90% del presupuesto)
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 59.99, 'Juego nuevo PS5', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '2025-11-01 20:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 14.99, 'Xbox Game Pass', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.99, 'PlayStation Plus', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 25.00, 'Control extra', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', '2025-11-05 15:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 19.99, 'Juego indie Steam', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '2025-11-07 19:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 5.04, 'DLC para juego', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '2025-11-09 21:00:00', 'expense', 'completed', NOW());

-- RESTAURANTES (ca1d34ea-4c89-4826-b03c-88ae3d54a231) - Total: ~$385 (96% del presupuesto)
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.50, 'McDonalds almuerzo', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '2025-11-01 13:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 85.00, 'Cena familiar restaurante', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '2025-11-02 20:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 8.50, 'Café Starbucks', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '2025-11-03 09:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 22.00, 'Pizza delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '2025-11-04 21:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.00, 'Subway sándwich', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '2025-11-05 14:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 65.00, 'Cena en italiano', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '2025-11-06 19:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.50, 'Café y pastel', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '2025-11-07 16:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 28.00, 'Sushi delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '2025-11-08 20:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 18.50, 'Burger King', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '2025-11-09 13:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 75.00, 'Almuerzo con clientes', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '2025-11-10 14:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 7.00, 'Café para llevar', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '2025-11-10 08:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 34.00, 'Tacos delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '2025-11-10 21:30:00', 'expense', 'completed', NOW());

-- AHORROS (4de247f3-6abd-4811-bdee-d683018a542d) - Total: ~$0 (sin movimientos, pero tipo 'expense' no aplica)
-- Nota: Esta categoría probablemente sea tipo 'income' o 'transfer', así que no crearemos transacciones de gastos

-- JUEGOS 2 (119ed78d-2e46-4326-bb12-0dbe108165ce) - Total: ~$45 (45% del presupuesto)
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 0.99, 'Compra in-app', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-03 18:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 4.99, 'Juego móvil premium', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-05 12:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 39.00, 'Juego de mesa Catan', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '2025-11-08 16:00:00', 'expense', 'completed', NOW());

-- NÓMINA (14f4795d-cfda-4845-a640-303dc266c4f3) - Esta es ingreso, no gasto
-- No crear transacciones de expense para esta categoría

-- =====================================================
-- RESUMEN DE GASTOS
-- =====================================================
-- Gasolina:      ~$320 / $300  (107%) 🔴 Sobrepasado
-- Juegos:        ~$135 / $150  (90%)  🟡 Alto uso
-- Restaurantes:  ~$385 / $400  (96%)  🟡 Cerca del límite
-- Juegos 2:      ~$45  / $100  (45%)  🟢 Bajo uso
-- Ahorros:       N/A (categoría de ahorro)
-- Nómina:        N/A (categoría de ingreso)
-- =====================================================
-- TOTAL PRESUPUESTO GASTOS: $950
-- TOTAL GASTADO:            ~$885 (93%)
-- =====================================================

-- Verificar los datos insertados
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    COUNT(DISTINCT s.id) AS num_subcategorias,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado,
    CASE 
        WHEN c.budget_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / c.budget_limit * 100), 2)
        ELSE 0
    END AS porcentaje_usado
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id AND s.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
LEFT JOIN transactions t ON t.category_id = c.id 
    AND t.type = 'expense' 
    AND t.status = 'completed'
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
WHERE c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR c.is_default = true
GROUP BY c.id, c.name, c.budget_limit
ORDER BY c.name;
