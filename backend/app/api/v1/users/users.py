from fastapi import APIRouter, HTTPException
from backend.app.crud import user as crud_user
from backend.app.schemas import user as schema_user
from backend.app.db.supabase_client import supabase # Importamos el cliente oficial

router = APIRouter()

@router.post("/", response_model=schema_user.UserOut)
def register_user(user: schema_user.UserCreate):
    # Verificamos duplicados usando el SDK (HTTPS/443)
    response = supabase.table("profiles").select("*").eq("username", user.username).execute()
    
    if response.data:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")
    
    # Llamamos al nuevo crud_user que ya no pide 'db'
    db_user = crud_user.create_user(user)
    if not db_user:
        raise HTTPException(status_code=500, detail="Error al crear el usuario.")
        
    return db_user

@router.get("/{user_id}", response_model=schema_user.UserOut)
def read_user(user_id: str):
    # Ya no pasamos la sesión 'db', el CRUD interno usa el SDK
    db_user = crud_user.get_user(user_id=user_id)
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user