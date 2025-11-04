-- Script de datos mockup para pruebas del módulo de Seguimiento de Gastos
-- User ID: 40591552-ace8-489f-ba9c-5372ee5537e8
-- Fecha: Noviembre 2025

-- =====================================================
-- 1. CREAR SUBCATEGORÍAS PARA CADA CATEGORÍA
-- =====================================================

-- Subcategorías para categoría 1: 119ed78d-2e46-4326-bb12-0dbe108165ce
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Supermercado', NOW()),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Restaurantes', NOW()),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f', '119ed78d-2e46-4326-bb12-0dbe108165ce', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Café y snacks', NOW());

-- Subcategorías para categoría 2: 14f4795d-cfda-4845-a640-303dc266c4f3
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Gasolina', NOW()),
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Mantenimiento', NOW()),
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d70', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Estacionamiento', NOW()),
('b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d71', '14f4795d-cfda-4845-a640-303dc266c4f3', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Seguro auto', NOW());

-- Subcategorías para categoría 3: 37d7b0aa-cb04-4313-b59f-50939dab5e7c
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Cine', NOW()),
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Streaming', NOW()),
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Conciertos', NOW()),
('c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e82', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Hobbies', NOW());

-- Subcategorías para categoría 4: 3f9bcac2-e2e6-456e-96bf-6da238c325ef
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Médico general', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Medicamentos', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f82', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Dentista', NOW()),
('d1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f83', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Gimnasio', NOW());

-- Subcategorías para categoría 5: 4de247f3-6abd-4811-bdee-d68301a542d
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', '4de247f3-6abd-4811-bdee-d68301a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Ropa', NOW()),
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8092', '4de247f3-6abd-4811-bdee-d68301a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Zapatos', NOW()),
('e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8093', '4de247f3-6abd-4811-bdee-d68301a542d', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Accesorios', NOW());

-- Subcategorías para categoría 6: ca1d34ea-4c89-4826-b03c-88ae3d54a231
INSERT INTO subcategories (id, category_id, user_id, name, created_at) VALUES
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Renta/Hipoteca', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Electricidad', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Agua', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Internet', NOW()),
('f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809205', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', '40591552-ace8-489f-ba9c-5372ee5537e8', 'Gas', NOW());

-- =====================================================
-- 2. ACTUALIZAR PRESUPUESTOS DE CATEGORÍAS
-- =====================================================

UPDATE categories SET budget_limit = 500.00 WHERE id = '119ed78d-2e46-4326-bb12-0dbe108165ce'; -- Alimentación
UPDATE categories SET budget_limit = 300.00 WHERE id = '14f4795d-cfda-4845-a640-303dc266c4f3'; -- Transporte
UPDATE categories SET budget_limit = 200.00 WHERE id = '37d7b0aa-cb04-4313-b59f-50939dab5e7c'; -- Entretenimiento
UPDATE categories SET budget_limit = 250.00 WHERE id = '3f9bcac2-e2e6-456e-96bf-6da238c325ef'; -- Salud
UPDATE categories SET budget_limit = 150.00 WHERE id = '4de247f3-6abd-4811-bdee-d68301a542d'; -- Ropa/Compras
UPDATE categories SET budget_limit = 800.00 WHERE id = 'ca1d34ea-4c89-4826-b03c-88ae3d54a231'; -- Hogar

-- =====================================================
-- 3. CREAR TRANSACCIONES DE GASTOS - NOVIEMBRE 2025
-- =====================================================

-- ALIMENTACIÓN (Categoría 1) - Total: ~$480 (96% del presupuesto de $500)
-- Subcategoría: Supermercado
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 85.50, 'Compra semanal en supermercado', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-02 10:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 92.30, 'Supermercado - frutas y verduras', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-05 14:20:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 78.90, 'Compra de despensa', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-08 16:45:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 105.20, 'Compra mensual supermercado', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2025-11-10 11:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Restaurantes
('40591552-ace8-489f-ba9c-5372ee5537e8', 45.00, 'Cena en restaurante', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '2025-11-01 20:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 38.50, 'Almuerzo con amigos', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e', '2025-11-04 13:15:00', 'expense', 'completed', NOW()),

-- Subcategoría: Café y snacks
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.50, 'Café matutino', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f', '2025-11-03 08:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 8.75, 'Snacks en tienda', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f', '2025-11-06 15:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 13.20, 'Café y pastel', '119ed78d-2e46-4326-bb12-0dbe108165ce', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f', '2025-11-09 10:00:00', 'expense', 'completed', NOW());

-- TRANSPORTE (Categoría 2) - Total: ~$350 (117% del presupuesto de $300) - SOBREPASADO
-- Subcategoría: Gasolina
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 55.00, 'Gasolina estación Shell', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-02 07:30:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 48.50, 'Tanque lleno', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-07 18:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 52.30, 'Gasolina fin de semana', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6e', '2025-11-09 12:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Mantenimiento
('40591552-ace8-489f-ba9c-5372ee5537e8', 120.00, 'Cambio de aceite y filtros', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '2025-11-03 09:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 35.00, 'Lavado de auto', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d6f', '2025-11-08 14:30:00', 'expense', 'completed', NOW()),

-- Subcategoría: Estacionamiento
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.00, 'Estacionamiento centro comercial', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d70', '2025-11-04 16:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.50, 'Parking aeropuerto', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d70', '2025-11-06 08:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Seguro auto
('40591552-ace8-489f-ba9c-5372ee5537e8', 11.70, 'Pago mensual seguro auto', '14f4795d-cfda-4845-a640-303dc266c4f3', 'b1c2d3e4-f5a6-4b5c-9d0e-1f2a3b4c5d71', '2025-11-01 00:00:00', 'expense', 'completed', NOW());

-- ENTRETENIMIENTO (Categoría 3) - Total: ~$165 (82.5% del presupuesto de $200)
-- Subcategoría: Cine
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 25.00, 'Boletos de cine', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '2025-11-02 19:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 18.50, 'Cine con palomitas', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e7f', '2025-11-08 20:30:00', 'expense', 'completed', NOW()),

-- Subcategoría: Streaming
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.99, 'Netflix mensual', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.99, 'Spotify Premium', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 9.99, 'Disney+ mensual', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e80', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Conciertos
('40591552-ace8-489f-ba9c-5372ee5537e8', 45.00, 'Boletos concierto', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e81', '2025-11-05 21:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Hobbies
('40591552-ace8-489f-ba9c-5372ee5537e8', 23.50, 'Materiales de arte', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e82', '2025-11-06 15:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 14.03, 'Revista mensual', '37d7b0aa-cb04-4313-b59f-50939dab5e7c', 'c1d2e3f4-a5b6-4c5d-0e1f-2a3b4c5d6e82', '2025-11-09 10:30:00', 'expense', 'completed', NOW());

-- SALUD (Categoría 4) - Total: ~$95 (38% del presupuesto de $250) - Bajo uso
-- Subcategoría: Médico general
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 50.00, 'Consulta médica', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f80', '2025-11-03 09:30:00', 'expense', 'completed', NOW()),

-- Subcategoría: Medicamentos
('40591552-ace8-489f-ba9c-5372ee5537e8', 18.50, 'Medicamentos farmacia', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', '2025-11-04 12:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 12.30, 'Vitaminas y suplementos', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f81', '2025-11-07 16:30:00', 'expense', 'completed', NOW()),

-- Subcategoría: Gimnasio
('40591552-ace8-489f-ba9c-5372ee5537e8', 14.20, 'Mensualidad gimnasio', '3f9bcac2-e2e6-456e-96bf-6da238c325ef', 'd1e2f3a4-b5c6-4d5e-1f2a-3b4c5d6e7f83', '2025-11-01 00:00:00', 'expense', 'completed', NOW());

-- ROPA/COMPRAS (Categoría 5) - Total: ~$155 (103% del presupuesto de $150) - Ligeramente sobrepasado
-- Subcategoría: Ropa
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 85.00, 'Camisa y pantalón', '4de247f3-6abd-4811-bdee-d68301a542d', 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', '2025-11-05 17:00:00', 'expense', 'completed', NOW()),
('40591552-ace8-489f-ba9c-5372ee5537e8', 32.50, 'Camisetas básicas', '4de247f3-6abd-4811-bdee-d68301a542d', 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8091', '2025-11-08 14:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Zapatos
('40591552-ace8-489f-ba9c-5372ee5537e8', 22.00, 'Zapatos deportivos', '4de247f3-6abd-4811-bdee-d68301a542d', 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8092', '2025-11-07 12:30:00', 'expense', 'completed', NOW()),

-- Subcategoría: Accesorios
('40591552-ace8-489f-ba9c-5372ee5537e8', 15.50, 'Cinturón y cartera', '4de247f3-6abd-4811-bdee-d68301a542d', 'e1f2a3b4-c5d6-4e5f-2a3b-4c5d6e7f8093', '2025-11-09 16:00:00', 'expense', 'completed', NOW());

-- HOGAR (Categoría 6) - Total: ~$785 (98% del presupuesto de $800)
-- Subcategoría: Renta/Hipoteca
INSERT INTO transactions (user_id, amount, description, category_id, subcategory_id, date, type, status, created_at) VALUES
('40591552-ace8-489f-ba9c-5372ee5537e8', 500.00, 'Pago mensual de renta', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809201', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Electricidad
('40591552-ace8-489f-ba9c-5372ee5537e8', 95.50, 'Recibo de luz', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809202', '2025-11-02 10:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Agua
('40591552-ace8-489f-ba9c-5372ee5537e8', 45.00, 'Servicio de agua', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809203', '2025-11-03 11:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Internet
('40591552-ace8-489f-ba9c-5372ee5537e8', 65.00, 'Internet fibra óptica', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809204', '2025-11-01 00:00:00', 'expense', 'completed', NOW()),

-- Subcategoría: Gas
('40591552-ace8-489f-ba9c-5372ee5537e8', 79.50, 'Recibo de gas', 'ca1d34ea-4c89-4826-b03c-88ae3d54a231', 'f1a2b3c4-d5e6-4f5a-3b4c-5d6e7f809205', '2025-11-04 09:00:00', 'expense', 'completed', NOW());

-- =====================================================
-- RESUMEN DE GASTOS POR CATEGORÍA
-- =====================================================
-- Categoría 1 (Alimentación):      ~$480 / $500  (96%)  🟡 Cerca del límite
-- Categoría 2 (Transporte):        ~$350 / $300  (117%) 🔴 Sobrepasado
-- Categoría 3 (Entretenimiento):   ~$165 / $200  (82%)  🟡 En zona de advertencia
-- Categoría 4 (Salud):             ~$95  / $250  (38%)  🟢 Bajo uso
-- Categoría 5 (Ropa/Compras):      ~$155 / $150  (103%) 🔴 Ligeramente sobrepasado
-- Categoría 6 (Hogar):             ~$785 / $800  (98%)  🟡 Muy cerca del límite
-- =====================================================
-- TOTAL PRESUPUESTO: $2,200
-- TOTAL GASTADO:     ~$2,030 (92%)
-- =====================================================

-- Verificar los datos insertados
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    COUNT(DISTINCT s.id) AS num_subcategorias,
    COUNT(t.id) AS num_transacciones,
    COALESCE(SUM(t.amount), 0) AS total_gastado,
    ROUND((COALESCE(SUM(t.amount), 0) / c.budget_limit * 100), 2) AS porcentaje_usado
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id
LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense' AND t.status = 'completed'
WHERE c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR c.is_default = true
GROUP BY c.id, c.name, c.budget_limit
ORDER BY c.name;
