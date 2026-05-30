from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr
from backend.app.db.supabase_client import supabase
from backend.app.schemas.auth import UserRegister, UserLogin, Token, TokenData
from backend.app.schemas.user import UserUpdate, UserOut
from backend.app.core.config import settings
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import time
import logging

logger = logging.getLogger(__name__)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

router = APIRouter()

@router.post("/register")
def register_with_auth(user_data: UserRegister):
    # 1. Crear el usuario en la tabla interna de Supabase (auth.users)
    # Esto envía el correo y clave por el puerto seguro 443
    auth_response = supabase.auth.sign_up({
        "email": user_data.email,
        "password": user_data.password,
    })

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Error al crear la cuenta de autenticación")

    # 2. El ID real generado por Supabase[cite: 3]
    user_id = auth_response.user.id

    # 3. Ahora sí, creamos el perfil vinculado a ese ID real
    # Como el ID ya existe en auth.users, la restricción de FK no saltará
    profile_response = supabase.table("profiles").insert({
        "id": str(user_id),
        "username": user_data.username,
        "full_name": user_data.full_name,
        "gender": user_data.gender,
        "role": "cliente"
    }).execute()

    return {"message": "Usuario registrado exitosamente", "profile": profile_response.data[0]}

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")

        # Crear JWT local
        access_token = create_access_token(data={"sub": auth_response.user.id})
        
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Error de autenticación")

@router.get("/me")
def get_current_user_profile(current_user: str = Depends(get_current_user)):
    try:
        logger.info(f'[Auth Me] Fetching profile for user: {current_user}')
        # Obtener perfil desde Supabase
        profile_response = supabase.table("profiles").select("*").eq("id", current_user).execute()
        
        logger.info(f'[Auth Me] Response data: {profile_response.data is not None}, Error: {getattr(profile_response, "error", None)}')
        
        if not profile_response.data:
            logger.warning(f'[Auth Me] Profile not found for user: {current_user}')
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
        
        user_profile = profile_response.data[0]
        logger.info(f'[Auth Me] Profile retrieved: {{"username": {user_profile.get("username")}, "role": {user_profile.get("role")}}}')
        
        return user_profile
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Auth Me] Unexpected error: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error obteniendo perfil: {str(e)}")

@router.put("/me")
def update_current_user_profile(user_data: UserUpdate, current_user: str = Depends(get_current_user)):
    from backend.app.crud.user import update_user
    
    try:
        # Filtrar campos nulos para evitar errores de validación en BD
        update_dict = user_data.model_dump(exclude_unset=True)
        if not update_dict:
            return get_current_user_profile(current_user)

        updated_profile = update_user(current_user, user_data)
        if not updated_profile:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el perfil.")
        return updated_profile
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        error_msg = str(e)
        # Blindaje contra errores de esquema
        if "column" in error_msg:
            raise HTTPException(status_code=400, detail="Error de esquema en la base de datos.")
        raise HTTPException(status_code=400, detail=f"Error al actualizar: {error_msg}")

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")
        
        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # Nombre único usando timestamp para evitar caché en el navegador
        file_path = f"{current_user}/avatar_{int(time.time())}.{file_ext}"
        
        # Subir a Supabase Storage (el backend usa su key para tener permiso)
        # Si ya existe un archivo, upload() fallaría por defecto si no le ponemos upsert, pero 
        # al usar timestamp en el nombre, siempre será nuevo.
        res = supabase.storage.from_("avatars").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener la URL pública del archivo recién subido
        public_url = supabase.storage.from_("avatars").get_public_url(file_path)
        
        # Actualizar la base de datos
        from backend.app.crud.user import update_user
        updated_profile = update_user(current_user, UserUpdate(avatar_url=public_url))
        
        if not updated_profile:
             raise HTTPException(status_code=400, detail="Imagen subida, pero no se pudo actualizar el perfil.")
             
        return {"avatar_url": public_url, "message": "Foto de perfil actualizada"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")

@router.delete("/me/avatar")
async def delete_avatar(current_user: str = Depends(get_current_user)):
    try:
        from backend.app.crud.user import update_user
        # Obtener usuario actual para buscar la URL del avatar
        profile_response = supabase.table("profiles").select("avatar_url").eq("id", current_user).execute()
        
        if profile_response.data and profile_response.data[0].get("avatar_url"):
            avatar_url = profile_response.data[0]["avatar_url"]
            # Extraer el path del archivo desde la URL pública
            # El path usualmente está después de "/avatars/"
            if "/avatars/" in avatar_url:
                file_path = avatar_url.split("/avatars/")[-1]
                # Intentar eliminar del storage
                try:
                    supabase.storage.from_("avatars").remove([file_path])
                except Exception as e:
                    print(f"Error borrando del storage (no crítico): {e}")

        # Poner la url en null en la DB
        updated_profile = update_user(current_user, UserUpdate(avatar_url=None))
        if not updated_profile:
            raise HTTPException(status_code=400, detail="No se pudo eliminar el avatar del perfil.")
            
        return {"message": "Foto de perfil eliminada"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar la imagen: {str(e)}")


# ===== RECUPERACIÓN DE CONTRASEÑA =====

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    access_token: str
    refresh_token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    """
    Envía un correo de recuperación de contraseña usando Supabase Auth.
    El enlace del correo redirige a /auth/reset-password con los tokens en el hash de la URL.
    """
    try:
        supabase.auth.reset_password_email(
            data.email,
            options={"redirect_to": "http://localhost:8000/auth/reset-password"}
        )
        # Siempre respondemos éxito para no revelar si el email existe o no
        return {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}
    except Exception as e:
        # No exponemos el error real para no revelar existencia del email
        return {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """
    Actualiza la contraseña del usuario usando los tokens del enlace de recuperación.
    El frontend extrae access_token y refresh_token del hash de la URL del correo.
    """
    try:
        # Establecer la sesión con los tokens del correo
        session_response = supabase.auth.set_session(data.access_token, data.refresh_token)
        if not session_response.user:
            raise HTTPException(status_code=400, detail="Enlace inválido o expirado.")

        # Actualizar la contraseña
        update_response = supabase.auth.update_user({"password": data.new_password})
        if not update_response.user:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la contraseña.")

        return {"message": "Contraseña actualizada exitosamente."}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=400, detail="Enlace inválido o expirado.")