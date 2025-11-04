# 🚀 Inicio Rápido - Datos Mockup

## Para el usuario: 40591552-ace8-489f-ba9c-5372ee5537e8

### ⚡ Opción Más Rápida: Supabase SQL Editor

1. Ve a https://app.supabase.com
2. Abre tu proyecto
3. Click en "SQL Editor" → "New query"
4. Copia y pega el contenido de: **`mockup_expenses_tracking.sql`**
5. Click "Run" (Ctrl/Cmd + Enter)
6. ¡Listo! Navega a `/expenses-tracking`

---

## 📋 IDs de Categorías (según tu imagen)

```
119ed78d-2e46-4326-bb12-0dbe108165ce  → Categoría 1 (Alimentación)
14f4795d-cfda-484f5-a640-303dc266c4f3  → Categoría 2 (Transporte)
37d7b0aa-cb04-4313-b59f-50939dab5e7c  → Categoría 3 (Entretenimiento)
3f9bcac2-e2e6-456ec-96bf-6da238c325ef  → Categoría 4 (Salud)
4de247f3-6abd-4811-bdee-d68301a542d   → Categoría 5 (Ropa/Compras)
ca1d34ea-4c89-4826-b03c-88ae3d54a231  → Categoría 6 (Hogar)
```

---

## 📊 Datos que se Crearán

### Subcategorías: 20 en total
- **Alimentación:** Supermercado, Restaurantes, Café y snacks
- **Transporte:** Gasolina, Mantenimiento, Estacionamiento, Seguro auto
- **Entretenimiento:** Cine, Streaming, Conciertos, Hobbies
- **Salud:** Médico general, Medicamentos, Dentista, Gimnasio
- **Ropa/Compras:** Ropa, Zapatos, Accesorios
- **Hogar:** Renta/Hipoteca, Electricidad, Agua, Internet, Gas

### Transacciones: 50+ gastos
- Distribuidas en noviembre 2025
- Variedad de montos realistas
- Diferentes escenarios de presupuesto

### Presupuestos Configurados
- Alimentación: $500
- Transporte: $300
- Entretenimiento: $200
- Salud: $250
- Ropa/Compras: $150
- Hogar: $800
- **Total: $2,200**

---

## ✅ Verificación Rápida

Después de ejecutar, verifica con:

```sql
-- Ver resumen
SELECT 
    c.name AS categoria,
    c.budget_limit AS presupuesto,
    COUNT(DISTINCT s.id) AS subcategorias,
    COUNT(t.id) AS transacciones,
    COALESCE(SUM(t.amount), 0) AS gastado
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id
LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense'
WHERE c.user_id = '40591552-ace8-489f-ba9c-5372ee5537e8' OR c.is_default = true
GROUP BY c.id, c.name, c.budget_limit;
```

---

## 🎯 Resultado Esperado en el Módulo

Verás 6 categorías con estos estados:

| Categoría | Estado | Color |
|-----------|--------|-------|
| Alimentación | 96% usado | 🟡 Amarillo |
| Transporte | 117% usado | 🔴 Rojo (sobrepasado) |
| Entretenimiento | 82% usado | 🟡 Amarillo |
| Salud | 38% usado | 🟢 Verde |
| Ropa/Compras | 103% usado | 🔴 Rojo |
| Hogar | 98% usado | 🟡 Amarillo |

---

## 🧹 Limpiar Datos (si es necesario)

```sql
DELETE FROM transactions 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8'
AND date >= '2025-11-01';

DELETE FROM subcategories 
WHERE user_id = '40591552-ace8-489f-ba9c-5372ee5537e8';
```

---

## 📁 Archivos Disponibles

1. **`mockup_expenses_tracking.sql`** ← Úsalo aquí
2. **`verify_expenses_data.sql`** - Consultas de verificación
3. **`insert-mockup-data.js`** - Versión JavaScript (opcional)
4. **`MOCKUP_DATA_README.md`** - Documentación completa

---

## 🔗 Navega al Módulo

Después de ejecutar:
```
http://localhost:3000/expenses-tracking
```

O desde el menú: **Operaciones → Seguimiento de Gastos**

---

**¡Eso es todo! Con un solo script tendrás datos completos para probar el módulo.** 🎉
