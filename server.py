# --- server.py ---

# ...existing code...

import json
import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
from datetime import datetime as dt
from functools import wraps
from werkzeug.utils import secure_filename

# Consolidated settings management functions
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")
default_settings = {
    "restaurant_name": "My Restaurant",
    "contact_number": "9876543210",
    "gst_enabled": True,
    "logo_path": "",
    "total_tables": 12,
    "vat": 0.0,
    "cgst": 0.0,
    "sgst": 0.0
}

def load_settings():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error loading settings file: {e}")
            return default_settings.copy()
    return default_settings.copy()

def save_settings(data):
    current_settings = load_settings()
    current_settings.update(data)
    with open(CONFIG_FILE, "w") as f:
        json.dump(current_settings, f, indent=4)

from db import *
from db import complete_order_for_table
from license import get_license_expiry_date

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "your-secret-key"
CORS(app)

# -------------- Auth Decorator ----------------

def login_required(role=None):
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = session.get("user")
            if not user:
                return redirect(url_for("login_page"))
            if role and user["role"] != role:
                return "Access Denied", 403
            return f(*args, **kwargs)
        return decorated
    return wrapper

# -------------- Login -------------------------

@app.route("/login", methods=["GET", "POST"])
def login_page():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        user = authenticate_user(username, password)
        if user:
            session["user"] = {"username": user["username"], "role": user["role"]}
            return redirect(url_for("web_pos"))
        return render_template("html/login.html", error="Invalid credentials")
    return render_template("html/login.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login_page"))

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        username = request.form.get("username")
        new_password = request.form.get("new_password")
        updated = update_password(username, new_password)
        if updated:
            return render_template("html/forgot_password.html", message="Password updated", status="success")
        return render_template("html/forgot_password.html", message="User not found", status="error")
    return render_template("html/forgot_password.html")

# -------------- Menu APIs ---------------------

@app.route("/menu_items", methods=["GET", "POST"])
@login_required()
def menu_items():
    if request.method == "GET":
        return jsonify({"status": "success", "data": get_all_menu_items()})
    else:
        data = request.get_json()
        add_menu_item(data)
        return jsonify({"status": "success", "message": "Item added"})

@app.route("/menu_items/<int:item_id>", methods=["PUT", "DELETE"])
@login_required()
def modify_menu_item(item_id):
    if request.method == "PUT":
        data = request.get_json()
        update_menu_item(item_id, data)
    else:
        delete_menu_item(item_id)
    return jsonify({"status": "success", "message": "Item updated"})

# -------------- Order APIs --------------------

@app.route("/orders/<int:table_number>/pay", methods=["POST"])
@login_required()
def pay_order(table_number):
    from db import supabase
    supabase.table("orders").update({"payment_status": "paid", "status": "completed"}).eq("table_number", table_number).execute()
    return jsonify({"status": "success", "message": "Payment status and order status updated to paid and completed."})

@app.route("/save_order", methods=["POST"])
@login_required()
def save_order_route():
    data = request.get_json()
    new_order_id = save_order(data)
    return jsonify({
        "status": "success",
        "message": "Order saved",
        "order_id": new_order_id
    })

@app.route("/orders", methods=["GET"])
@login_required()
def get_orders_route():
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    if from_date and to_date:
        orders = get_all_orders(from_date, to_date)
    else:
        orders = get_all_orders()
    return jsonify({"status": "success", "data": orders})

@app.route("/orders/<int:order_id>/complete", methods=["POST"])
@login_required()
def complete_order_by_id(order_id):
    from db import supabase
    result = supabase.table("orders").update({"status": "completed", "payment_status": "paid"}).eq("id", order_id).execute()
    if result.data and len(result.data) > 0:
        return jsonify({"status": "success", "message": "Order marked as completed"})
    else:
        return jsonify({"status": "error", "message": "Order update failed"}), 400

@app.route("/orders/<int:order_id>/append_items", methods=["POST"])
@login_required()
def append_items_route(order_id):
    data = request.get_json() or {}
    items = data.get("items") or []
    ok, msg = append_items_to_order(order_id, items)
    if ok:
        return jsonify({"status": "success", "message": msg})
    return jsonify({"status": "error", "message": msg}), 400

# -------------- Inventory APIs ----------------

@app.route("/api/inventory", methods=["GET", "POST", "PUT", "DELETE"])
@login_required()
def inventory():
    if request.method == "GET":
        return jsonify({"status": "success", "data": get_inventory()})
    data = request.get_json()
    if request.method == "POST":
        add_inventory_item(data)
    elif request.method == "PUT":
        update_inventory_item(data)
    elif request.method == "DELETE":
        delete_inventory_item(data["name"])
    return jsonify({"status": "success", "message": "Inventory updated"})

# -------------- Users (Admin only) ------------

@app.route("/api/users", methods=["GET", "POST"])
@login_required("admin")
def users_api():
    if request.method == "GET":
        return jsonify({"status": "success", "data": get_all_users()})
    data = request.get_json()
    add_user(data)
    return jsonify({"status": "success", "message": "User added"})

# -------------- Dashboard Summary -------------

@app.route("/api/today-summary")
@login_required()
def today_summary():
    summary = get_today_summary()
    return jsonify(summary)

@app.route("/api/dashboard-summary")
@login_required()
def dashboard_summary():
    summary = get_today_summary()
    license_expiry = get_license_expiry_date()
    return jsonify({
        "date": dt.now().strftime("%d-%m-%Y"),
        "total_sales": summary.get("total_sales", 0),
        "orders_today": summary.get("orders_today", 0),
        "license_expiry": license_expiry.strftime("%d-%m-%Y") if license_expiry else "N/A"
    })

# -------------- Settings Page -----------------

@app.route("/api/settings", methods=["GET"])
@login_required()
def api_settings():
    settings = load_settings()
    return jsonify({"status": "success", "data": settings})

@app.route("/settings", methods=["GET", "POST"])
@login_required()
def settings_page():
    if request.method == "POST":
        current_settings = load_settings()

        try:
            data = {
                "restaurant_name": request.form.get("restaurant_name", "").strip(),
                "contact_number": request.form.get("contact_number", "").strip(),
                "gst_enabled": request.form.get("gst_enabled") == "on",
                "total_tables": int(request.form.get("total_tables") or 12),
                "vat": float(request.form.get("vat") or 0.0),
                "cgst": float(request.form.get("cgst") or 0.0),
                "sgst": float(request.form.get("sgst") or 0.0)
            }
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "❌ Invalid number format for tables or taxes."})

        logo_file = request.files.get("logo_file")
        if logo_file and logo_file.filename:
            filename = secure_filename(logo_file.filename)
            upload_dir = os.path.join("static", "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            logo_path = os.path.join(upload_dir, filename)
            logo_file.save(logo_path)
            data["logo_path"] = logo_path
        else:
            data["logo_path"] = current_settings.get("logo_path", "")

        save_settings(data)
        return jsonify({"status": "success", "message": "✅ Settings saved successfully!"})

    return render_template("html/settings.html", settings=load_settings())

# -------------- Web Pages ---------------------

@app.route("/")
def home_redirect():
    return redirect(url_for("login_page"))

# -------------- Signup Page ---------------------

@app.route("/signup", methods=["GET", "POST"])
def signup_page():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        role = request.form.get("role", "user")
        if not username or not password or not confirm_password or not role:
            return render_template("html/signup.html", error="All fields are required.")
        if password != confirm_password:
            return render_template("html/signup.html", error="Passwords do not match.")
        if get_user_by_username(username):
            return render_template("html/signup.html", error="Username already exists.")
        user_data = {
            "username": username,
            "password": password,
            "role": role
        }
        add_user(user_data)
        session["user"] = {"username": username, "role": role}
        return redirect(url_for("web_pos"))
    return render_template("html/signup.html")

@app.route("/admin")
@login_required()
def admin_dashboard():
    return render_template("html/admin_dashboard.html")

@app.route("/menu")
@login_required()
def menu_page():
    return render_template("html/menu.html")

@app.route("/order")
@login_required()
def order_page():
    return render_template("html/order.html")

@app.route("/inventory")
@login_required()
def inventory_page():
    return render_template("html/inventory_content.html")

@app.route("/pos")
@login_required()
def web_pos():
    return render_template("html/web_pos.html")

@app.route("/history")
@login_required()
def history_page():
    orders = get_all_orders()
    return render_template("html/history.html", orders=orders)

@app.route("/staff")
@login_required()
def staff_page():
    return render_template("html/staff_content.html")

# -------------- Run Server --------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)