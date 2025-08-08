def append_items_to_order(order_id, items):
    """
    Appends new items to an existing order in the Supabase 'orders' table.
    Items are stored as a JSON array in the 'items' column.
    """
    import json
    # Fetch current items
    result = supabase.table("orders").select("items").eq("id", order_id).execute()
    if not result.data or len(result.data) == 0:
        return False, "Order not found"
    try:
        current_items = json.loads(result.data[0]["items"]) if result.data[0]["items"] else []
    except Exception:
        current_items = []
    current_items.extend(items)
    new_items_json = json.dumps(current_items)
    update_result = supabase.table("orders").update({"items": new_items_json}).eq("id", order_id).execute()
    if update_result.status_code == 200:
        return True, "Items appended"
    return False, "Failed to append items"
# db.py

from supabase import create_client, Client
import bcrypt
import datetime # Import datetime here, it was missing earlier for datetime.datetime.now()
import os

# Replace with your Supabase credentials (env vars preferred for deployment)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://iwfunipsnoqfasntaofl.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnVuaXBzbm9xZmFzbnRhb2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NzU1MjQsImV4cCI6MjA2NjI1MTUyNH0.E2YU0wDS16TUsIbX8qIM3Xo6XZF3Z_GuWFUmjWw7Z7A")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------- Password Hashing Utilities ----------
def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()

def check_password(plain_password: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed.encode())

# ---------- Authentication ----------
def get_user_by_username(username: str):
    result = supabase.table("users").select("*").eq("username", username).execute()
    return result.data[0] if result.data else None

def authenticate_user(username: str, plain_password: str):
    user = get_user_by_username(username)
    if user and check_password(plain_password, user["password"]):
        return user
    return None

def add_user(user_data):
    user_data["password"] = hash_password(user_data["password"])
    return supabase.table("users").insert(user_data).execute()

def update_password(username, new_password):
    user = supabase.table("users").select("*").eq("username", username).single().execute()
    if not user.data:
        return False
    hashed_pw = hash_password(new_password)
    result = supabase.table("users").update({"password": hashed_pw}).eq("username", username).execute()
    return getattr(result, "status_code", 200) in (200, 204)


def get_all_users():
    return supabase.table("users").select("id, username, role").execute().data

# ---------- Menu Items ----------
def get_all_menu_items():
    return supabase.table("menu_items").select("*").execute().data

def add_menu_item(data):
    return supabase.table("menu_items").insert(data).execute()

def update_menu_item(item_id, data):
    return supabase.table("menu_items").update(data).eq("id", item_id).execute()

def delete_menu_item(item_id):
    return supabase.table("menu_items").delete().eq("id", item_id).execute()

# ---------- Orders ----------
def save_order(data):

    # --- Debug: Print incoming data ---
    print("[save_order] Incoming data:", data)

    # Define the fields expected by the Supabase 'orders' table.
    # Map frontend 'Table' to 'dine-in' for DB
    order_type = data.get("order_type")
    if order_type and order_type.lower() == "table":
        db_order_type = "dine-in"
    elif order_type and order_type.lower() == "delivery":
        db_order_type = "delivery"
    else:
        db_order_type = "dine-in"

    supabase_fields = {
        "items": data.get("items"),
        "table_number": data.get("table_number") if db_order_type == 'dine-in' else None,
        "order_type": db_order_type,
        "status": data.get("status"),
        "date": data.get("date"),
        "phone": data.get("phone") if db_order_type == 'delivery' else None,
        "address": data.get("address") if db_order_type == 'delivery' else None,
        "payment_status": data.get("payment_status", "unpaid"),
        "sub_total": data.get("subtotal"),
        "gst": data.get("gst"),
        "total": data.get("total")
    }

    # Handle date format conversion robustly
    if supabase_fields["date"]:
        date_str = supabase_fields["date"]
        dt = None
        # Try multiple formats
        for fmt in ["%d/%m/%Y, %I:%M:%S %p", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"]:
            try:
                dt = datetime.datetime.strptime(date_str, fmt)
                break
            except Exception:
                continue
        if dt:
            supabase_fields["date"] = dt.strftime("%Y-%m-%d %H:%M:%S")
        else:
            print(f"[save_order] Could not parse date: {date_str}, using now.")
            supabase_fields["date"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        supabase_fields["date"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Validate status field - now "Confirmed" is explicitly allowed
    allowed_status = ["received", "completed"]
    # Always set status to 'received' for new orders
    supabase_fields["status"] = "received"

    # Validate order_type field - ensure consistency
    allowed_order_type = ["dine-in", "delivery"]
    if supabase_fields["order_type"] not in allowed_order_type:
        supabase_fields["order_type"] = "dine-in"

    # Clean up None values if your Supabase schema doesn't like them explicitly
    # Alternatively, ensure your Supabase schema allows NULL for these fields.
    # For instance, if table_number is not null for dine-in, but null for delivery.
    final_data_to_insert = {k: v for k, v in supabase_fields.items() if v is not None}

    result = supabase.table("orders").insert(final_data_to_insert).execute()

    if result.data and len(result.data) > 0:
        return result.data[0]["id"]  # ✅ Return the new order’s ID
    return None


def get_all_orders(from_date=None, to_date=None):
    query = supabase.table("orders").select("*").order("id", desc=True)
    if from_date and to_date:
        from_dt = from_date.strip() + " 00:00:00"
        to_dt = to_date.strip() + " 23:59:59"
        query = query.gte("date", from_dt).lte("date", to_dt)
    return query.execute().data

def complete_order_for_table(table_number):
    # Mark all 'received' or 'Confirmed' orders for the table as 'completed'
    # Ensure this matches the statuses you expect to complete
    return supabase.table("orders").update({"status": "completed", "payment_status": "paid"}).eq("table_number", table_number).in_("status", ["received", "Confirmed"]).execute()

def complete_order(table_number): # This function seems to be duplicated with complete_order_for_table
    # Consider consolidating this or ensuring it's used correctly.
    # It marks status as "Completed" (capital C) which should be consistent with "completed" (lowercase) if used elsewhere.
    return supabase.table("orders").update({"status": "Completed"}).eq("table_number", table_number).eq("status", "Confirmed").execute()

# ---------- Inventory ----------
def get_inventory():
    return supabase.table("inventory").select("id, name, quantity, unit").execute().data

def add_inventory_item(data):
    return supabase.table("inventory").insert(data).execute()

def update_inventory_item(data):
    return supabase.table("inventory").update({
        "quantity": data["quantity"],
        "unit": data["unit"]
    }).eq("name", data["name"]).execute()

def delete_inventory_item(name):
    return supabase.table("inventory").delete().eq("name", name).execute()

# ---------- Dashboard Summary ----------

def get_today_summary():
    """
    Compute today's order count and total sales from Supabase 'orders' table.
    Relies on the 'date' column being stored as a string in '%Y-%m-%d %H:%M:%S' format
    as inserted by save_order.
    """
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    from_dt = f"{today_str} 00:00:00"
    to_dt = f"{today_str} 23:59:59"

    result = supabase.table("orders").select("total").gte("date", from_dt).lte("date", to_dt).execute()
    rows = result.data or []

    def to_number(value):
        try:
            return float(value)
        except Exception:
            return 0.0

    orders_today = len(rows)
    total_sales = sum(to_number(row.get("total")) for row in rows)

    return {
        "orders_today": orders_today,
        "total_sales": round(total_sales or 0, 2)
    }