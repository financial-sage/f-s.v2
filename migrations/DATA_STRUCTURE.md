# 📊 Estructura de Datos Mockup - Seguimiento de Gastos

## 🗂️ Jerarquía de Datos

```
Usuario: 40591552-ace8-489f-ba9c-5372ee5537e8
│
├── 📁 CATEGORÍA 1: Alimentación (Presupuesto: $500)
│   ├── 🏪 Supermercado
│   │   ├── 💰 $85.50 - Compra semanal (Nov 2)
│   │   ├── 💰 $92.30 - Frutas y verduras (Nov 5)
│   │   ├── 💰 $78.90 - Despensa (Nov 8)
│   │   └── 💰 $105.20 - Compra mensual (Nov 10)
│   │
│   ├── 🍽️ Restaurantes
│   │   ├── 💰 $45.00 - Cena (Nov 1)
│   │   └── 💰 $38.50 - Almuerzo con amigos (Nov 4)
│   │
│   └── ☕ Café y snacks
│       ├── 💰 $12.50 - Café matutino (Nov 3)
│       ├── 💰 $8.75 - Snacks (Nov 6)
│       └── 💰 $13.20 - Café y pastel (Nov 9)
│   
│   📊 Total: $480.85 / $500.00 (96%) 🟡
│
├── 📁 CATEGORÍA 2: Transporte (Presupuesto: $300)
│   ├── ⛽ Gasolina
│   │   ├── 💰 $55.00 - Shell (Nov 2)
│   │   ├── 💰 $48.50 - Tanque lleno (Nov 7)
│   │   └── 💰 $52.30 - Fin de semana (Nov 9)
│   │
│   ├── 🔧 Mantenimiento
│   │   ├── 💰 $120.00 - Cambio aceite (Nov 3)
│   │   └── 💰 $35.00 - Lavado auto (Nov 8)
│   │
│   ├── 🅿️ Estacionamiento
│   │   ├── 💰 $15.00 - Centro comercial (Nov 4)
│   │   └── 💰 $12.50 - Aeropuerto (Nov 6)
│   │
│   └── 🛡️ Seguro auto
│       └── 💰 $11.70 - Pago mensual (Nov 1)
│   
│   📊 Total: $350.00 / $300.00 (117%) 🔴 SOBREPASADO
│
├── 📁 CATEGORÍA 3: Entretenimiento (Presupuesto: $200)
│   ├── 🎬 Cine
│   │   ├── 💰 $25.00 - Boletos (Nov 2)
│   │   └── 💰 $18.50 - Cine + palomitas (Nov 8)
│   │
│   ├── 📺 Streaming
│   │   ├── 💰 $15.99 - Netflix (Nov 1)
│   │   ├── 💰 $12.99 - Spotify (Nov 1)
│   │   └── 💰 $9.99 - Disney+ (Nov 1)
│   │
│   ├── 🎵 Conciertos
│   │   └── 💰 $45.00 - Boletos (Nov 5)
│   │
│   └── 🎨 Hobbies
│       ├── 💰 $23.50 - Materiales arte (Nov 6)
│       └── 💰 $14.03 - Revista (Nov 9)
│   
│   📊 Total: $165.00 / $200.00 (82%) 🟡
│
├── 📁 CATEGORÍA 4: Salud (Presupuesto: $250)
│   ├── 👨‍⚕️ Médico general
│   │   └── 💰 $50.00 - Consulta (Nov 3)
│   │
│   ├── 💊 Medicamentos
│   │   ├── 💰 $18.50 - Farmacia (Nov 4)
│   │   └── 💰 $12.30 - Vitaminas (Nov 7)
│   │
│   ├── 🦷 Dentista
│   │   └── (Sin gastos este mes)
│   │
│   └── 💪 Gimnasio
│       └── 💰 $14.20 - Mensualidad (Nov 1)
│   
│   📊 Total: $95.00 / $250.00 (38%) 🟢
│
├── 📁 CATEGORÍA 5: Ropa/Compras (Presupuesto: $150)
│   ├── 👔 Ropa
│   │   ├── 💰 $85.00 - Camisa y pantalón (Nov 5)
│   │   └── 💰 $32.50 - Camisetas (Nov 8)
│   │
│   ├── 👟 Zapatos
│   │   └── 💰 $22.00 - Deportivos (Nov 7)
│   │
│   └── 👜 Accesorios
│       └── 💰 $15.50 - Cinturón y cartera (Nov 9)
│   
│   📊 Total: $155.00 / $150.00 (103%) 🔴
│
└── 📁 CATEGORÍA 6: Hogar (Presupuesto: $800)
    ├── 🏠 Renta/Hipoteca
    │   └── 💰 $500.00 - Pago mensual (Nov 1)
    │
    ├── 💡 Electricidad
    │   └── 💰 $95.50 - Recibo luz (Nov 2)
    │
    ├── 💧 Agua
    │   └── 💰 $45.00 - Servicio (Nov 3)
    │
    ├── 🌐 Internet
    │   └── 💰 $65.00 - Fibra óptica (Nov 1)
    │
    └── 🔥 Gas
        └── 💰 $79.50 - Recibo (Nov 4)
    
    📊 Total: $785.00 / $800.00 (98%) 🟡
```

## 📈 Resumen General

```
╔══════════════════════════════════════════════════════════╗
║              RESUMEN FINANCIERO - NOV 2025               ║
╠══════════════════════════════════════════════════════════╣
║  Presupuesto Total:      $2,200.00                       ║
║  Total Gastado:          $2,030.85                       ║
║  Disponible:             $169.15                         ║
║  Porcentaje Usado:       92.3%                           ║
╠══════════════════════════════════════════════════════════╣
║  Estado:                 🟡 ADVERTENCIA                  ║
║  Mensaje:                Cerca del límite presupuestario ║
╚══════════════════════════════════════════════════════════╝
```

## 🎯 Distribución de Gastos

```
Alimentación     ████████████████████░  96%  ($480.85)
Transporte       ██████████████████████ 117% ($350.00) 🔴
Entretenimiento  ████████████████░░░░░  82%  ($165.00)
Salud            ████████░░░░░░░░░░░░░  38%  ($95.00)
Ropa/Compras     ████████████████████░  103% ($155.00) 🔴
Hogar            ███████████████████░░  98%  ($785.00)
```

## 📊 Estadísticas

- **Total de Categorías:** 6
- **Total de Subcategorías:** 20
- **Total de Transacciones:** ~50
- **Categorías OK:** 2 (33%) 🟢
- **Categorías en Advertencia:** 2 (33%) 🟡
- **Categorías Sobrepasadas:** 2 (33%) 🔴

## 🔄 Período

- **Mes:** Noviembre 2025
- **Fecha inicio:** 1 de noviembre, 2025
- **Fecha fin:** 10 de noviembre, 2025
- **Días con transacciones:** 10

## 💡 Insights

### ✅ Puntos Positivos
- Salud tiene buen margen (62% disponible)
- Hogar está controlado (solo 2% del presupuesto restante)
- Alimentación está dentro del límite

### ⚠️ Áreas de Atención
- **Transporte:** Sobrepasado en $50 (17% sobre presupuesto)
- **Ropa/Compras:** Ligeramente sobrepasado en $5
- **Hogar:** Muy cerca del límite, cuidado con gastos extra

### 📌 Recomendaciones
1. Reducir gastos de transporte el próximo mes
2. Evitar compras de ropa innecesarias
3. Mantener el control en alimentación
4. Aprovechar el margen en salud para check-ups pendientes

---

## 🗄️ Estructura de Tablas

```sql
┌─────────────┐
│ categories  │
├─────────────┤
│ id          │◄────┐
│ user_id     │     │
│ name        │     │
│ budget_limit│     │
│ color       │     │
│ icon        │     │
└─────────────┘     │
                    │
┌─────────────────┐ │     ┌──────────────┐
│ subcategories   │ │     │ transactions │
├─────────────────┤ │     ├──────────────┤
│ id              │◄┼─────┤ category_id  │
│ category_id     │─┘  ┌──┤ subcategory  │
│ user_id         │    │  │ user_id      │
│ name            │    │  │ amount       │
└─────────────────┘    │  │ description  │
                       │  │ date         │
                       └──┤ type         │
                          │ status       │
                          └──────────────┘
```

---

**Creado:** Noviembre 4, 2025
**User ID:** 40591552-ace8-489f-ba9c-5372ee5537e8
**Versión:** 1.0.0
