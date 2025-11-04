# Módulo de Seguimiento de Gastos

## 📊 Descripción

Módulo completo para observar y analizar los gastos registrados por categorías y subcategorías. Proporciona una vista compacta e intuitiva del progreso de gastos versus presupuesto establecido.

## 🎯 Características

### Principales
- **Vista mensual**: Navegación fácil entre meses para revisar gastos históricos
- **Resumen general**: Tarjetas con totales de presupuesto, gastos y disponible
- **Categorías expandibles**: Cada categoría puede expandirse para ver sus subcategorías
- **Barras de progreso**: Indicadores visuales del progreso de gasto vs presupuesto
- **Colores dinámicos**: Sistema de alertas con colores (verde, amarillo, rojo)
- **Responsive**: Diseño adaptable a diferentes tamaños de pantalla

### Visualización
- ✅ Presupuesto asignado por categoría
- ✅ Gasto actual vs presupuesto
- ✅ Porcentaje de progreso visual
- ✅ Desglose por subcategorías
- ✅ Alertas de color cuando se acerca al límite

## 📁 Estructura de Archivos

```
app/(root)/expenses-tracking/
└── page.tsx                    # Página principal del módulo

src/
├── components/categories/
│   └── CategoryExpenseCard.tsx # Componente de tarjeta de categoría
├── hooks/
│   └── useExpenseTracking.ts   # Hook personalizado para datos
└── lib/supabase/
    └── subcategories.ts        # Servicios de base de datos

scss/modules/
└── expensesTracking.module.scss # Estilos del módulo
```

## 🚀 Uso

### Acceso al módulo
Navega a `/expenses-tracking` en tu aplicación.

### Funcionalidades

#### 1. Selector de Mes
- **Botones de navegación**: `←` y `→` para cambiar de mes
- **Display actual**: Muestra el mes y año seleccionado

#### 2. Tarjetas de Resumen
Tres tarjetas principales:
1. **Presupuesto Total**: Suma de todos los límites de presupuesto
2. **Gastos Totales**: Total gastado en el mes actual
3. **Disponible/Sobregiro**: Diferencia entre presupuesto y gastos

#### 3. Lista de Categorías
Cada categoría muestra:
- **Icono y nombre**: Identificación visual
- **Barra de progreso**: Con colores según nivel de gasto
  - 🟢 Verde: < 80% del presupuesto
  - 🟡 Amarillo: 80-99% del presupuesto
  - 🔴 Rojo: ≥ 100% del presupuesto
- **Montos**: Gastado y restante
- **Subcategorías**: Click para expandir y ver detalles

## 🔧 Componentes Técnicos

### useExpenseTracking Hook
Hook personalizado que gestiona:
- Estado de carga y errores
- Selección de mes
- Obtención de datos desde Supabase
- Cálculos de totales y progreso

```typescript
const {
  categories,        // Array de categorías con subcategorías
  isLoading,         // Estado de carga
  error,             // Mensajes de error
  selectedMonth,     // Mes seleccionado
  setSelectedMonth,  // Cambiar mes
  refresh,           // Refrescar datos
  totalBudget,       // Total de presupuesto
  totalExpenses,     // Total de gastos
  budgetProgress     // Porcentaje de progreso
} = useExpenseTracking();
```

### CategoryExpenseCard Component
Componente reutilizable para mostrar cada categoría:
- Props: `category: CategoryWithSubcategories`
- Estado interno para expansión/colapso
- Cálculos automáticos de progreso
- Formateo de montos con contexto de moneda

### Servicios de Subcategorías

#### `getCategoriesWithSubcategories(userId, startDate, endDate)`
Obtiene todas las categorías con:
- Información básica de la categoría
- Lista de subcategorías
- Gastos totales por categoría
- Gastos por subcategoría

#### Otros servicios disponibles:
- `getCategorySubcategories()`: Obtener subcategorías de una categoría
- `getSubcategoryExpenses()`: Obtener gastos por subcategoría
- `createSubcategory()`: Crear nueva subcategoría
- `deleteSubcategory()`: Eliminar subcategoría

## 🎨 Personalización de Estilos

Los estilos están en módulos SCSS con variables CSS:

```scss
// Variables principales
--text-primary       // Color de texto principal
--text-secondary     // Color de texto secundario
--card-background    // Fondo de tarjetas
--border-color       // Color de bordes
--hover-background   // Fondo al hacer hover
--accent-color       // Color de acento
```

### Clases principales:
- `.categoryCard`: Tarjeta de categoría
- `.progressBar`: Barra de progreso
- `.subcategoryItem`: Item de subcategoría
- `.summaryCard`: Tarjeta de resumen

## 📱 Responsive

El módulo es completamente responsive:

- **Desktop**: Grid de 3 columnas para resumen, lista completa
- **Tablet**: Grid de 2 columnas, ajustes de espaciado
- **Mobile**: Columna única, headers apilados

## 🔄 Actualización de Datos

- **Automática**: Al cambiar de mes
- **Manual**: Botón de refresh en el header
- **Tiempo real**: Usa sesión de Supabase para seguridad

## 💡 Tips de Uso

1. **Configura presupuestos**: Las categorías sin presupuesto no mostrarán barra de progreso
2. **Usa subcategorías**: Mejora el seguimiento detallado de gastos
3. **Revisa mensualmente**: Navega entre meses para comparar patrones
4. **Observa los colores**: Los colores de alerta te ayudan a identificar categorías problemáticas

## 🛠️ Requisitos

- Supabase configurado con las tablas:
  - `categories`
  - `subcategories`
  - `transactions`
- Contextos:
  - `CurrencyContext`: Para formateo de moneda
- Componentes existentes:
  - `CategoryIcon`: Para iconos de categorías

## 🐛 Solución de Problemas

### No se muestran datos
- Verifica que tengas categorías creadas
- Confirma que hay transacciones en el período seleccionado
- Revisa la sesión de Supabase

### Errores de cálculo
- Las transacciones deben tener `status: 'completed'`
- Verifica que las transacciones tengan `type: 'expense'`
- Confirma que las fechas estén en formato ISO

### Estilos no se aplican
- Verifica la importación del módulo SCSS
- Confirma variables CSS en tema global
- Revisa modo oscuro si está habilitado

## 📈 Futuras Mejoras

- [ ] Gráficos de tendencias
- [ ] Comparación entre meses
- [ ] Exportar reporte PDF
- [ ] Establecer alertas personalizadas
- [ ] Vista anual consolidada
- [ ] Filtros por tipo de gasto

## 📄 Licencia

Parte del proyecto Financial Sage - Sistema de gestión financiera personal

---

**Creado**: Noviembre 2025
**Versión**: 1.0.0
