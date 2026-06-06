from fastapi import APIRouter
from backend.app.api.v1.users import users
from backend.app.api.v1.auth import auth
from backend.app.api.v1.admin import users as admin_users
from backend.app.api.v1.products import products
from backend.app.api.v1.services import services
from backend.app.api.v1.companies import router as companies_router
from backend.app.api.v1.cart import cart
from backend.app.api.v1.partner import requests as partner_requests
from backend.app.api.v1.wall import wall
from backend.app.api.v1 import notifications

api_router = APIRouter()

# Aquí irás conectando todos tus módulos nuevos
api_router.include_router(users.router, prefix="/users", tags=["Usuarios"])
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(admin_users.router, prefix="/admin/users", tags=["Administración de Usuarios"])
api_router.include_router(products.router, prefix="/products", tags=["Productos"])
api_router.include_router(services.router, prefix="/services", tags=["Servicios"])
api_router.include_router(companies_router, prefix="/companies", tags=["Empresas"])
api_router.include_router(cart.router, prefix="/cart", tags=["Carrito"])
api_router.include_router(partner_requests.router, prefix="/partner", tags=["Socios / Verificación"])
api_router.include_router(wall.router, prefix="/wall", tags=["Tablón de Deseos"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notificaciones"])

# En el futuro harás:
# api_router.include_router(wall.router, prefix="/wall", tags=["The Wall"])