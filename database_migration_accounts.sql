-- Migration: Add Accounts (Wallets) System
-- Este archivo contiene todas las migraciones SQL necesarias para implementar el sistema de cuentas

-- =====================================================
-- 1. Crear tabla accounts
-- =====================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank_account', 'credit_card', 'debit_card', 'digital_wallet')),
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366f1',
  bank_name VARCHAR(100),
  last_four_digits VARCHAR(4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Crear índices para optimizar consultas
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_default ON accounts(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(user_id, is_active) WHERE is_active = true;

-- =====================================================
-- 3. Habilitar Row Level Security (RLS)
-- =====================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. Crear políticas de seguridad
-- =====================================================

-- Política para que los usuarios solo vean sus propias cuentas
CREATE POLICY "Users can only see their own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Política para insertar (solo el propio usuario)
CREATE POLICY "Users can insert their own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para actualizar (solo el propio usuario)
CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Política para eliminar (solo el propio usuario)
CREATE POLICY "Users can delete their own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. Modificar tabla transactions para incluir account_id
-- =====================================================

-- Agregar columna account_id a transactions (si no existe)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'account_id'
  ) THEN 
    ALTER TABLE transactions ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Crear índice para account_id
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- =====================================================
-- 6. Función para actualizar updated_at automáticamente
-- =====================================================

-- Crear función si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at en accounts
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. Función para asegurar solo una cuenta por defecto por usuario
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está marcando como default, desmarcar todas las otras del mismo usuario
  IF NEW.is_default = true THEN
    UPDATE accounts 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asegurar solo una cuenta por defecto
DROP TRIGGER IF EXISTS ensure_single_default_account_trigger ON accounts;
CREATE TRIGGER ensure_single_default_account_trigger
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_account();

-- =====================================================
-- 8. Insertar cuentas por defecto (opcional)
-- =====================================================

-- Esta sección es opcional - puedes crear cuentas por defecto para nuevos usuarios
-- Descomenta si quieres que cada usuario tenga una cuenta de efectivo por defecto

/*
CREATE OR REPLACE FUNCTION create_default_accounts_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear una cuenta de efectivo por defecto para nuevos usuarios
  INSERT INTO accounts (user_id, name, type, balance, is_default, is_active)
  VALUES (NEW.id, 'Efectivo', 'cash', 0.00, true, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear cuentas por defecto para nuevos usuarios
DROP TRIGGER IF EXISTS create_default_accounts_trigger ON auth.users;
CREATE TRIGGER create_default_accounts_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_accounts_for_user();
*/

-- =====================================================
-- 9. Verificar la migración
-- =====================================================

-- Consultar las tablas creadas
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('accounts', 'transactions');

-- Verificar las columnas de accounts
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;

-- Verificar que account_id se agregó a transactions
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'account_id';

-- =====================================================
-- 10. Datos de ejemplo (opcional)
-- =====================================================

-- Descomenta para insertar datos de ejemplo
/*
-- Solo ejecutar si tienes un usuario específico para testing
INSERT INTO accounts (user_id, name, type, balance, currency, is_default, color) VALUES
  ('tu-user-id-aqui', 'Cuenta Principal', 'bank_account', 1000.00, 'USD', true, '#10b981'),
  ('tu-user-id-aqui', 'Tarjeta de Crédito', 'credit_card', 0.00, 'USD', false, '#ef4444'),
  ('tu-user-id-aqui', 'Efectivo', 'cash', 50.00, 'USD', false, '#f59e0b');
*/

-- Fin de la migración