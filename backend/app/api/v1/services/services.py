from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from backend.app.db.supabase_client import supabase, supabase_admin
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.schemas.service import ServiceCreate, ServiceUpdate
import time

router = APIRouter()

PARTNER_ROLES = {"partner", "business", "admin"}


def _require_partner(current_user: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("role").eq("id", current_user).execute()
    if not profile.data or profile.data[0].get("role") not in PARTNER_ROLES:
        raise HTTPException(status_code=403, detail="Solo los partners pueden realizar esta acción.")
    return current_user


# ===== LISTAR MIS SERVICIOS =====
@router.get("/my")
def get_my_services(current_user: str = Depends(_require_partner)):
    response = supabase.table("services").select("*").eq("provider_id", current_user).order("created_at", desc=True).execute()
    return response.data or []


# ===== LISTAR SERVICIOS PÚBLICOS =====
@router.get("/")
def get_services(category: str = None, search: str = None):
    query = supabase.table("services").select("*, profiles(username, business_name, avatar_url)").eq("is_active", True)
    if category:
        query = query.eq("category", category)
    response = query.order("created_at", desc=True).execute()
    services = response.data or []
    if search:
        search_lower = search.lower()
        services = [s for s in services if search_lower in (s.get("title") or "").lower()
                    or search_lower in (s.get("description") or "").lower()]
    return services


# ===== OBTENER UN SERVICIO =====
@router.get("/{service_id}")
def get_service(service_id: str):
    response = supabase.table("services").select("*, profiles(username, business_name, avatar_url)").eq("id", service_id).eq("is_active", True).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Servicio no encontrado.")
    return response.data[0]


# ===== CREAR SERVICIO =====
@router.post("/")
def create_service(service_data: ServiceCreate, current_user: str = Depends(_require_partner)):
    data = service_data.model_dump()
    data["provider_id"] = current_user
    data["is_active"] = True

    company_resp = supabase_admin.table("companies").select("id").eq("owner_id", current_user).limit(1).execute()
    if company_resp.data:
        data["company_id"] = company_resp.data[0].get("id")

    response = supabase.table("services").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="No se pudo crear el servicio.")
    return response.data[0]


# ===== ACTUALIZAR SERVICIO =====
@router.put("/{service_id}")
def update_service(service_id: str, service_data: ServiceUpdate, current_user: str = Depends(_require_partner)):
    existing = supabase.table("services").select("provider_id").eq("id", service_id).execute()
    if not existing.data or existing.data[0]["provider_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este servicio.")

    update_data = service_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar.")

    response = supabase.table("services").update(update_data).eq("id", service_id).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el servicio.")
    return response.data[0]


# ===== ELIMINAR SERVICIO (desactivar) =====
@router.delete("/{service_id}")
def delete_service(service_id: str, current_user: str = Depends(_require_partner)):
    existing = supabase.table("services").select("provider_id").eq("id", service_id).execute()
    if not existing.data or existing.data[0]["provider_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso.")
    supabase.table("services").update({"is_active": False}).eq("id", service_id).execute()
    return {"message": "Servicio eliminado correctamente."}


import logging
logger = logging.getLogger(__name__)

# ===== SUBIR IMAGEN DE SERVICIO =====
@router.post("/{service_id}/images")
async def upload_service_image(
    service_id: str,
    file: UploadFile = File(...),
    is_cover: bool = False,
    current_user: str = Depends(_require_partner)
):
    try:
        logger.info(f"[Upload Service Image] Starting for service {service_id}")
        existing = supabase_admin.table("services").select("provider_id, portfolio_images, cover_image_url").eq("id", service_id).execute()
        if not existing.data or existing.data[0]["provider_id"] != current_user:
            raise HTTPException(status_code=403, detail="No tienes permiso.")

        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        current_portfolio = existing.data[0].get("portfolio_images") or []
        if len(current_portfolio) >= 6:
            raise HTTPException(status_code=400, detail="Has alcanzado el límite de 6 fotos en el portafolio.")

        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1]
        file_path = f"services/{current_user}/{service_id}/img_{int(time.time())}.{file_ext}"
        logger.info(f"[Upload Service Image] Uploading to {file_path}")

        res = supabase_admin.storage.from_("valedissed_media").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        logger.info(f"[Upload Service Image] Storage upload response: {res}")

        public_url = supabase_admin.storage.from_("valedissed_media").get_public_url(file_path)
        logger.info(f"[Upload Service Image] Public URL: {public_url}")

        update_data = {"portfolio_images": current_portfolio + [public_url]}
        if is_cover or not existing.data[0].get("cover_image_url"):
            update_data["cover_image_url"] = public_url

        update_resp = supabase_admin.table("services").update(update_data).eq("id", service_id).execute()
        logger.info(f"[Upload Service Image] DB update response: {update_resp}")
        
        return {"url": public_url, "is_cover": is_cover or not existing.data[0].get("cover_image_url")}
    except Exception as e:
        logger.exception(f"[Upload Service Image] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al subir la imagen: {str(e)}")
