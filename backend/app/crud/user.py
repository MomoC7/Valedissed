from backend.app.schemas.user import UserCreate, UserUpdate
from backend.app.db.supabase_client import supabase

# Función para crear un usuario nuevo
import uuid
from backend.app.schemas.user import UserCreate
from backend.app.db.supabase_client import supabase

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
    # Obtenemos solo los campos que el usuario envió para actualizar
    update_data = user_data.model_dump(exclude_unset=True)
    
    if not update_data:
        return get_user(user_id)

    # El SDK hace el update y el commit automáticamente en una sola petición HTTPS
    response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    return response.data[0] if response.data else None