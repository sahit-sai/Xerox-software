import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
KIOSK_CODE = os.getenv("KIOSK_CODE", "VISHNU01")
DEVICE_SECRET = os.getenv("DEVICE_SECRET", "super-secret-kiosk-device-key")
PRINTER_NAME = os.getenv("PRINTER_NAME", "Thermal_Printer_01")
# Default to false so real hardware is queried and no fake mock prints occur
MOCK_PRINTER = os.getenv("MOCK_PRINTER", "false").lower() in ("true", "1", "yes")
HEARTBEAT_INTERVAL_SEC = int(os.getenv("HEARTBEAT_INTERVAL_SEC", "15"))
POLL_INTERVAL_SEC = float(os.getenv("POLL_INTERVAL_SEC", "1.0"))
