from fastapi import APIRouter, HTTPException, Depends
from backend.app.db.supabase_client import supabase, supabase_admin
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.crud.user import get_user, update_user
from backend.app.schemas.user import UserUpdate
from typing import List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_admin_user(current_user_id: str = Depends(get_current_user)):
    try:
        logger.info(f'[Admin Check] Verificando permisos para user: {current_user_id}')
        profile_response = supabase_admin.table("profiles").select("role").eq("id", current_user_id).execute()
        
        logger.info(f'[Admin Check] Response data: {profile_response.data}, attrs: {list(profile_response.__dict__.keys())}')
        
        if profile_response.data is None:
            logger.warning(f'[Admin Check] No profile found for user: {current_user_id}')
            raise HTTPException(status_code=403, detail="Perfil no encontrado.")
        
        user_role = profile_response.data[0].get("role", "cliente")
        logger.info(f'[Admin Check] User role: {user_role}')
        
        if user_role != "admin":
            logger.warning(f'[Admin Check] Usuario no es admin: {user_role}')
            raise HTTPException(status_code=403, detail="Acceso denegado: Se requieren permisos de administrador.")
        
        return current_user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Admin Check] Excepción inesperada: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/", response_model=list)
def list_all_users(admin_id: str = Depends(get_admin_user)):
    try:
        logger.info(f'[List Users] Admin {admin_id} solicitando lista de usuarios')
        
        response = supabase_admin.table("profiles").select("*").order("created_at", desc=True).execute()
        
        logger.info(f'[List Users] Response - Data length: {len(response.data) if response.data else 0}, attrs: {list(response.__dict__.keys())}')
        
        if response.data is None:
            logger.warning('[List Users] Response.data es None')
            return []
        
        logger.info(f'[List Users] Retornando {len(response.data)} usuarios')
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[List Users] Excepción inesperada: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error al obtener usuarios: {str(e)}")

@router.put("/{user_id}/status")
def toggle_user_status(user_id: str, admin_id: str = Depends(get_admin_user)):
    target_user = get_user(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target_user["id"] == admin_id:
        raise HTTPException(status_code=400, detail="No puedes suspender tu propia cuenta")
        
    current_status = target_user.get("status", "active")
    new_status = "suspended" if current_status == "active" else "active"
    
    updated_profile = update_user(user_id, UserUpdate(status=new_status))
    if not updated_profile:
        raise HTTPException(status_code=500, detail="Error al actualizar el estado")
        
    return {"message": f"Usuario {new_status}", "user": updated_profile}

# --- GESTIÓN DE SOLICITUDES DE SOCIO ---

class PartnerRequestReview(BaseModel):
    status: str 
    admin_comments: Optional[str] = None

@router.get("/partner-requests", response_model=list)
def list_partner_requests(admin_id: str = Depends(get_admin_user)):
    try:
        logger.info(f'[Partner Requests] Admin {admin_id} solicitando solicitudes pendientes')
        
        response = supabase_admin.table("partner_requests") \
            .select("*, profiles(*)") \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        
        logger.info(f'[Partner Requests] Response - Data: {response.data is not None}, Items: {len(response.data) if response.data else 0}, attrs: {list(response.__dict__.keys())}')
        
        if response.data is None:
            logger.error(f'[Partner Requests] Error obteniendo solicitudes, no data: {response.__dict__}')
            raise HTTPException(status_code=500, detail="Error obteniendo solicitudes pendientes.")
        
        logger.info(f'[Partner Requests] Retornando {len(response.data)} solicitudes pendientes')
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Partner Requests] Excepción inesperada: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error al obtener solicitudes: {str(e)}")

@router.put("/partner-requests/{request_id}/review")
def review_partner_request(request_id: str, review: PartnerRequestReview, admin_id: str = Depends(get_admin_user)):
    if review.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Estado inválido.")
        
    req_response = supabase_admin.table("partner_requests").select("*").eq("id", request_id).execute()
    if not req_response.data:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
        
    partner_req = req_response.data[0]
    user_id = partner_req["user_id"]
    
    update_req = supabase_admin.table("partner_requests") \
        .update({"status": review.status, "admin_comments": review.admin_comments}) \
        .eq("id", request_id) \
        .execute()

    logger.info(f'[Review Request] Update response data: {update_req.data}, attrs: {list(update_req.__dict__.keys())}')
    if update_req.data is None or len(update_req.data) == 0:
        logger.error(f'[Review Request] Update failed, response: {update_req.__dict__}')
        raise HTTPException(status_code=500, detail="Error actualizando solicitud.")

    if review.status == "approved":

        # RESTAURADO: Todos los campos originales que tenías
        profile_update = {
            "role": "partner",
            "partner_type": partner_req.get("partner_type"),
            "business_name": partner_req.get("business_name"),
            "partner_phone": partner_req.get("partner_phone"),
            "operation_zone": partner_req.get("operation_zone"),
            "years_experience": partner_req.get("years_experience"),
            "bio": partner_req.get("bio"),
            "partner_product_categories": partner_req.get("partner_product_categories"),
            "partner_service_categories": partner_req.get("partner_service_categories"),
            "certification_url": partner_req.get("certification_url"),
            "id_face_url": partner_req.get("id_face_url"),
            "is_verified": bool(partner_req.get("certification_url")),
            "is_identity_verified": bool(partner_req.get("id_face_url"))
        }
        
        # Mantenemos el uso de supabase_admin para evitar el error 500
        profile_response = supabase_admin.table("profiles") \
            .update(profile_update) \
            .eq("id", user_id) \
            .execute()

        logger.info(f'[Review Request] Profile update response data: {profile_response.data}, attrs: {list(profile_response.__dict__.keys())}')
        if profile_response.data is None:
            logger.error(f'[Review Request] Profile update failed, response: {profile_response.__dict__}')
            raise HTTPException(status_code=500, detail="Error actualizando perfil.")

        return {
            "message": "Solicitud aprobada correctamente.",
            "request": update_req.data[0],
            "profile": profile_response.data[0] if isinstance(profile_response.data, list) and len(profile_response.data) > 0 else None
        }

    return {"message": "Solicitud rechazada correctamente.", "request": update_req.data[0]}