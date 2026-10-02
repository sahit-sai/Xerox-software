#!/usr/bin/env bash
# PrintQ Raspberry Pi Kiosk Installer
set -e

echo "=== PrintQ Kiosk Agent & Screen Setup ==="

# 1. System packages installation
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv cups libcups2-dev chromium-browser x11-xserver-utils unclutter

# 2. CUPS Printer Configuration (Enable PDF & Raw printers)
sudo systemctl enable --now cups
sudo usermod -a -G lpadmin $USER

# 3. Setup Python venv
cd "$(dirname "$0")"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 4. Install Systemd Service
sudo cp printq-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable printq-agent.service

echo "=== Installation Completed Successfully ==="
echo "Run 'sudo systemctl start printq-agent' to start the kiosk service."
