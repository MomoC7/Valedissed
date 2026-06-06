from backend.app.schemas.user import UserCreate, UserUpdate
from backend.app.db.supabase_client import supabase_admin as supabase  # Usamos el cliente admin para bypass RLS

# Función para crear un usuario nuevo
import uuid
from backend.app.schemas.user import UserCreate
from backend.app.db.supabase_client import supabase_admin as supabase

def create_user(user_in: UserCreate):
    # Convertimos a diccionario pero EXCLUIMOS el ID
    # Así evitamos enviar el ID de ejemplo del Swagger que causa el error 23503
    user_data = user_in.model_dump(exclude={'id'})
    
    # Enviamos los datos a "profiles"
    response = supabase.table("profiles").insert(user_data).execute()
    
    return response.data[0] if response.data else None

# Función para buscar un usuario por su ID
def get_user(user_id: str):
    # Usamos la sintaxis del SDK: select, filter (eq) y execute
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    
    return response.data[0] if response.data else None

# Función para actualizar el perfil
def update_user(user_id: str, user_data: UserUpdate):
    import logging
    logger = logging.getLogger(__name__)
    
    # Obtenemos solo los campos que el usuario envió para actualizar
    update_data = user_data.model_dump(exclude_unset=True)
    
    if not update_data:
        return get_user(user_id)

    # El SDK hace el update y el commit automáticamente en una sola petición HTTPS
    try:
        logger.info(f'[CRUD User] Updating user {user_id} with: {update_data}')
        response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        logger.info(f'[CRUD User] Update response: {response}')
        return response.data[0] if response.data else None
    except Exception as e:
        logger.exception(f'[CRUD User] Exception during update: {e}')
        error_str = str(e).lower()
        if 'duplicate key' in error_str or 'unique constraint' in error_str:
            if 'username' in error_str:
                raise ValueError('El nombre de usuario ya está en uso.')
            else:
                raise ValueError('Valor duplicado, por favor intente con otro.')
        raise