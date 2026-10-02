import time
import logging

logger = logging.getLogger("MockPrinter")

class MockPrinter:
    def __init__(self, name: str = "MockPrinter"):
        self.name = name
        self.state = "idle"
        self.paper_sheets = 500
        self.toner_pct = 95.0

    def print_file(self, file_path: str, options: dict, progress_callback=None) -> bool:
        copies = int(options.get("copies", 1))
        pages = int(options.get("pages", 1))
        sheets = int(options.get("sheets", pages * copies))

        logger.info(f"[MOCK PRINTER] Printing '{file_path}' ({sheets} sheets, options: {options})...")
        
        for sheet_idx in range(1, sheets + 1):
            time.sleep(0.5) # Simulate physical printing delay per sheet
            self.paper_sheets = max(0, self.paper_sheets - 1)
            self.toner_pct = max(0.0, self.toner_pct - 0.05)
            logger.info(f"[MOCK PRINTER] Printed sheet {sheet_idx}/{sheets}")
            if progress_callback:
                progress_callback(sheet_idx)

        logger.info(f"[MOCK PRINTER] Job print completed successfully.")
        return True
