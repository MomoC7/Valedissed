from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.crud.company import get_company_by_owner, update_company
from backend.app.schemas.company import CompanyOut, CompanyUpdate
from backend.app.db.supabase_client import supabase_admin as supabase
import logging
import time

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me", response_model=CompanyOut)
def get_my_company(current_user: str = Depends(get_current_user)):
    company = get_company_by_owner(current_user)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")
    return company

@router.put("/me", response_model=CompanyOut)
def update_my_company(company_data: CompanyUpdate, current_user: str = Depends(get_current_user)):
    company = get_company_by_owner(current_user)
    if not company:
        raise HTTPException(status_code=404, detail="No existe una empresa registrada para este socio.")
    updated_company = update_company(current_user, company_data)
    if not updated_company:
        raise HTTPException(status_code=400, detail="No se pudo actualizar la empresa.")
    return updated_company

@router.post("/me/avatar")
async def upload_company_avatar(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")
        
        # Obtener la empresa del usuario
        company = get_company_by_owner(current_user)
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada.")
        
        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # Ruta organizada: avatars/companies/{company_id}/avatar_{timestamp}.{ext}
        # company es un dict, así que usamos ["id"] en lugar de .id
        company_id = company["id"]
        file_path = f"companies/{company_id}/avatar_{int(time.time())}.{file_ext}"
        
        # Subir a Supabase Storage
        res = supabase.storage.from_("avatars").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener la URL pública
        public_url = supabase.storage.from_("avatars").get_public_url(file_path)
        
        # Actualizar la empresa en la base de datos
        updated_company = update_company(current_user, CompanyUpdate(avatar_url=public_url))
        if not updated_company:
            raise HTTPException(status_code=400, detail="Imagen subida, pero no se pudo actualizar la empresa.")
            
        return {"avatar_url": public_url, "message": "Foto de empresa actualizada"}
        
    except Exception as e:
        logger.exception(f"Error uploading company avatar: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")
