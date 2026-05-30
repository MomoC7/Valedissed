from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from backend.app.db.supabase_client import supabase, supabase_admin
from backend.app.api.v1.auth.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Schema de Solicitud de Socio
class PartnerRequestCreate(BaseModel):
    partner_type: str
    business_name: str
    partner_phone: str
    operation_zone: str
    years_experience: int
    bio: str
    partner_product_categories: Optional[List[str]] = []
    partner_service_categories: Optional[List[str]] = []
    certification_url: Optional[str] = None
    id_face_url: Optional[str] = None

# Intentar inicializar el bucket de almacenamiento al importar
try:
    supabase.storage.create_bucket("verifications", options={"public": True})
    print("Bucket 'verifications' creado o verificado.")
except Exception as e:
    # Si ya existe, fallará, lo cual es normal.
    pass

@router.post("/upload")
async def upload_verification_file(
    file: UploadFile = File(...),
    file_type: str = Form(...), # "certificate" o "face"
    current_user: str = Depends(get_current_user)
):
    """
    Sube un archivo de verificación (Diploma o Selfie KYC) a Supabase Storage.
    Retorna la URL pública del archivo.
    """
    try:
        # Validar tipo de contenido básico
        is_pdf = file.content_type == "application/pdf"
        is_image = file.content_type.startswith("image/")
        
        if not (is_pdf or is_image):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser un documento PDF o una imagen válida (PNG, JPG, JPEG)."
            )
            
        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # Generar nombre único para evitar colisiones y cache
        file_path = f"{current_user}/{file_type}_{int(time.time())}.{file_ext}"
        
        # Subir archivo al bucket 'verifications' usando el cliente admin
        res = supabase_admin.storage.from_("verifications").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        # Generar URL firmada (o pública si el bucket lo permite, pero mejor firmada por seguridad)
        # Como el bucket es privado, usamos create_signed_url
        signed_url_res = supabase_admin.storage.from_("verifications").create_signed_url(file_path, 3600)
        
        return {
            "url": signed_url_res.get("signedURL") if isinstance(signed_url_res, dict) else None, 
            "file_path": file_path
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error subiendo archivo: {error_msg}")
        raise HTTPException(
            status_code=400, 
            detail={
                "error": "Error al procesar el archivo en el servidor de almacenamiento.",
                "details": error_msg
            }
        )

@router.post("/request")
def create_partner_request(
    request_data: PartnerRequestCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Crea una solicitud de socio pendiente de revisión.
    Si ya existe una solicitud 'pending', no permite crear otra.
    """
    # 1. Comprobar si ya existe una solicitud pendiente
    check_response = supabase.table("partner_requests") \
        .select("*") \
        .eq("user_id", current_user) \
        .eq("status", "pending") \
        .execute()
        
    if check_response.data:
        raise HTTPException(
            status_code=409,
            detail="Ya tienes una solicitud de socio pendiente de revisión."
        )
        
    # 2. Insertar solicitud
    try:
        insert_response = supabase_admin.table("partner_requests").insert({
            "user_id": current_user,
            "partner_type": request_data.partner_type,
            "business_name": request_data.business_name,
            "partner_phone": request_data.partner_phone,
            "operation_zone": request_data.operation_zone,
            "years_experience": request_data.years_experience,
            "bio": request_data.bio,
            "partner_product_categories": request_data.partner_product_categories,
            "partner_service_categories": request_data.partner_service_categories,
            "certification_url": request_data.certification_url,
            "id_face_url": request_data.id_face_url,
            "status": "pending"
        }).execute()
        
        logger.info(f'[Partner Request Create] Insert response data: {insert_response.data}, attrs: {list(insert_response.__dict__.keys())}')
        
        if insert_response.data is None or len(insert_response.data) == 0:
            logger.error(f'[Partner Request Create] Insert failed, response: {insert_response.__dict__}')
            raise HTTPException(status_code=500, detail="No se pudo registrar la solicitud.")
            
        return {"message": "Solicitud enviada con éxito.", "request": insert_response.data[0]}
    except Exception as e:
        logger.exception(f'[Partner Request Create] Error de base de datos: {str(e)}')
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {str(e)}")

@router.get("/my-request")
def get_my_partner_request(current_user: str = Depends(get_current_user)):
    """
    Retorna la solicitud más reciente del usuario logueado.
    """
    try:
        response = supabase.table("partner_requests") \
            .select("*") \
            .eq("user_id", current_user) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
            
        if not response.data:
            return {"request": None}
            
        return {"request": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar solicitud: {str(e)}")
