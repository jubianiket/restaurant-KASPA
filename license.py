from cryptography.fernet import Fernet
import os, datetime, json

FERNET_KEY = b"W-v-pHRb83CPd8wNSG3kXDUUAgwt0nU-ghoYk-bWNNs="  # Replace this with your real Fernet key
LICENSE_FILE = "license_info.json"
TRIAL_DAYS = 15

f = Fernet(FERNET_KEY)

def write_encrypted_json(data: dict):
    json_str = json.dumps(data)
    encrypted = f.encrypt(json_str.encode())
    with open(LICENSE_FILE, "wb") as file:
        file.write(encrypted)

def read_encrypted_json():
    if not os.path.exists(LICENSE_FILE):
        return None
    with open(LICENSE_FILE, "rb") as file:
        encrypted = file.read()
    try:
        decrypted = f.decrypt(encrypted).decode()
        return json.loads(decrypted)
    except:
        return None

def get_install_date():
    data = read_encrypted_json()
    if data and "install_date" in data:
        return datetime.datetime.strptime(data["install_date"], "%Y-%m-%d")
    today = datetime.datetime.today()
    data = {"install_date": today.strftime("%Y-%m-%d")}
    write_encrypted_json(data)
    return today

def is_trial_expired():
    return (datetime.datetime.today() - get_install_date()).days > TRIAL_DAYS

def get_trial_days_remaining():
    days = TRIAL_DAYS - (datetime.datetime.today() - get_install_date()).days
    return max(0, days)

def is_license_valid():
    data = read_encrypted_json()
    if data and "license_encrypted" in data:
        try:
            decrypted_license = f.decrypt(data["license_encrypted"].encode()).decode()
            expiry = datetime.datetime.strptime(decrypted_license.strip(), "%Y-%m-%d")
            if datetime.datetime.today() <= expiry:
                return True, expiry
        except:
            pass
    return False, None

def validate_license_key(key):
    try:
        decrypted_license = f.decrypt(key.encode()).decode()
        expiry = datetime.datetime.strptime(decrypted_license.strip(), "%Y-%m-%d")
        data = read_encrypted_json() or {"install_date": get_install_date().strftime("%Y-%m-%d")}
        data["license_encrypted"] = key
        write_encrypted_json(data)
        return True, expiry
    except:
        return False, None

def get_license_expiry_date():
    data = read_encrypted_json()
    if data and "license_encrypted" in data:
        try:
            decrypted_license = f.decrypt(data["license_encrypted"].encode()).decode()
            return datetime.datetime.strptime(decrypted_license.strip(), "%Y-%m-%d")
        except:
            pass
    return None
