-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enums
DO $$ BEGIN
    CREATE TYPE kiosk_state AS ENUM ('ok', 'jam', 'offline', 'no_paper', 'disabled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE session_state AS ENUM (
        'idle',
        'qr_shown',
        'phone_connected',
        'file_uploaded',
        'file_ready',
        'options_set',
        'awaiting_payment',
        'paid',
        'printing',
        'printed',
        'completed',
        'expired',
        'cancelled',
        'payment_failed',
        'print_failed',
        'refunded'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'awaiting_payment', 'paid', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Kiosks Table
CREATE TABLE IF NOT EXISTS kiosks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    supports_colour BOOLEAN NOT NULL DEFAULT FALSE,
    paper_sheets INT NOT NULL DEFAULT 0,
    paper_capacity INT NOT NULL DEFAULT 1000,
    toner_pct NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    state kiosk_state NOT NULL DEFAULT 'offline',
    last_heartbeat TIMESTAMPTZ,
    device_secret_hash TEXT NOT NULL,
    rate_bw_paise INT NOT NULL DEFAULT 200,
    rate_colour_paise INT NOT NULL DEFAULT 1000,
    double_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    cost_bw_paise INT NOT NULL DEFAULT 50,
    cost_colour_paise INT NOT NULL DEFAULT 250,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sessions Table (Dynamic One-Time QR Sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of 32-byte secret
    short_code TEXT NOT NULL,       -- 6-character code e.g. K7P-2QX
    state session_state NOT NULL DEFAULT 'qr_shown',
    phone_device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    job_id UUID,                     -- Foreign key to jobs table
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup & Realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_sessions_kiosk_state ON sessions(kiosk_id, state);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_short_code ON sessions(short_code);

-- 3. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    token_no INT,
    customer_phone TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_pages INT NOT NULL,
    page_range TEXT,
    copies INT NOT NULL DEFAULT 1,
    colour BOOLEAN NOT NULL DEFAULT FALSE,
    double_sided BOOLEAN NOT NULL DEFAULT FALSE,
    orientation TEXT DEFAULT 'auto',
    sheets INT NOT NULL,
    amount_paise INT NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    razorpay_qr_id TEXT,
    razorpay_payment_id TEXT,
    printed_sheets INT NOT NULL DEFAULT 0,
    fail_reason TEXT,
    refund_paise INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    done_at TIMESTAMPTZ
);

-- Foreign key linking back to jobs
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_jobs;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_jobs FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- 4. Kiosk Events Table
CREATE TABLE IF NOT EXISTS kiosk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public kiosks read" ON kiosks;
CREATE POLICY "Public kiosks read" ON kiosks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public sessions read" ON sessions;
CREATE POLICY "Public sessions read" ON sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public jobs read" ON jobs;
CREATE POLICY "Public jobs read" ON jobs FOR SELECT USING (true);
