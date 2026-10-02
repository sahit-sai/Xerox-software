import hmac
import hashlib
import time
import requests
import logging
import os
import sys
import json
from config import (
    BACKEND_URL, KIOSK_CODE, DEVICE_SECRET, PRINTER_NAME,
    MOCK_PRINTER, HEARTBEAT_INTERVAL_SEC, POLL_INTERVAL_SEC
)
from mock_printer import MockPrinter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("KioskAgent")

def generate_hmac_signature(payload_bytes: bytes, secret: str) -> str:
    return hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

class KioskAgent:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.kiosk_code = KIOSK_CODE
        self.device_secret = DEVICE_SECRET
        self.mock_mode = MOCK_PRINTER
        self.printer_name = PRINTER_NAME
        self.paper_sheets = 450
        self.toner_pct = 90.0
        self.state = "ok"
        self.current_job_id = None

        if self.mock_mode:
            logger.info("[MODE] Initializing Agent in MOCK PRINTER MODE")
            self.printer = MockPrinter(self.printer_name)
        else:
            logger.info(f"[MODE] Initializing CUPS Printing for printer '{self.printer_name}'")
            try:
                import cups
                self.cups = cups
                self.cups_conn = cups.Connection()
            except ImportError:
                logger.error("pycups package not installed! Falling back to MOCK mode.")
                self.mock_mode = True
                self.printer = MockPrinter(self.printer_name)

    def make_auth_headers(self, body_bytes: bytes = b"") -> dict:
        sig = generate_hmac_signature(body_bytes, self.device_secret)
        return {
            "X-Kiosk-Code": self.kiosk_code,
            "X-Signature": sig,
            "Content-Type": "application/json"
        }

    def check_hardware_reasons(self):
        if self.mock_mode:
            return
        try:
            printers = self.cups_conn.getPrinters()
            printer_info = printers.get(self.printer_name, {})
            reasons = printer_info.get("printer-state-reasons", [])
            
            if "media-empty" in str(reasons) or "media-needed" in str(reasons):
                self.state = "no_paper"
                self.paper_sheets = 0
            elif "media-jam" in str(reasons):
                self.state = "jam"
            elif printer_info.get("printer-state") == 5: # Stopped / Offline
                self.state = "offline"
            else:
                self.state = "ok"
        except Exception as e:
            logger.warning(f"Error checking CUPS printer state: {e}")

    def send_heartbeat(self):
        self.check_hardware_reasons()
        url = f"{self.backend_url}/api/agent/heartbeat"
        payload = {
            "paper_sheets": self.paper_sheets,
            "toner_pct": self.toner_pct,
            "state": self.state
        }
        try:
            body_bytes = json.dumps(payload).encode('utf-8')
            res = requests.post(url, data=body_bytes, headers=self.make_auth_headers(body_bytes), timeout=15)
            if res.status_code == 200:
                logger.info(f"[HEARTBEAT] Sent | State: {self.state} | Paper: {self.paper_sheets}")
            else:
                logger.warning(f"[HEARTBEAT] Failed ({res.status_code}): {res.text}")
        except Exception as e:
            logger.error(f"[HEARTBEAT] Connection error: {e}")

    def poll_next_job(self):
        if self.current_job_id:
            return

        url = f"{self.backend_url}/api/agent/next-job"
        try:
            res = requests.get(url, headers=self.make_auth_headers(), timeout=15)
            if res.status_code == 200:
                data = res.json()
                job = data.get("job")
                if job:
                    logger.info(f"[JOB ENQUEUED] Token #{job['token']} | Job ID: {job['id']} | File: {job['fileName']}")
                    self.process_job(job)
        except Exception as e:
            logger.error(f"[POLL NEXT JOB] Error: {e}")

    def process_job(self, job: dict):
        self.current_job_id = job["id"]
        job_id = job["id"]
        sheets = job.get("sheets", 1)
        tmp_file_path = f"/tmp/{job_id}_{job.get('fileName', 'print.pdf')}"

        def progress_callback(printed_sheets: int):
            prog_url = f"{self.backend_url}/api/agent/progress"
            payload = {"jobId": job_id, "printedSheets": printedSheets}
            b = json.dumps(payload).encode('utf-8')
            try:
                requests.post(prog_url, data=b, headers=self.make_auth_headers(b), timeout=10)
            except Exception as ex:
                logger.warning(f"Progress update error: {ex}")

        if self.mock_mode:
            options = {
                "copies": job.get("copies", 1),
                "pages": job.get("pages", 1),
                "sheets": sheets
            }
            success = self.printer.print_file(job.get("fileName", "doc.pdf"), options, progress_callback)
            if success:
                self.paper_sheets = max(0, self.paper_sheets - sheets)
                self.complete_job(job_id)
            else:
                self.fail_job(job_id, "Mock printer simulation error")
        else:
            # Download file & print via pycups
            try:
                download_url = job.get("downloadUrl")
                if download_url:
                    r = requests.get(download_url, timeout=30)
                    with open(tmp_file_path, 'wb') as f:
                        f.write(r.content)

                cups_options = {
                    "copies": str(job.get("copies", 1)),
                    "sides": "two-sided-long-edge" if job.get("doubleSided") else "one-sided",
                    "ColorModel": "Color" if job.get("colour") else "Gray",
                }

                cups_job_id = self.cups_conn.printFile(self.printer_name, tmp_file_path, "PrintQ Job", cups_options)
                logger.info(f"CUPS Job #{cups_job_id} submitted for printer {self.printer_name}")

                # Monitor CUPS job completion
                while True:
                    time.sleep(1)
                    jobs = self.cups_conn.getJobs()
                    if cups_job_id not in jobs:
                        break # Job completed
                
                self.paper_sheets = max(0, self.paper_sheets - sheets)
                self.complete_job(job_id)

            except Exception as e:
                logger.error(f"CUPS print execution failed: {e}")
                self.fail_job(job_id, f"CUPS error: {str(e)}")
            finally:
                # Always delete local temp file
                if os.path.exists(tmp_file_path):
                    try:
                        os.remove(tmp_file_path)
                    except OSError:
                        pass

        self.current_job_id = None

    def complete_job(self, job_id: str):
        url = f"{self.backend_url}/api/agent/complete"
        payload = {"jobId": job_id}
        b = json.dumps(payload).encode('utf-8')
        try:
            requests.post(url, data=b, headers=self.make_auth_headers(b), timeout=15)
            logger.info(f"[JOB DONE] Job {job_id} marked completed.")
        except Exception as e:
            logger.error(f"Complete job error: {e}")

    def fail_job(self, job_id: str, reason: str):
        url = f"{self.backend_url}/api/agent/fail"
        payload = {"jobId": job_id, "failReason": reason}
        b = json.dumps(payload).encode('utf-8')
        try:
            requests.post(url, data=b, headers=self.make_auth_headers(b), timeout=15)
            logger.error(f"[JOB FAILED] Job {job_id} failed: {reason}")
        except Exception as e:
            logger.error(f"Fail job error: {e}")

    def run(self):
        logger.info(f"PrintQ Agent started for kiosk '{self.kiosk_code}'")
        last_hb = 0
        while True:
            now = time.time()
            if now - last_hb >= HEARTBEAT_INTERVAL_SEC:
                self.send_heartbeat()
                last_hb = now
            self.poll_next_job()
            time.sleep(POLL_INTERVAL_SEC)

if __name__ == "__main__":
    agent = KioskAgent()
    agent.run()
