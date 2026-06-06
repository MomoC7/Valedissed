from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from backend.app.core.config import settings
from backend.app.api.v1.api import api_router 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Marketplace para belleza y moda femenina en Medellín",
    version=settings.VERSION,
    debug=settings.DEBUG,
)

# --- Manejador global de excepciones ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception at {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno del servidor: {str(exc)}"}
    )

# --- Configuración de Archivos ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Montaje de archivos estáticos y plantillas
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registro de Routers ---
app.include_router(api_router, prefix=settings.API_V1_STR)

# --- Rutas de Frontend y Utilidad ---

@app.get("/")
async def root(request: Request):
    # Página de bienvenida pública (no requiere autenticación)
    return templates.TemplateResponse(
        request=request, 
        name="pages/welcome.html", 
        context={"settings": settings}
    )

@app.get("/dashboard")
async def dashboard(request: Request):
    # Dashboard para usuarios autenticados
    return templates.TemplateResponse(
        request=request,
        name="pages/index.html",
        context={"settings": settings}
    )

@app.get("/admin")
async def admin_page(request: Request):
    """Vista centralizada del Panel de Administración."""
    return templates.TemplateResponse(
        request=request,
        name="pages/admin/index.html",
        context={"settings": settings}
    )

@app.get("/health")
async def health_check():
    """Endpoint de salud para pruebas de HTMX y monitoreo."""
    return {
        "status": "ok", 
        "project": settings.PROJECT_NAME,
        "environment": settings.ENV
    }

@app.get("/profile")
async def profile_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/profile.html",
        context={"settings": settings}
    )

@app.get("/admin/users")
async def admin_users_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/admin/users.html",
        context={"settings": settings}
    )

@app.get("/auth/confirm")
async def confirm_email(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/auth/confirm.html",
        context={"settings": settings}
    )

@app.get("/forgot-password")
async def forgot_password_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/auth/forgot_password.html",
        context={"settings": settings}
    )

@app.get("/auth/reset-password")
async def reset_password_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/auth/reset_password.html",
        context={"settings": settings}
    )

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/auth/login.html",
        context={"settings": settings}
    )

@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/auth/register.html",
        context={"settings": settings}
    )

@app.get("/marketplace")
async def marketplace_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/marketplace.html",
        context={"settings": settings}
    )

@app.get("/product/{product_id}")
async def product_page(request: Request, product_id: str):
    return templates.TemplateResponse(
        request=request,
        name="pages/product_detail.html",
        context={"settings": settings, "product_id": product_id}
    )

@app.get("/mi-empresa")
async def my_company_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/seller/products.html",
        context={"settings": settings}
    )

@app.get("/seller/products")
async def seller_products_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/seller/products.html",
        context={"settings": settings}
    )

@app.get("/seller/services")
async def seller_services_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/seller/services.html",
        context={"settings": settings}
    )

@app.get("/seller/{seller_id}")
async def seller_profile_page(request: Request, seller_id: str):
    return templates.TemplateResponse(
        request=request,
        name="pages/seller_profile.html",
        context={"settings": settings, "seller_id": seller_id}
    )

@app.get("/wall")
async def wall_page(request: Request):
    """Tablón de deseos - The Wall"""
    return templates.TemplateResponse(
        request=request,
        name="pages/wall.html",
        context={"settings": settings}
    )

@app.get("/cart")
async def cart_page(request: Request):
    """Página del carrito de compras"""
    return templates.TemplateResponse(
        request=request,
        name="pages/cart.html",
        context={"settings": settings}
    )

@app.get("/checkout")
async def checkout_page(request: Request):
    """Página de pago/checkout"""
    return templates.TemplateResponse(
        request=request,
        name="pages/checkout.html",
        context={"settings": settings}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)