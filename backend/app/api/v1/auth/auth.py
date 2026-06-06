from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr
from backend.app.db.supabase_client import supabase, supabase_admin
from backend.app.schemas.auth import UserRegister, UserLogin, Token, TokenData
from backend.app.schemas.user import UserUpdate
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
    logger.info(f"[Register] Starting registration for email: {user_data.email}, username: {user_data.username}")
    try:
        # Validar que gender sea uno de los valores permitidos
        if user_data.gender not in ["female", "male", "other"]:
            raise HTTPException(status_code=400, detail="Género inválido. Debe ser 'female', 'male' o 'other'")

        # 1. Verificar que el username no esté ya en uso
        logger.info("[Register] Checking username availability...")
        username_check = supabase_admin.table("profiles").select("username").eq("username", user_data.username).execute()
        if username_check.data:
            logger.error(f"[Register] Username already exists")
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

        # 2. Primero, revisar si ya hay un perfil para este email (por si el usuario existe en auth pero no en profiles)
        # Primero, intentar crear el usuario en auth, pero si ya existe, intentar crear el perfil
        user_id = None
        try:
            # Intentar crear el usuario en auth
            logger.info("[Register] Creating Supabase auth user...")
            auth_response = supabase.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
            })
            logger.info(f"[Register] Supabase auth response: {auth_response}")

            # Check for errors using the new Supabase SDK structure
            user = None
            session = None
            if hasattr(auth_response, 'data'):
                user = auth_response.data.user
                session = auth_response.data.session
            else:
                user = auth_response.user
                session = auth_response.session

            # Check if user was created successfully
            if not user:
                # Try to get error from the response
                error_msg = "Error al crear la cuenta de autenticación"
                if hasattr(auth_response, 'error'):
                    error_msg = str(auth_response.error)
                elif hasattr(auth_response, 'message'):
                    error_msg = str(auth_response.message)
                # Check if the error is about email already registered
                error_lower = error_msg.lower()
                if "already registered" in error_lower or "already exists" in error_lower or "user already registered" in error_lower:
                    error_msg = "El correo electrónico ya está registrado"
                elif "password" in error_lower:
                    error_msg = "La contraseña debe tener al menos 6 caracteres"
                logger.error(f"[Register] Supabase auth error: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)

            user_id = user.id
        except HTTPException as e:
            if e.detail == "El correo electrónico ya está registrado":
                # Verificar si existe un perfil para este email!
                # Primero, buscar el user_id en auth.users (no podemos, pero podemos buscar el perfil por email? No, perfiles no tienen email, pero sí username
                # Otra opción: permitir que el usuario se loguee, pero para este caso, mejor:
                raise
            raise

        logger.info(f"[Register] Got Supabase user ID: {user_id}")

        # 3. Ahora, verificar si ya existe un perfil para este user_id
        existing_profile = supabase_admin.table("profiles").select("*").eq("id", str(user_id)).execute()
        if existing_profile.data:
            logger.info(f"[Register] Profile already exists for user {user_id}")
            return {"message": "Usuario ya registrado", "profile": existing_profile.data[0]}

        # 4. Ahora sí, creamos el perfil vinculado a ese ID real
        logger.info("[Register] Creating profile in profiles table...")
        # Insertar solo los campos obligatorios
        profile_insert_data = {
            "id": str(user_id),
            "username": user_data.username,
            "full_name": user_data.full_name,
            "role": "cliente"
        }
        # Añadir gender solo si existe la columna (lo incluimos porque el schema lo tiene)
        profile_insert_data["gender"] = user_data.gender
        profile_response = supabase_admin.table("profiles").insert(profile_insert_data).execute()
        logger.info(f"[Register] Profile insert response: {profile_response}")

        # Verificar que el perfil se creó correctamente
        if not profile_response.data:
            logger.error(f"[Register] Profile insert failed, no data returned")
            raise HTTPException(status_code=500, detail="Error al crear el perfil de usuario")

        return {"message": "Usuario registrado exitosamente", "profile": profile_response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Register] Unexpected error: {str(e)}")
        error_str = str(e).lower()
        if "duplicate key" in error_str or "unique constraint" in error_str:
            if "username" in error_str:
                raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
            elif "email" in error_str:
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        raise HTTPException(status_code=400, detail=f"Error en el registro: {str(e)}")

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password
        })

        # Check for user and session using the new Supabase SDK structure
        user = None
        session = None
        if hasattr(auth_response, 'data'):
            user = auth_response.data.user
            session = auth_response.data.session
        else:
            user = auth_response.user
            session = auth_response.session

        if not user or not session:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")

        # Crear JWT local
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Login] Unexpected error: {str(e)}")
        raise HTTPException(status_code=401, detail="Error de autenticación")

@router.get("/me")
def get_current_user_profile(current_user: str = Depends(get_current_user)):
    try:
        logger.info(f'[Auth Me] Fetching profile for user: {current_user}')
        # Obtener perfil desde Supabase usando supabase_admin para evitar RLS issues
        profile_response = supabase_admin.table("profiles").select("*").eq("id", current_user).execute()
        
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
        # Log incoming data
        logger.info(f'[Update Profile] User: {current_user}, Incoming data: {user_data.model_dump(exclude_unset=True)}')
        
        # Filtrar campos nulos para evitar errores de validación en BD
        update_dict = user_data.model_dump(exclude_unset=True)
        if not update_dict:
            logger.info('[Update Profile] No data to update')
            return get_current_user_profile(current_user)

        updated_profile = update_user(current_user, user_data)
        if not updated_profile:
            logger.error('[Update Profile] update_user returned None')
            raise HTTPException(status_code=400, detail="No se pudo actualizar el perfil.")
        
        logger.info(f'[Update Profile] Profile updated successfully: {updated_profile}')
        return updated_profile
    except ValueError as ve:
        logger.error(f'[Update Profile] Validation error: {ve}')
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException as http_exc:
        logger.error(f'[Update Profile] HTTP error: {http_exc.detail}')
        raise http_exc
    except Exception as e:
        logger.exception(f'[Update Profile] Unexpected error: {str(e)}')
        error_msg = str(e)
        # Blindaje contra errores de esquema
        if "column" in error_msg:
            raise HTTPException(status_code=400, detail="Error de esquema en la base de datos.")
        raise HTTPException(status_code=400, detail=f"Error al actualizar: {error_msg}")

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    try:
        logger.info(f"[Upload Avatar] Starting for user {current_user}")
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")
        
        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # Nombre único usando timestamp para evitar caché en el navegador
        file_path = f"{current_user}/avatar_{int(time.time())}.{file_ext}"
        logger.info(f"[Upload Avatar] Uploading to {file_path}")
        
        # Subir a Supabase Storage usando supabase_admin para evitar RLS issues
        res = supabase_admin.storage.from_("avatars").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        logger.info(f"[Upload Avatar] Storage upload response: {res}")
        
        # Obtener la URL pública del archivo recién subido
        public_url = supabase_admin.storage.from_("avatars").get_public_url(file_path)
        logger.info(f"[Upload Avatar] Public URL: {public_url}")
        
        # Actualizar la base de datos
        from backend.app.crud.user import update_user
        updated_profile = update_user(current_user, UserUpdate(avatar_url=public_url))
        
        if not updated_profile:
            raise HTTPException(status_code=400, detail="Imagen subida, pero no se pudo actualizar el perfil.")
            
        return {"avatar_url": public_url, "message": "Foto de perfil actualizada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Upload Avatar] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")

@router.delete("/me/avatar")
async def delete_avatar(current_user: str = Depends(get_current_user)):
    try:
        logger.info(f"[Delete Avatar] Starting for user {current_user}")
        from backend.app.crud.user import update_user
        # Obtener usuario actual para buscar la URL del avatar
        profile_response = supabase_admin.table("profiles").select("avatar_url").eq("id", current_user).execute()
        
        if profile_response.data and profile_response.data[0].get("avatar_url"):
            avatar_url = profile_response.data[0]["avatar_url"]
            # Extraer el path del archivo desde la URL pública
            # El path usualmente está después de "/avatars/"
            if "/avatars/" in avatar_url:
                file_path = avatar_url.split("/avatars/")[-1]
                # Intentar eliminar del storage
                try:
                    supabase_admin.storage.from_("avatars").remove([file_path])
                except Exception as e:
                    logger.warning(f"[Delete Avatar] Error borrando del storage (no crítico): {e}")

        # Poner la url en null en la DB
        updated_profile = update_user(current_user, UserUpdate(avatar_url=None))
        if not updated_profile:
            raise HTTPException(status_code=400, detail="No se pudo eliminar el avatar del perfil.")
            
        return {"message": "Foto de perfil eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Delete Avatar] Unexpected error: {str(e)}")
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