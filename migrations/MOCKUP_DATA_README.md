# Scripts de Datos Mockup - Seguimiento de Gastos

## 📁 Archivos Incluidos

1. **`mockup_expenses_tracking.sql`** - Script principal con datos completos
2. **`verify_expenses_data.sql`** - Script de verificación y consultas útiles

## 🎯 Objetivo

Estos scripts crean datos de prueba realistas para el módulo de **Seguimiento de Gastos**, incluyendo:
- ✅ 20 subcategorías distribuidas en 6 categorías principales
- ✅ 50+ transacciones de gastos para noviembre 2025
- ✅ Presupuestos configurados para cada categoría
- ✅ Diferentes escenarios (bajo presupuesto, cerca del límite, sobrepasado)

## 📊 Datos Creados

### Categorías y Presupuestos

| Categoría | Presupuesto | Subcategorías | Gasto Estimado | Estado |
|-----------|-------------|---------------|----------------|--------|
| 🍔 Alimentación | $500 | 3 | $480 (96%) | 🟡 Cerca del límite |
| 🚗 Transporte | $300 | 4 | $350 (117%) | 🔴 Sobrepasado |
| 🎬 Entretenimiento | $200 | 4 | $165 (82%) | 🟡 Advertencia |
| ⚕️ Salud | $250 | 4 | $95 (38%) | 🟢 Bajo uso |
| 👔 Ropa/Compras | $150 | 3 | $155 (103%) | 🔴 Ligeramente sobrepasado |
| 🏠 Hogar | $800 | 5 | $785 (98%) | 🟡 Muy cerca del límite |

**Total:** $2,200 presupuesto / $2,030 gastado (92%)

### Subcategorías Creadas

#### Alimentación
- Supermercado
- Restaurantes
- Café y snacks

#### Transporte
- Gasolina
- Mantenimiento
- Estacionamiento
- Seguro auto

#### Entretenimiento
- Cine
- Streaming
- Conciertos
- Hobbies

#### Salud
- Médico general
- Medicamentos
- Dentista
- Gimnasio

#### Ropa/Compras
- Ropa
- Zapatos
- Accesorios

#### Hogar
- Renta/Hipoteca
- Electricidad
- Agua
- Internet
- Gas

## 🚀 Instrucciones de Uso

### Opción 1: Desde Supabase Dashboard

1. **Accede a tu proyecto en Supabase:**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Copia y pega el contenido:**
   - Abre `mockup_expenses_tracking.sql`
   - Copia TODO el contenido
   - Pégalo en el editor de Supabase

4. **Ejecuta el script:**
   - Click en "Run" o presiona `Ctrl/Cmd + Enter`
   - Espera a que termine (debería tomar unos segundos)

5. **Verifica los datos:**
   - Copia y pega el contenido de `verify_expenses_data.sql`
   - Ejecuta las consultas de verificación

### Opción 2: Desde pgAdmin o DBeaver

1. **Obtén tu cadena de conexión:**
   - En Supabase → Settings → Database
   - Copia la cadena de conexión

2. **Conéctate a la base de datos:**
   - Usa tu cliente SQL favorito
   - Ingresa las credenciales de conexión

3. **Ejecuta el script:**
   - Abre `mockup_expenses_tracking.sql`
   - Ejecuta todo el script

4. **Verifica con el segundo script:**
   - Abre `verify_expenses_data.sql`
   - Ejecuta las consultas

### Opción 3: Desde la Terminal (psql)

```bash
# Conéctate a tu base de datos
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Ejecuta el script
\i migrations/mockup_expenses_tracking.sql

# Verifica los datos
\i migrations/verify_expenses_data.sql
```

## ✅ Verificación

Después de ejecutar el script, verifica que todo esté correcto:

### 1. Verifica las subcategorías
```sql
SELECT COUNT(*) FROM subcategories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';
-- Debe devolver: 20
```

### 2. Verifica las transacciones
```sql
SELECT COUNT(*) FROM transactions 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND type = 'expense'
AND status = 'completed';
-- Debe devolver: ~50
```

### 3. Verifica los presupuestos
```sql
SELECT COUNT(*) FROM categories 
WHERE (user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR is_default = true)
AND budget_limit IS NOT NULL;
-- Debe devolver: 6
```

## 🎨 Probando el Módulo

Una vez ejecutado el script:

1. **Navega a la aplicación:**
   ```
   http://localhost:3000/expenses-tracking
   ```

2. **Deberías ver:**
   - 3 tarjetas de resumen en la parte superior
   - Selector de mes (noviembre 2025)
   - 6 categorías con sus datos
   - Barras de progreso con colores (verde, amarillo, rojo)

3. **Interactúa:**
   - Click en las categorías para expandir subcategorías
   - Navega entre meses (el actual tiene datos)
   - Usa el botón refresh para recargar

## 🔍 Consultas Útiles

### Ver gastos por subcategoría
```sql
SELECT 
    c.name AS categoria,
    s.name AS subcategoria,
    COUNT(t.id) AS num_transacciones,
    SUM(t.amount) AS total_gastado
FROM subcategories s
JOIN categories c ON s.category_id = c.id
LEFT JOIN transactions t ON t.subcategory_id = s.id
WHERE s.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
GROUP BY c.name, s.name
ORDER BY c.name, total_gastado DESC;
```

### Ver transacciones recientes
```sql
SELECT 
    t.date::date,
    c.name AS categoria,
    s.name AS subcategoria,
    t.description,
    t.amount
FROM transactions t
JOIN categories c ON t.category_id = c.id
LEFT JOIN subcategories s ON t.subcategory_id = s.id
WHERE t.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND t.type = 'expense'
ORDER BY t.date DESC
LIMIT 20;
```

### Ver categorías sobrepasadas
```sql
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    SUM(t.amount) AS gastado,
    SUM(t.amount) - c.budget_limit AS excedente
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id 
    AND t.type = 'expense' 
    AND t.status = 'completed'
WHERE (c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR c.is_default = true)
GROUP BY c.id, c.name, c.budget_limit
HAVING SUM(t.amount) > c.budget_limit
ORDER BY excedente DESC;
```

## 🧹 Limpiar Datos de Prueba

Si necesitas eliminar los datos de prueba:

```sql
-- Eliminar transacciones
DELETE FROM transactions 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND date >= '2025-11-01' AND date < '2025-12-01';

-- Eliminar subcategorías
DELETE FROM subcategories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';

-- Resetear presupuestos (opcional)
UPDATE categories 
SET budget_limit = NULL 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';
```

## 📝 Notas Importantes

1. **User ID:** Todos los datos usan el user_id `40591552-ace8-489f-ba9c-5372ee5537e8`
2. **Fechas:** Las transacciones están en noviembre 2025 (mes actual)
3. **IDs de categorías:** Los IDs deben coincidir con los de tu base de datos
4. **Subcategorías:** Se crean con UUIDs fijos para poder referenciarlas
5. **Estado:** Todas las transacciones tienen `status = 'completed'`

## 🐛 Solución de Problemas

### Error: "duplicate key value violates unique constraint"
- **Causa:** Ya existen registros con esos IDs
- **Solución:** Ejecuta el script de limpieza primero

### No aparecen datos en el módulo
- **Verifica:** Que el user_id sea correcto
- **Verifica:** Que las fechas sean del mes actual
- **Verifica:** Que el status sea 'completed' y type sea 'expense'

### Los totales no coinciden
- **Verifica:** Que todas las transacciones tengan category_id
- **Verifica:** Que los presupuestos estén configurados
- **Refresca:** Usa el botón de refresh en el módulo

## 📞 Soporte

Si tienes problemas:
1. Revisa las consultas de verificación en `verify_expenses_data.sql`
2. Verifica los logs de la consola del navegador
3. Revisa los errores en el terminal donde corre Next.js

---

**Última actualización:** Noviembre 4, 2025
**Versión:** 1.0.0
