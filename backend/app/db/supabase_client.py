import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Busca el archivo .env en la raíz del proyecto
load_dotenv() 

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Error: No se encontraron SUPABASE_URL o SUPABASE_KEY en el archivo .env")

# Cliente estándar (para operaciones con RLS del usuario actual)
supabase: Client = create_client(url, key)

# Cliente administrativo (bypass de RLS, requiere SUPABASE_SERVICE_ROLE_KEY en .env)
supabase_admin: Client = create_client(url, service_role_key) if service_role_key else supabase