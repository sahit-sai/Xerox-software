import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
KIOSK_CODE = os.getenv("KIOSK_CODE", "VISHNU01")
DEVICE_SECRET = os.getenv("DEVICE_SECRET", "super-secret-kiosk-device-key")
PRINTER_NAME = os.getenv("PRINTER_NAME", "Thermal_Printer_01")
MOCK_PRINTER = os.getenv("MOCK_PRINTER", "true").lower() in ("true", "1", "yes")
HEARTBEAT_INTERVAL_SEC = int(os.getenv("HEARTBEAT_INTERVAL_SEC", "15"))
POLL_INTERVAL_SEC = int(os.getenv("POLL_INTERVAL_SEC", "3"))
