from fastapi import APIRouter, HTTPException, Depends
from backend.app.db.supabase_client import supabase
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.schemas.cart import CartItemAdd, CartItemUpdate

router = APIRouter()


# ===== VER MI CARRITO =====
@router.get("/")
def get_cart(current_user: str = Depends(get_current_user)):
    """Retorna los ítems del carrito con datos completos del producto."""
    response = supabase.table("cart_items").select(
        "*, products(id, name, price, sale_price, cover_image_url, stock, is_active, profiles(username, business_name))"
    ).eq("user_id", current_user).execute()
    return response.data or []


# ===== AGREGAR AL CARRITO =====
@router.post("/add")
def add_to_cart(item: CartItemAdd, current_user: str = Depends(get_current_user)):
    """Agrega un producto al carrito. Si ya existe, actualiza la cantidad."""
    # Verificar que el producto existe y está activo
    product = supabase.table("products").select("id, stock, is_active").eq("id", str(item.product_id)).execute()
    if not product.data or not product.data[0].get("is_active"):
        raise HTTPException(status_code=404, detail="Producto no disponible.")
    if product.data[0].get("stock", 0) < item.quantity:
        raise HTTPException(status_code=400, detail="Stock insuficiente.")

    # Verificar si ya está en el carrito
    existing = supabase.table("cart_items").select("id, quantity").eq("user_id", current_user).eq("product_id", str(item.product_id)).execute()

    if existing.data:
        # Actualizar cantidad
        new_qty = existing.data[0]["quantity"] + item.quantity
        if new_qty > product.data[0].get("stock", 0):
            raise HTTPException(status_code=400, detail="Stock insuficiente para la cantidad solicitada.")
        response = supabase.table("cart_items").update({"quantity": new_qty}).eq("id", existing.data[0]["id"]).execute()
    else:
        # Insertar nuevo ítem
        response = supabase.table("cart_items").insert({
            "user_id": current_user,
            "product_id": str(item.product_id),
            "quantity": item.quantity
        }).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="No se pudo agregar al carrito.")
    return response.data[0]


# ===== ACTUALIZAR CANTIDAD =====
@router.put("/{item_id}")
def update_cart_item(item_id: str, data: CartItemUpdate, current_user: str = Depends(get_current_user)):
    """Actualiza la cantidad de un ítem en el carrito."""
    existing = supabase.table("cart_items").select("id, product_id").eq("id", item_id).eq("user_id", current_user).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en el carrito.")

    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0.")

    # Verificar stock
    product = supabase.table("products").select("stock").eq("id", existing.data[0]["product_id"]).execute()
    if product.data and data.quantity > product.data[0].get("stock", 0):
        raise HTTPException(status_code=400, detail="Stock insuficiente.")

    response = supabase.table("cart_items").update({"quantity": data.quantity}).eq("id", item_id).execute()
    return response.data[0]


# ===== ELIMINAR ÍTEM DEL CARRITO =====
@router.delete("/{item_id}")
def remove_from_cart(item_id: str, current_user: str = Depends(get_current_user)):
    """Elimina un ítem del carrito."""
    existing = supabase.table("cart_items").select("id").eq("id", item_id).eq("user_id", current_user).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en el carrito.")
    supabase.table("cart_items").delete().eq("id", item_id).execute()
    return {"message": "Ítem eliminado del carrito."}


# ===== VACIAR CARRITO =====
@router.delete("/")
def clear_cart(current_user: str = Depends(get_current_user)):
    """Vacía completamente el carrito del usuario."""
    supabase.table("cart_items").delete().eq("user_id", current_user).execute()
    return {"message": "Carrito vaciado."}


# ===== CONTAR ÍTEMS (para el badge de la navbar) =====
@router.get("/count")
def get_cart_count(current_user: str = Depends(get_current_user)):
    """Retorna el número total de ítems en el carrito."""
    response = supabase.table("cart_items").select("quantity").eq("user_id", current_user).execute()
    total = sum(item["quantity"] for item in (response.data or []))
    return {"count": total}
