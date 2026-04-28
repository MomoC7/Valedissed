from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os
from backend.app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Marketplace para belleza y moda femenina en Medellín",
    version=settings.VERSION,
    debug=settings.DEBUG,
)

# Configurar CORS (Útil para PWA e integraciones externas)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambiar por dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar archivos estáticos (Compilados desde frontend/src)
app.mount("/static", StaticFiles(directory="backend/app/static"), name="static")

# Configurar plantillas Jinja2
templates = Jinja2Templates(directory="backend/app/templates")

# Inyectar variables globales a las plantillas
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    request.state.project_name = settings.PROJECT_NAME
    response = await call_next(request)
    return response

# --- Registro de Rutas ---

@app.get("/api/v1/health")
async def health_check():
    """Endpoint para verificar el estado del sistema."""
    return {"status": "ok", "message": f"Sistema {settings.PROJECT_NAME} funcionando correctamente."}

@app.get("/")
async def root(request: Request):
    """Ruta de bienvenida o landing page principal."""
    return templates.TemplateResponse(
        request=request, 
        name="pages/index.html"
    )

if __name__ == "__main__":
    import uvicorn
    # En desarrollo activamos reload para que los cambios se reflejen al instante
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
