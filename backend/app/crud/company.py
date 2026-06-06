from backend.app.db.supabase_client import supabase_admin
from backend.app.schemas.company import CompanyCreate, CompanyUpdate


def get_company_by_owner(owner_id: str):
    response = supabase_admin.table("companies").select("*").eq("owner_id", owner_id).limit(1).execute()
    return response.data[0] if response.data else None


def create_company(owner_id: str, company_data: CompanyCreate):
    data = company_data.model_dump(exclude_unset=True)
    data["owner_id"] = owner_id
    response = supabase_admin.table("companies").insert(data).execute()
    return response.data[0] if response.data else None


def update_company(owner_id: str, company_data: CompanyUpdate):
    update_data = company_data.model_dump(exclude_unset=True)
    if not update_data:
        return get_company_by_owner(owner_id)
    response = supabase_admin.table("companies").update(update_data).eq("owner_id", owner_id).execute()
    return response.data[0] if response.data else None
