-- =====================================================
-- Script de datos mockup CON CUENTAS ASIGNADAS
-- User ID: 40591552-ace8-489f-ba9c-5372ee5537e8
-- Período: Octubre y Noviembre 2025
-- =====================================================

-- CUENTAS DISPONIBLES:
-- 275d1d6a-7871-4880-958b-eb3ef883a5d1 → Cuenta bancaria (Caixa)
-- b2355b14-ce12-4957-aab7-3acd442b9ff5 → Inversion Caixa
-- 29dc9b99-8c59-45c4-87d3-fbe2c883af59 → Tyba
-- 19fbf3dc-2b6e-43c5-b514-3e407caee114 → Efectivo
-- ebfd47a1-d2ba-477b-94b4-a03b24a13b0b → Cuenta Secundaria (BBVA)
-- e9dd5c12-3bd3-490b-b910-300751b6e160 → Fondo de emergencia

-- CATEGORÍAS DISPONIBLES:
-- 4de247f3-6abd-4811-bdee-d683018a542d → Ahorros
-- 37d7b0aa-cb04-4313-b59f-50939dab5e7c → Gasolina
-- 3f9bcac2-e2e6-45ec-95bf-6da238c325ef → Juegos
-- 119ed78d-2e46-4326-bb12-0dbe108165ce → Juegos (duplicado)
-- 14f4795d-cfda-4845-a640-303dc266c4f3 → Nómina
-- ca1d34ea-4c89-4826-b03c-88ae3d54a231 → Rest.

-- =====================================================
-- PASO 1: LIMPIAR DATOS EXISTENTES
-- =====================================================

-- Eliminar transacciones existentes del usuario (octubre y noviembre 2025)
DELETE FROM transactions 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND date >= '2025-10-01' 
AND date < '2025-12-01';

-- Eliminar subcategorías existentes
DELETE FROM subcategories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';

-- =====================================================
-- PASO 2: CREAR SUBCATEGORÍAS
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

-- Subcategorías para RESTAURANTES (ca1d34ea-4c89-4826-b03c-88ae3d54a231)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Comida rápida', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Restaurantes', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Café', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Delivery', NOW());

-- Subcategorías para JUEGOS 2 (119ed78d-2e46-4326-bb12-0dbe108165ce)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Juegos móviles', NOW()),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Juegos de mesa', NOW());

-- Subcategorías para NÓMINA (14f4795d-cfda-4845-a640-303dc266c4f3)
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Salario base', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Bonos', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f82', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Comisiones', NOW());

-- =====================================================
-- PASO 3: ACTUALIZAR PRESUPUESTOS
-- =====================================================

UPDATE categories SET budget_limit = 350.00 WHERE id = '37d7b0aa-cb04-4313-b59f-50939dab5e7c'; -- Gasolina
UPDATE categories SET budget_limit = 200.00 WHERE id = '3f9bcac2-e2e6-45ec-95bf-6da238c325ef'; -- Juegos
UPDATE categories SET budget_limit = 600.00 WHERE id = '4de247f3-6abd-4811-bdee-d683018a542d'; -- Ahorros
UPDATE categories SET budget_limit = 450.00 WHERE id = 'ca1d34ea-4c89-4826-b03c-88ae3d54a231'; -- Restaurantes
UPDATE categories SET budget_limit = 80.00 WHERE id = '119ed78d-2e46-4326-bb12-0dbe108165ce'; -- Juegos 2
UPDATE categories SET budget_limit = 3500.00 WHERE id = '14f4795d-cfda-4845-a640-303dc266c4f3'; -- Nómina

-- =====================================================
-- PASO 4: CREAR TRANSACCIONES - OCTUBRE 2025
-- =====================================================

-- === GASOLINA - OCTUBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 52.00, 'Shell - Tanque lleno', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-03 08:15:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 48.50, 'Gasolina regular', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-08 18:30:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 45.00, 'Estación de servicio', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-12 14:00:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 55.00, 'Premium para viaje', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-16 09:00:00', 'expense', 'completed', NOW()),
-- Cuenta Secundaria BBVA
('40591552-ace8-489f-ba9c-5372ee5537e8', 50.00, 'Gasolina fin de semana', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-10-19 16:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 53.50, 'Tanque medio', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-10-23 12:30:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 49.00, 'Regular estación', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-27 19:00:00', 'expense', 'completed', NOW());
-- TOTAL OCTUBRE GASOLINA: $353.00

-- === JUEGOS - OCTUBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa (débito automático)
('40591552-ace8-489f-ba9c-5372ee5537e8', 14.99, 'Xbox Game Pass', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-01 00:05:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.99, 'PlayStation Plus', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-01 00:10:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 59.99, 'Baldurs Gate 3', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-05 20:00:00', 'expense', 'completed', NOW()),
-- Cuenta Secundaria BBVA
('40591552-ace8-489f-ba9c-5372ee5537e8', 39.99, 'Call of Duty', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-10-12 19:30:00', 'expense', 'completed', NOW()),
-- Efectivo (tienda física)
('40591552-ace8-489f-ba9c-5372ee5537e8', 29.99, 'Control inalámbrico', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-18 15:00:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 19.99, 'Hollow Knight', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-22 21:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.99, 'DLC Elden Ring', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-28 18:00:00', 'expense', 'completed', NOW());
-- TOTAL OCTUBRE JUEGOS: $187.93

-- === RESTAURANTES - OCTUBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 85.00, 'Cena familiar La Terraza', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-02 20:30:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.50, 'McDonalds almuerzo', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-04 13:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 8.50, 'Café Starbucks', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-05 09:00:00', 'expense', 'completed', NOW()),
-- Cuenta Secundaria BBVA
('40591552-ace8-489f-ba9c-5372ee5537e8', 22.00, 'Pizza delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-10-06 21:00:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.00, 'Subway sándwich', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-09 14:00:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 72.00, 'Restaurante italiano', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-11 19:30:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.50, 'Café y pastel', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-13 16:00:00', 'expense', 'completed', NOW()),
-- Cuenta Secundaria BBVA
('40591552-ace8-489f-ba9c-5372ee5537e8', 28.00, 'Sushi delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-10-14 20:00:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 18.50, 'Burger King', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-16 13:30:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 95.00, 'Almuerzo con clientes', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-18 14:00:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 7.00, 'Café para llevar', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-20 08:00:00', 'expense', 'completed', NOW()),
-- Tyba (billetera digital)
('40591552-ace8-489f-ba9c-5372ee5537e8', 34.00, 'Tacos delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '29dc9b99-8c59-45c4-87d3-fbe2c883af59', '2025-10-22 21:30:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 42.00, 'Brunch fin de semana', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-25 11:00:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 11.00, 'Donuts Krispy Kreme', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-27 17:00:00', 'expense', 'completed', NOW()),
-- Tyba
('40591552-ace8-489f-ba9c-5372ee5537e8', 26.00, 'Hamburguesas delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '29dc9b99-8c59-45c4-87d3-fbe2c883af59', '2025-10-29 20:00:00', 'expense', 'completed', NOW());
-- TOTAL OCTUBRE RESTAURANTES: $486.00

-- === JUEGOS 2 - OCTUBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 0.99, 'Compra in-app Candy Crush', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-07 18:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 4.99, 'Monument Valley 2', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-14 12:00:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 45.00, 'Juego de mesa Ticket to Ride', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-10-20 16:00:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 2.99, 'Stardew Valley móvil', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-10-26 20:00:00', 'expense', 'completed', NOW());
-- TOTAL OCTUBRE JUEGOS 2: $53.97

-- =====================================================
-- PASO 5: CREAR TRANSACCIONES - NOVIEMBRE 2025
-- =====================================================

-- === GASOLINA - NOVIEMBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 55.00, 'Shell - Primera carga del mes', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-11-02 07:30:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 40.00, 'Gasolina regular', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-11-04 18:00:00', 'expense', 'completed', NOW());
-- TOTAL NOVIEMBRE GASOLINA: $95.00 (hasta ahora)

-- === JUEGOS - NOVIEMBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa (débito automático)
('40591552-ace8-489f-ba9c-5372ee5537e8', 14.99, 'Xbox Game Pass', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-11-01 00:05:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.99, 'PlayStation Plus', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-11-01 00:10:00', 'expense', 'completed', NOW()),
-- Cuenta Secundaria BBVA
('40591552-ace8-489f-ba9c-5372ee5537e8', 49.99, 'Alan Wake 2', '3f9bcac2-e2e6-45ec-95bf-6da238c325ef', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', 'ebfd47a1-d2ba-477b-94b4-a03b24a13b0b', '2025-11-03 19:00:00', 'expense', 'completed', NOW());
-- TOTAL NOVIEMBRE JUEGOS: $74.97 (hasta ahora)

-- === RESTAURANTES - NOVIEMBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.50, 'KFC almuerzo', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-11-01 13:00:00', 'expense', 'completed', NOW()),
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 78.00, 'Cena familiar sábado', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-11-02 20:30:00', 'expense', 'completed', NOW()),
-- Efectivo
('40591552-ace8-489f-ba9c-5372ee5537e8', 8.50, 'Café Starbucks', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '19fbf3dc-2b6e-43c5-b514-3e407caee114', '2025-11-03 09:00:00', 'expense', 'completed', NOW()),
-- Tyba
('40591552-ace8-489f-ba9c-5372ee5537e8', 32.00, 'Pollo asado delivery', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '29dc9b99-8c59-45c4-87d3-fbe2c883af59', '2025-11-04 21:00:00', 'expense', 'completed', NOW());
-- TOTAL NOVIEMBRE RESTAURANTES: $134.00 (hasta ahora)

-- === JUEGOS 2 - NOVIEMBRE ===
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, account_id, date, type, status, created_at) VALUES
-- Cuenta bancaria Caixa
('40591552-ace8-489f-ba9c-5372ee5537e8', 0.99, 'Gemas Clash of Clans', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '275d1d6a-7871-4880-958b-eb3ef883a5d1', '2025-11-02 18:00:00', 'expense', 'completed', NOW());
-- TOTAL NOVIEMBRE JUEGOS 2: $0.99 (hasta ahora)

-- =====================================================
-- RESUMEN Y VERIFICACIÓN
-- =====================================================

-- Consulta para verificar gastos por cuenta en OCTUBRE
SELECT 
    a.name AS cuenta,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id 
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense'
    AND t.status = 'completed'
    AND t.date >= '2025-10-01'
    AND t.date < '2025-11-01'
WHERE a.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
GROUP BY a.id, a.name
ORDER BY total_gastado DESC;

-- Consulta para verificar gastos por categoría en OCTUBRE
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado,
    CASE 
        WHEN c.budget_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / c.budget_limit * 100), 2)
        ELSE 0
    END AS porcentaje_usado
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id 
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense'
    AND t.status = 'completed'
    AND t.date >= '2025-10-01'
    AND t.date < '2025-11-01'
WHERE c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
GROUP BY c.id, c.name, c.budget_limit
ORDER BY total_gastado DESC;

-- Consulta para verificar gastos por cuenta en NOVIEMBRE
SELECT 
    a.name AS cuenta,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id 
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense'
    AND t.status = 'completed'
    AND t.date >= '2025-11-01'
    AND t.date < '2025-12-01'
WHERE a.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
GROUP BY a.id, a.name
ORDER BY total_gastado DESC;

-- Consulta para verificar gastos por categoría en NOVIEMBRE
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado,
    CASE 
        WHEN c.budget_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / c.budget_limit * 100), 2)
        ELSE 0
    END AS porcentaje_usado
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id 
    AND t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
    AND t.type = 'expense'
    AND t.status = 'completed'
    AND t.date >= '2025-11-01'
    AND t.date < '2025-12-01'
WHERE c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
GROUP BY c.id, c.name, c.budget_limit
ORDER BY total_gastado DESC;

-- =====================================================
-- RESUMEN EJECUTIVO
-- =====================================================
/*
OCTUBRE 2025:
-------------
Gasolina:      $353.00 / $350.00  (101%) 🔴 Sobrepasado ligeramente
Juegos:        $187.93 / $200.00  (94%)  🟡 Alto uso
Restaurantes:  $486.00 / $450.00  (108%) 🔴 Sobrepasado
Juegos 2:      $53.97  / $80.00   (67%)  🟢 Uso moderado
TOTAL GASTADO: $1,080.90

DISTRIBUCIÓN POR CUENTA (OCTUBRE):
- Cuenta bancaria Caixa: ~$567
- Efectivo: ~$166
- Cuenta Secundaria BBVA: ~$168
- Tyba: ~$60
- Inversion Caixa: $0
- Fondo de emergencia: $0

NOVIEMBRE 2025 (hasta el 4):
---------------------------
Gasolina:      $95.00   / $350.00  (27%)  🟢
Juegos:        $74.97   / $200.00  (37%)  🟢
Restaurantes:  $134.00  / $450.00  (30%)  🟢
Juegos 2:      $0.99    / $80.00   (1%)   🟢
TOTAL GASTADO: $304.96

DISTRIBUCIÓN POR CUENTA (NOVIEMBRE):
- Cuenta bancaria Caixa: ~$159
- Efectivo: ~$64
- Cuenta Secundaria BBVA: ~$50
- Tyba: ~$32
- Inversion Caixa: $0
- Fondo de emergencia: $0
*/
