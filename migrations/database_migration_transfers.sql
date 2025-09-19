-- Migration: Add Transfer Support to Transactions
-- Este archivo contiene las migraciones SQL necesarias para soportar transferencias entre cuentas

-- =====================================================
-- 1. Agregar campo destination_account_id a la tabla transactions
-- =====================================================

-- Agregar la columna si no existe
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- =====================================================
-- 2. Actualizar el CHECK constraint para incluir 'transfer'
-- =====================================================

-- Primero, eliminar el constraint existente si existe
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Agregar el nuevo constraint que incluye 'transfer'
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'transfer'));

-- =====================================================
-- 3. Crear índice para optimizar consultas de transferencias
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id ON transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =====================================================
-- 4. Crear función para validar transferencias
-- =====================================================

-- Función que valida que las transferencias tengan ambas cuentas
CREATE OR REPLACE FUNCTION validate_transfer_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es una transferencia, validar que tenga ambas cuentas
    IF NEW.type = 'transfer' THEN
        IF NEW.account_id IS NULL OR NEW.destination_account_id IS NULL THEN
            RAISE EXCEPTION 'Las transferencias requieren cuenta de origen y destino';
        END IF;
        
        IF NEW.account_id = NEW.destination_account_id THEN
            RAISE EXCEPTION 'No se puede transferir a la misma cuenta';
        END IF;
        
        -- Las transferencias no deben tener categoría
        NEW.category_id := NULL;
    END IF;
    
    -- Para ingresos y gastos, limpiar destination_account_id
    IF NEW.type IN ('income', 'expense') THEN
        NEW.destination_account_id := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Crear trigger para validar transferencias
-- =====================================================

DROP TRIGGER IF EXISTS trigger_validate_transfer_accounts ON transactions;

CREATE TRIGGER trigger_validate_transfer_accounts
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transfer_accounts();

-- =====================================================
-- 6. Crear políticas RLS para transferencias (si RLS está habilitado)
-- =====================================================

-- IMPORTANTE: Antes de crear nuevas políticas, verificar las existentes
-- Para evitar conflictos, se recomienda revisar las políticas actuales:
-- SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- Eliminar políticas existentes que puedan entrar en conflicto (descomentar si es necesario)
-- DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
-- DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;

-- Eliminar políticas si existen para evitar conflictos
DROP POLICY IF EXISTS "Users can view their own transactions and transfers" ON transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;

-- Política unificada para ver transacciones (incluyendo transferencias)
CREATE POLICY "Users can view their own transactions and transfers" ON transactions
    FOR SELECT USING (
        -- El usuario debe ser el propietario de la transacción
        user_id = auth.uid()
    );

-- Política para insertar/actualizar transacciones (incluyendo transferencias)
CREATE POLICY "Users can manage their own transactions" ON transactions
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND (
            -- Para transacciones normales, cualquier validación adicional se hace en la app
            type IN ('income', 'expense') OR
            -- Para transferencias, validar que ambas cuentas pertenezcan al usuario
            (type = 'transfer' AND 
             account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()) AND
             destination_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))
        )
    );

-- =====================================================
-- 7. Comentarios y notas
-- =====================================================

COMMENT ON COLUMN transactions.destination_account_id IS 'Cuenta de destino para transferencias entre cuentas del usuario';
COMMENT ON CONSTRAINT transactions_type_check ON transactions IS 'Tipo de transacción: income, expense, o transfer';

-- Notas para el desarrollo:
-- 1. Las transferencias requieren account_id (origen) y destination_account_id (destino)
-- 2. Las transferencias no deben tener category_id (se establece en NULL automáticamente)
-- 3. El monto de la transferencia se resta de la cuenta origen y se suma a la cuenta destino
-- 4. Ambas cuentas deben pertenecer al mismo usuario (validado a nivel de aplicación)