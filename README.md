# Valedissed

Marketplace centralizado (PWA) enfocado en productos y servicios de belleza y moda para mujeres en Medellín.

## Estructura del Proyecto (Profesional)

```text
Valedissed/
├── alembic/              # Migraciones de base de datos
├── backend/app/          # Lógica del servidor (FastAPI)
│   ├── api/v1/           # Endpoints JSON (Versionados)
│   │   ├── auth/         # Autenticación JWT
│   │   ├── users/        # Gestión de usuarios
│   │   ├── products/     # CRUD de productos
│   │   ├── services/     # Gestión de servicios/especialistas
│   │   ├── appointments/ # Sistema de citas
│   │   └── wall/         # Sistema de regalos (The Wall)
│   ├── web/              # Rutas HTML (Jinja2 + HTMX)
│   ├── core/             # Configuración (Pydantic Settings), Seguridad
│   ├── db/               # Sesión de DB, Base Class para modelos
│   ├── models/           # Modelos de SQLAlchemy
│   ├── schemas/          # Esquemas de Pydantic
│   ├── crud/             # Operaciones CRUD reutilizables
│   ├── services/         # Lógica de negocio (Stripe, Storage, etc.)
│   ├── static/           # Archivos estáticos finales (Compilados)
│   ├── templates/        # Plantillas Jinja2 (Organizadas por páginas/componentes)
│   └── main.py           # Punto de entrada de la aplicación
├── frontend/             # Archivos fuente para el desarrollo (Assets)
│   ├── src/              # CSS (Tailwind) y JS fuente
│   ├── tailwind.config.js
│   └── package.json
├── tests/                # Pruebas automatizadas (Unit e Integration)
├── docs/                 # Documentación y bocetos del proyecto
├── .env                  # Variables de entorno (Base configurada)
└── requirements.txt      # Dependencias profesionales
```

## Tecnologías Principales

- **Backend**: FastAPI (Python 3.13) + SQLAlchemy + Alembic
- **Frontend**: Jinja2 + HTMX + Tailwind CSS + Alpine.js (ligero)
- **Base de Datos**: PostgreSQL (Supabase)
- **Pagos**: Stripe Connect

## Configuración Inicial

1. **Entorno Virtual**: `python -m venv venv` y `source venv/bin/activate` (o `venv\Scripts\activate` en Windows).
2. **Dependencias**: `pip install -r requirements.txt`.
3. **Variables de Entorno**: Configura el archivo `.env` con tus credenciales.
4. **Base de Datos**: Usa Alembic para las migraciones iniciales.
5. **Ejecución**: `python backend/app/main.py`.

## Desarrollo Frontend
1. Ve a `frontend/` e instala Node: `npm install`.
2. Compila estilos: `npm run build:css`.
3. Para desarrollo continuo: `npm run watch:css`.
