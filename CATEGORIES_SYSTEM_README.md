# Sistema de Categorías Dinámico

Este sistema de categorías permite crear y gestionar categorías de manera dinámica con iconos de Lucide React.

## Componentes Creados

### 1. CategoryIcons.tsx
- **Propósito**: Gestiona todos los iconos disponibles de Lucide React de manera organizada.
- **Características**:
  - Lista de 28 iconos predefinidos con nombres descriptivos
  - Componente `CategoryIcon` que renderiza iconos por nombre
  - Función `getIconByName` para obtener componentes de iconos
  - Soporte para personalización de color, tamaño y strokeWidth

### 2. CategoryForm.tsx
- **Propósito**: Formulario modal para crear nuevas categorías.
- **Características**:
  - Selección visual de iconos en una grilla
  - Paleta de 10 colores predefinidos
  - Campo opcional para límite de presupuesto
  - Vista previa en tiempo real
  - Validación de formulario
  - Integración con Supabase

### 3. categories.tsx (Refactorizado)
- **Propósito**: Componente principal que muestra categorías dinámicamente.
- **Características**:
  - Carga automática de categorías desde Supabase
  - Renderizado dinámico usando CategoryIcon
  - Botón "+" para agregar nuevas categorías
  - Conserva los estilos existentes
  - Estado de carga

## Cómo Usar

### Agregar Nueva Categoría
1. Haz clic en el botón "+" en la grilla de categorías
2. Completa el formulario modal:
   - **Nombre**: Escribe el nombre de la categoría
   - **Icono**: Selecciona un icono de la grilla (28 disponibles)
   - **Color**: Elige un color de la paleta (10 colores)
   - **Límite**: Opcionalmente define un límite de presupuesto
3. Revisa la vista previa
4. Haz clic en "Crear"

### Iconos Disponibles
- Compras (shopping-cart, shopping-bag)
- Transporte (car, plane, fuel)
- Hogar (home)
- Comida (utensils, pizza, coffee)
- Entretenimiento (gamepad, gamepad2, music, camera)
- Ropa (shirt)
- Salud (heart, hospital, dumbbell)
- Educación (graduation-cap, book)
- Finanzas (credit-card, wallet, banknote, piggy-bank, trending-up)
- Tecnología (smartphone)
- Servicios (scissors, gift)
- Y más...

### Colores Predefinidos
- Rojo (#ef4444)
- Naranja (#f97316)
- Amarillo (#eab308)
- Verde (#22c55e)
- Cian (#06b6d4)
- Azul (#3b82f6)
- Violeta (#8b5cf6)
- Rosa (#ec4899)
- Gris (#64748b)
- Piedra (#78716c)

## Estructura de Base de Datos

El sistema utiliza la tabla `categories` existente con estos campos:
- `id`: UUID único
- `user_id`: ID del usuario
- `name`: Nombre de la categoría
- `color`: Color en formato hex
- `icon`: Nombre del icono (string)
- `budget_limit`: Límite de presupuesto (opcional)
- `is_default`: Si es categoría por defecto
- `created_at`: Fecha de creación

## Estilos Conservados

Todos los estilos existentes se mantuvieron:
- Grid de 6 columnas
- Bordes zinc-700
- Efectos hover
- Transiciones suaves
- Colores de texto zinc-400
- Fondos zinc-800

## Beneficios

1. **Organización**: Los iconos están separados en su propio componente
2. **Escalabilidad**: Fácil agregar nuevos iconos o colores
3. **Reutilización**: CategoryIcon se puede usar en otros componentes
4. **Mantenibilidad**: Código más limpio y modular
5. **UX Mejorada**: Formulario intuitivo con vista previa
6. **Consistencia**: Estilos uniformes en toda la aplicación