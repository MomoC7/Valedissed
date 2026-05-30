from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from backend.app.db.supabase_client import supabase
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.schemas.product import ProductCreate, ProductUpdate
import time

router = APIRouter()

PARTNER_ROLES = {"partner", "business", "admin"}


def _require_partner(current_user: str = Depends(get_current_user)):
    """Verifica que el usuario tenga rol de partner, business o admin."""
    profile = supabase.table("profiles").select("role").eq("id", current_user).execute()
    if not profile.data or profile.data[0].get("role") not in PARTNER_ROLES:
        raise HTTPException(status_code=403, detail="Solo los partners pueden realizar esta acción.")
    return current_user


# ===== LISTAR MIS PRODUCTOS =====
@router.get("/my")
def get_my_products(current_user: str = Depends(_require_partner)):
    response = supabase.table("products").select("*").eq("seller_id", current_user).order("created_at", desc=True).execute()
    return response.data or []


# ===== LISTAR PRODUCTOS PÚBLICOS (marketplace) =====
@router.get("/")
def get_products(category: str = None, search: str = None):
    query = supabase.table("products").select("*, profiles(username, business_name, avatar_url)").eq("is_active", True)
    if category:
        query = query.eq("category", category)
    response = query.order("created_at", desc=True).execute()
    products = response.data or []
    if search:
        search_lower = search.lower()
        products = [p for p in products if search_lower in (p.get("name") or "").lower()
                    or search_lower in (p.get("description") or "").lower()]
    return products


# ===== LISTAR PRODUCTOS DE UN VENDEDOR =====
@router.get("/seller/{seller_id}")
def get_products_by_seller(seller_id: str):
    response = supabase.table("products").select("*, profiles(username, business_name, avatar_url)").eq("seller_id", seller_id).eq("is_active", True).order("created_at", desc=True).execute()
    return response.data or []


# ===== OBTENER UN PRODUCTO =====
@router.get("/{product_id}")
def get_product(product_id: str):
    response = supabase.table("products").select("*, profiles(username, business_name, avatar_url)").eq("id", product_id).eq("is_active", True).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    return response.data[0]


# ===== CREAR PRODUCTO =====
@router.post("/")
def create_product(product_data: ProductCreate, current_user: str = Depends(_require_partner)):
    data = product_data.model_dump()
    data["seller_id"] = current_user
    data["is_active"] = True
    response = supabase.table("products").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="No se pudo crear el producto.")
    return response.data[0]


# ===== ACTUALIZAR PRODUCTO =====
@router.put("/{product_id}")
def update_product(product_id: str, product_data: ProductUpdate, current_user: str = Depends(_require_partner)):
    # Verificar que el producto pertenece al usuario
    existing = supabase.table("products").select("seller_id").eq("id", product_id).execute()
    if not existing.data or existing.data[0]["seller_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este producto.")

    update_data = product_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar.")

    response = supabase.table("products").update(update_data).eq("id", product_id).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el producto.")
    return response.data[0]


# ===== ELIMINAR PRODUCTO (desactivar) =====
@router.delete("/{product_id}")
def delete_product(product_id: str, current_user: str = Depends(_require_partner)):
    existing = supabase.table("products").select("seller_id").eq("id", product_id).execute()
    if not existing.data or existing.data[0]["seller_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este producto.")

    # Desactivar en lugar de borrar para no romper referencias
    supabase.table("products").update({"is_active": False}).eq("id", product_id).execute()
    return {"message": "Producto eliminado correctamente."}


# ===== SUBIR IMAGEN DE PRODUCTO =====
@router.post("/{product_id}/images")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    is_cover: bool = False,
    current_user: str = Depends(_require_partner)
):
    # Verificar que el producto pertenece al usuario
    existing = supabase.table("products").select("seller_id, images_urls, cover_image_url").eq("id", product_id).execute()
    if not existing.data or existing.data[0]["seller_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso para subir imágenes a este producto.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

    current_images = existing.data[0].get("images_urls") or []
    if len(current_images) >= 10:
        raise HTTPException(status_code=400, detail="Has alcanzado el límite de 10 imágenes por producto.")

    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1]
    file_path = f"products/{current_user}/{product_id}/img_{int(time.time())}.{file_ext}"

    res = supabase.storage.from_("media").upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": file.content_type}
    )
    public_url = supabase.storage.from_("media").get_public_url(file_path)

    # Actualizar registro en DB
    update_data = {"images_urls": current_images + [public_url]}
    if is_cover or not existing.data[0].get("cover_image_url"):
        update_data["cover_image_url"] = public_url

    supabase.table("products").update(update_data).eq("id", product_id).execute()
    return {"url": public_url, "is_cover": is_cover or not existing.data[0].get("cover_image_url")}


# ===== ELIMINAR IMAGEN DE PRODUCTO =====
@router.delete("/{product_id}/images")
def delete_product_image(product_id: str, image_url: str, current_user: str = Depends(_require_partner)):
    existing = supabase.table("products").select("seller_id, images_urls, cover_image_url").eq("id", product_id).execute()
    if not existing.data or existing.data[0]["seller_id"] != current_user:
        raise HTTPException(status_code=403, detail="No tienes permiso.")

    current_images = existing.data[0].get("images_urls") or []
    new_images = [url for url in current_images if url != image_url]
    update_data = {"images_urls": new_images}

    # Si era la portada, asignar la siguiente o null
    if existing.data[0].get("cover_image_url") == image_url:
        update_data["cover_image_url"] = new_images[0] if new_images else None

    supabase.table("products").update(update_data).eq("id", product_id).execute()
    return {"message": "Imagen eliminada."}
