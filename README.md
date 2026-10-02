# PrintQ — QR-Based Self-Service Print Kiosk System

PrintQ is a production-ready, self-service printing kiosk system designed for India. Customers scan a QR code on the kiosk display screen, upload documents on their phone, pay instantly via Razorpay UPI, and collect their prints automatically from the tray without shop staff intervention.

---

## Architecture Overview

- **`apps/web`**: Next.js 14 (App Router) + TypeScript + Tailwind CSS.
  - `/k/[kioskCode]`: Mobile customer print upload & live status tracker.
  - `/screen/[kioskCode]`: Chromium HDMI kiosk screen with real dynamic QR code.
  - `/owner`: Dashboard for revenue analytics, job monitoring, refunds, & kiosk hardware management.
  - `/api/jobs`, `/api/razorpay/webhook`, `/api/agent/*`: HMAC-authenticated REST & Webhook APIs.
- **`apps/kiosk-agent`**: Python 3.11 agent for Raspberry Pi 4 (CUPS integration + Mock printer mode).
- **`packages/shared`**: Shared types, pricing algorithms (Paise accuracy), and unit validators.
- **`supabase/`**: SQL schema migrations, Row Level Security (RLS) policies, and seed dataset.

---

## Local Development Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` in `apps/web/.env.local` and set your Supabase and Razorpay keys:
```bash
cp .env.example apps/web/.env.local
```

### 3. Build Monorepo Packages
```bash
pnpm build:shared
```

### 4. Run Development Server
```bash
pnpm dev:web
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Raspberry Pi 4 Installation

1. Clone repo to Pi: `/home/pi/printq`
2. Run automated installer:
   ```bash
   cd /home/pi/printq/apps/kiosk-agent
   chmod +x install.sh
   ./install.sh
   ```
3. Start service:
   ```bash
   sudo systemctl start printq-agent
   ```
