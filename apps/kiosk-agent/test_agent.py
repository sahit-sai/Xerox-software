import unittest
from agent import generate_hmac_signature
from mock_printer import MockPrinter

class TestKioskAgent(unittest.TestCase):
    def test_hmac_signature(self):
        secret = "super-secret-key"
        payload = b'{"paper_sheets": 500, "state": "ok"}'
        sig1 = generate_hmac_signature(payload, secret)
        sig2 = generate_hmac_signature(payload, secret)
        self.assertEqual(sig1, sig2)
        self.assertEqual(len(sig1), 64) # SHA256 hex length

    def test_mock_printer_execution(self):
        printer = MockPrinter("TestPrinter")
        progress_counts = []
        def on_progress(p):
            progress_counts.append(p)

        options = {"copies": 1, "pages": 2, "sheets": 2}
        result = printer.print_file("test.pdf", options, on_progress)
        self.assertTrue(result)
        self.assertEqual(progress_counts, [1, 2])

if __name__ == "__main__":
    unittest.main()
