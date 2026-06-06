# 📌 The Wall - Sistema de Tablón de Deseos

## Descripción General

The Wall (El Tablón) es un sistema completo de carrito de compras y tablón de deseos para Valedissed. Permite a las usuarias:

1. **Agregar productos al carrito** desde el marketplace
2. **Visualizar y gestionar** su carrito de compras
3. **Publicar solicitudes públicas** en el tablón con los productos que desean
4. **Proceder al pago** (checkout diseñado, listo para integrar con proveedores de pago)
5. **Ver todas las solicitudes** de otras usuarias en el tablón público

---

## 🏗️ Arquitectura del Sistema

### Base de Datos (SQL)
```
profiles (existente)
├── birthdate (NUEVO: para calcular edad)
└── [otros campos]

the_wall_requests (NUEVO)
├── id (UUID, PK)
├── user_id (FK a profiles)
├── title (texto opcional)
├── message (texto opcional)
├── is_completed (booleano)
├── expires_at (fecha)
├── created_at, updated_at
└── [RLS: público para lectura, solo owner para modificar]

the_wall_request_items (NUEVO: tabla intermedia)
├── id (UUID, PK)
├── request_id (FK a the_wall_requests)
├── product_id (FK a products)
├── quantity (cantidad)
└── [RLS: público para lectura, solo owner para modificar]
```

### Backend (FastAPI)
**Schemas** (`backend/app/schemas/wall.py`):
- `WallRequestCreate` - Datos para crear solicitud
- `WallRequestItemResponse` - Item en una solicitud
- `WallRequestResponse` - Respuesta completa con usuario

**Endpoints** (`backend/app/api/v1/wall/wall.py`):
```
GET    /api/v1/wall                    # Listar solicitudes
GET    /api/v1/wall/{request_id}       # Ver detalles
POST   /api/v1/wall                    # Crear solicitud
PUT    /api/v1/wall/{request_id}       # Actualizar solicitud
DELETE /api/v1/wall/{request_id}       # Eliminar solicitud
GET    /api/v1/wall/user/{user_id}/active  # Verificar solicitud activa
```

### Frontend (HTML/JS/CSS)

**Vistas HTML**:
- `/cart` → `cart.html` - Carrito de compras con modal de publicación
- `/wall` → `wall.html` - Tablón de deseos público
- `/checkout` → `checkout.html` - Página de pago

**JavaScript**:
- `cart-manager.js` - Gestor global del carrito (reutilizable)
- `cart.html` - Lógica de carrito e integración con wall
- `wall.html` - Lógica del tablón y filtros
- `checkout.html` - Lógica de pago

---

## 🚀 Cómo Funciona

### 1️⃣ Agregar Productos al Carrito

En cualquier página con productos, usa:
```html
<button onclick="addProductToCart('uuid-del-producto')">
  🛒 Agregar al carrito
</button>
```

El `cart-manager.js` maneja la lógica detrás.

### 2️⃣ Ver y Gestionar Carrito

Navega a `/cart`:
- Ver todos los productos agregados
- Aumentar/disminuir cantidad
- Eliminar productos
- Ver total en tiempo real
- Resumen lateral con totales

### 3️⃣ Publicar en The Wall

En la página del carrito, click "📌 Publicar en el Tablón":
1. Se abre un modal
2. Ingresa título (opcional) y mensaje (opcional)
3. Se muestra resumen de productos
4. Click "Publicar"
5. Se crea solicitud en `the_wall_requests` y se transfieren los items
6. Se redirige a `/wall`

**Validaciones**:
- Solo una solicitud activa (no completada) por usuario
- Si el usuario intenta crear otra, recibe error 409

### 4️⃣ Visualizar The Wall

En `/wall`:
- Ver TODAS las solicitudes públicas (no requiere login)
- Cada tarjeta muestra:
  - Avatar, nombre y edad del usuario (si disponible)
  - Género (si proporcionado)
  - Título y mensaje
  - Lista de productos con cantidades y precios
  - Total de la solicitud
  - Estado (activa/completada)
- Filtros:
  - **Todos**: muestra todas
  - **Activos**: solo las no completadas
  - **Completados**: solo las marcadas como completadas
- Click "Ver Detalles" abre modal con información expandida
- Cada usuario puede:
  - Marcar su solicitud como completada
  - Eliminar su solicitud

### 5️⃣ Proceder al Pago

En el carrito, click "💳 Proceder a Pagar" → `/checkout`:
- Formulario de envío (nombre, email, teléfono, dirección, etc.)
- Seleccionar método de pago:
  - **Tarjeta** (muestra formulario de tarjeta de crédito/débito)
  - **Transferencia** (PSE, Nequi, Daviplata)
  - **Efectivo** a la entrega
- Resumen del pedido con subtotal, envío e impuestos
- Botón "🔒 Pagar Ahora" (actualmente simula procesamiento)

---

## 📱 Navbar Integration

La navbar incluye:
- Botón "The Wall" (ya existía, ahora funcional)
- Badge dinámico del carrito mostrando cantidad de items
- El badge se actualiza automáticamente

---

## ⚙️ Configuración Técnica

### Ejecutar Migraciones SQL

En Supabase SQL Editor, ejecuta:

**PARTE 1** (DDL y RLS):
```sql
-- Copia TODO el contenido de valedissed_full_schema.sql
-- hasta el comentario "=== FIN PARTE 1 ==="
```

**PARTE 2** (Datos, opcional):
```sql
-- Si deseas migrar empresas existentes desde perfiles
-- Ejecuta la segunda parte del archivo
```

### Verificar Endpoints

Con la aplicación corriendo:
```bash
# Ver documentación de API
curl http://localhost:8000/docs

# Listar solicitudes del tablón
curl http://localhost:8000/api/v1/wall

# Ver una solicitud específica
curl http://localhost:8000/api/v1/wall/{request_id}
```

---

## 🔐 Row Level Security (RLS)

Las políticas RLS están configuradas para:
- **Lectura**: PÚBLICA - todos pueden ver (no requiere login)
- **Creación**: Solo usuarios autenticados
- **Modificación**: Solo el propietario de la solicitud
- **Eliminación**: Solo el propietario

---

## 🎨 Estilos y Tema

Todas las vistas usan:
- Tailwind CSS para diseño responsivo
- Tema de Valedissed (colores primarios: dorado, rosa)
- Modo claro/oscuro (dark mode completo)
- Animaciones suaves y transiciones

---

## 🔧 Personalización y Extensión

### Agregar Campos a la Solicitud

Editar `valedissed_full_schema.sql`:
```sql
ALTER TABLE public.the_wall_requests
ADD COLUMN IF NOT EXISTS nuevo_campo TEXT;
```

Luego actualizar schema de Pydantic y frontend.

### Integrar Proveedor de Pago

En `checkout.html`, función `processPayment()`:
```javascript
// Reemplazar la simulación con:
// 1. Stripe
const response = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
});

// 2. MercadoPago
mp.bricks.checkout({
    initialization: { amount: cartTotal },
    onSubmit: (data) => { /* procesar */ }
});

// 3. Otro proveedor
```

### Agregar Mensajería

En el modal de detalles del tablón, agregar:
```html
<button onclick="sendMessage(requestId)">
    💬 Enviar Mensaje
</button>
```

---

## 📊 Flujos API Completos

### Crear Solicitud en el Tablón

**Request**:
```bash
POST /api/v1/wall
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Busco productos de maquillaje",
  "message": "Preferencia: marcas no probadas",
  "items": [
    { "product_id": "uuid-1", "quantity": 2 },
    { "product_id": "uuid-2", "quantity": 1 }
  ]
}
```

**Response** (201):
```json
{
  "id": "request-uuid",
  "user_id": "user-uuid",
  "title": "Busco productos de maquillaje",
  "message": "Preferencia: marcas no probadas",
  "is_completed": false,
  "expires_at": "2026-06-09T12:34:56Z",
  "created_at": "2026-06-02T12:34:56Z",
  "updated_at": "2026-06-02T12:34:56Z",
  "user_username": "maria_style",
  "user_avatar": "https://...",
  "user_age": 25,
  "user_gender": "female",
  "items": [
    {
      "id": "item-uuid-1",
      "product_id": "uuid-1",
      "quantity": 2,
      "product_name": "Lipstick Red",
      "product_price": 25000.00,
      "product_cover_image": "https://..."
    }
  ],
  "total_items": 3,
  "total_price": 75000.00
}
```

### Listar Solicitudes Activas

**Request**:
```bash
GET /api/v1/wall?exclude_completed=true&limit=10
```

**Response** (200):
```json
[
  { /* estructura similar al anterior */ },
  { /* otra solicitud */ }
]
```

---

## ❌ Manejo de Errores

- **400**: Datos inválidos en la solicitud
- **401**: No autenticado
- **403**: No tienes permisos (no eres el dueño)
- **404**: Solicitud no encontrada
- **409**: Ya tienes una solicitud activa
- **500**: Error del servidor

---

## 🎯 Validaciones

1. ✅ Solo una solicitud activa por usuario
2. ✅ Usuario debe estar autenticado para crear
3. ✅ Solo el dueño puede editar/eliminar
4. ✅ Se valida que los productos existan
5. ✅ Se valida que la cantidad sea > 0
6. ✅ Se calcula edad desde birthdate

---

## 📝 Notas Importantes

- **Sin JWT en cookies**: Los tokens se usan vía localStorage
- **Carrito es temporal**: Se almacena en la base de datos, no en sessionStorage
- **Checkout requiere integración**: Actualmente solo valida datos
- **The Wall es público**: No requiere login para ver
- **Fotos de usuario**: Vienen del campo avatar_url de profiles

---

## 🚧 Próximos Pasos Opcionales

1. [ ] Integrar Stripe/MercadoPago
2. [ ] Email de confirmación de pago
3. [ ] Historial de pedidos en dashboard
4. [ ] Mensajería privada entre usuarios
5. [ ] Recomendaciones automáticas
6. [ ] Sistema de reseñas/ratings
7. [ ] Admin dashboard para todas las solicitudes

---

¡The Wall está listo para usar! 🚀
