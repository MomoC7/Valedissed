# Valedissed

Valedissed es un marketplace centralizado (PWA) orientado a productos y servicios de belleza y moda para mujeres en Medellín. Este repositorio contiene el backend (FastAPI), plantillas web (Jinja2 + HTMX) y activos frontend para el desarrollo.

**Estado**: En desarrollo — arquitectura modular lista para integrar servicios externos (Supabase, Stripe, etc.).

**Contenido principal**

- **Backend**: API y rutas web con FastAPI (Python).
- **Frontend**: Plantillas Jinja2 + HTMX, estilos con Tailwind CSS y JavaScript ligero.
- **DB**: PostgreSQL (orientado a Supabase) con migraciones gestionadas por Alembic.

**Estructura resumida del proyecto**

```text
Valedissed/
├── alembic/                # Migraciones de base de datos (alembic)
├── backend/                # Código servidor y web
│   ├── app/
│   │   ├── api/v1/         # Endpoints JSON (versionados)
│   │   ├── web/            # Rutas HTML / vistas (Jinja2 + HTMX)
│   │   ├── core/           # Configuración y settings
│   │   ├── db/             # Sesión DB, base class, cliente Supabase
+│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── crud/           # Lógica CRUD reutilizable
│   │   ├── services/       # Integraciones (Stripe, Storage, etc.)
│   │   ├── static/         # Archivos estáticos finales
│   │   └── templates/      # Plantillas Jinja2
├── db/                     # SQL de migraciones y esquemas (aux)
├── docs/                   # Documentos, bocetos y planes
├── tests/                  # Pruebas unitarias e integración
├── frontend/               # Fuente frontend (Tailwind, scripts)
└── requirements.txt        # Dependencias Python
```

**Principales funcionalidades**

- API REST versionada para gestión de usuarios, productos, servicios, notificaciones y carrito.
- Rutas web renderizadas con Jinja2 + HTMX para una UX ligera y progresiva.
- Sistema de subida/almacenamiento (preparado para conectar S3/Supabase Storage).
- Integración prevista con Stripe Connect para pagos y cobros a proveedores.
- Sistema de migraciones con Alembic y modelos SQLAlchemy.

**Tecnologías y herramientas**

- Lenguajes: Python 3.11+ (backend), JavaScript para frontend ligero.
- Frameworks: FastAPI, Jinja2, HTMX, Tailwind CSS.
- ORM / Migraciones: SQLAlchemy, Alembic.
- DB y BaaS: PostgreSQL (orientado a Supabase).
- Pagos: Stripe Connect (integración en `services`).
- Tests: Estructura de tests en `tests/` para unit e integración.

**Conexiones externas / Variables de entorno**

El proyecto requiere variables de entorno para funcionar correctamente (ejemplos):

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Supabase (si se usa)
SUPABASE_URL=
SUPABASE_KEY=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# Otros
SECRET_KEY=
```

Comprueba y adapta `.env` según tu proveedor. Algunos valores están referenciados desde `backend/app/core/config.py`.

**Instalación y ejecución local (rápida)**

1) Crear y activar entorno virtual (Windows):

```bash
python -m venv venv
venv\\Scripts\\activate
```

2) Instalar dependencias:

```bash
pip install -r requirements.txt
```

3) Variables de entorno: crea un archivo `.env` en la raíz con las claves necesarias.

4) Ejecutar migraciones (Alembic):

```bash
alembic upgrade head
```

5) Iniciar la aplicación (punto de entrada):

```bash
python backend/app/main.py
```

6) Frontend (si aplicable):

```bash
cd frontend
npm install
npm run build:css
```

**Archivos y rutas clave**

- Archivo principal backend: [backend/app/main.py](backend/app/main.py)
- Rutas API v1: [backend/app/api/v1](backend/app/api/v1)
- Configuración: [backend/app/core/config.py](backend/app/core/config.py)
- Modelos y esquemas: [backend/app/models](backend/app/models) y [backend/app/schemas](backend/app/schemas)
- Migraciones Alembic: [alembic/](alembic)

**Testing**

Ejecuta las pruebas unitarias e de integración con tu runner preferido (`pytest` si está configurado):

```bash
pytest -q
```

**Guía de desarrollo y buenas prácticas**

- Sigue la estructura `api/v1` para nuevas rutas JSON y `web/` para vistas HTML.
- Centraliza la lógica de negocio en `services/` y las operaciones DB en `crud/`.
- Registra nuevas migraciones con `alembic revision --autogenerate -m \"mensaje\"`.
- Añade tests para cada nueva funcionalidad en `tests/`.

**Contribuir**

1. Crea un fork/branch.
2. Añade tests y documentación de la funcionalidad.
3. Abre un pull request describiendo cambios y cómo probarlos.

**Contacto y recursos**

- Documentación interna: `docs/`.
- Para dudas sobre la ejecución local, revisa `README.md` y `backend/app/core/config.py`.

---

Si quieres, puedo:

- Ejecutar las pruebas del proyecto.
- Añadir un checklist de variables de entorno en un archivo `.env.example`.
- Generar una sección con ejemplos de endpoints (postman/curl).

He actualizado el `README.md` con esta versión más completa y profesional.

