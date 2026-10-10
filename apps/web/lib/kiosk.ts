import { supabaseAdmin, isSupabaseConfigured } from './supabase';

export interface KioskRecord {
  id: string;
  code: string;
  name: string;
  location: string;
  supports_colour: boolean;
  paper_sheets: number;
  paper_capacity: number;
  toner_pct: number;
  state: 'ok' | 'jam' | 'offline' | 'no_paper' | 'disabled';
  rate_bw: number; // in paise (e.g. 200 = ₹2.00)
  rate_colour: number; // in paise (e.g. 1000 = ₹10.00)
  rate_bw_paise?: number;
  rate_colour_paise?: number;
  double_discount_pct: number;
  cost_bw: number;
  cost_colour: number;
  last_heartbeat?: string;
  earnings_today?: number;
}

const defaultKiosks: KioskRecord[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    code: 'VISHNU01',
    name: 'Vishnu College Library',
    location: 'Ground Floor, Central Library, Bhimavaram',
    supports_colour: true,
    paper_sheets: 450,
    paper_capacity: 1000,
    toner_pct: 90.0,
    state: 'ok',
    rate_bw: 200,
    rate_colour: 1000,
    rate_bw_paise: 200,
    rate_colour_paise: 1000,
    double_discount_pct: 10,
    cost_bw: 50,
    cost_colour: 250,
    last_heartbeat: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'HOSTELA1',
    name: 'Boys Hostel Block A',
    location: 'Entrance Lobby, Hostel Block A',
    supports_colour: false,
    paper_sheets: 280,
    paper_capacity: 500,
    toner_pct: 45.0,
    state: 'ok',
    rate_bw: 200,
    rate_colour: 0,
    rate_bw_paise: 200,
    rate_colour_paise: 0,
    double_discount_pct: 5,
    cost_bw: 50,
    cost_colour: 250,
    last_heartbeat: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    code: 'DWARAKA1',
    name: 'Dwaraka Nagar Kiosk',
    location: 'Near Bus Stand, Dwaraka Nagar, Vizag',
    supports_colour: true,
    paper_sheets: 120,
    paper_capacity: 1000,
    toner_pct: 68.0,
    state: 'ok',
    rate_bw: 150,
    rate_colour: 800,
    rate_bw_paise: 150,
    rate_colour_paise: 800,
    double_discount_pct: 10,
    cost_bw: 40,
    cost_colour: 200,
    last_heartbeat: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

const memoryKiosks = new Map<string, KioskRecord>();

// Initialize memory store
defaultKiosks.forEach((k) => {
  memoryKiosks.set(k.code, { ...k });
  memoryKiosks.set(k.id, { ...k });
});

export function getKioskByCode(codeOrId: string): KioskRecord | null {
  return memoryKiosks.get(codeOrId) || null;
}

export function getAllKiosks(): KioskRecord[] {
  const seenIds = new Set<string>();
  const list: KioskRecord[] = [];
  for (const k of Array.from(memoryKiosks.values())) {
    if (!seenIds.has(k.id)) {
      seenIds.add(k.id);
      list.push(k);
    }
  }
  return list;
}

export function updateKioskHeartbeat(
  kioskIdOrCode: string,
  stats: { paperSheets?: number; tonerPct?: number; state?: string }
): KioskRecord | null {
  const kiosk = memoryKiosks.get(kioskIdOrCode);
  if (!kiosk) return null;

  if (stats.paperSheets !== undefined && stats.paperSheets !== null) {
    kiosk.paper_sheets = Number(stats.paperSheets);
    if (kiosk.paper_sheets <= 0) {
      kiosk.state = 'no_paper';
    }
  }

  if (stats.tonerPct !== undefined && stats.tonerPct !== null) {
    kiosk.toner_pct = Number(stats.tonerPct);
  }

  if (stats.state) {
    kiosk.state = stats.state as any;
  }

  kiosk.last_heartbeat = new Date().toISOString();

  // Sync back to map
  memoryKiosks.set(kiosk.code, kiosk);
  memoryKiosks.set(kiosk.id, kiosk);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('kiosks')
      .update({
        paper_sheets: kiosk.paper_sheets,
        toner_pct: kiosk.toner_pct,
        state: kiosk.state,
        last_heartbeat: kiosk.last_heartbeat,
      })
      .eq('id', kiosk.id)
      .then(() => {}, () => {});
  }

  return kiosk;
}

export function consumeKioskPaper(kioskIdOrCode: string, sheets: number): void {
  const kiosk = memoryKiosks.get(kioskIdOrCode);
  if (!kiosk) return;

  kiosk.paper_sheets = Math.max(0, kiosk.paper_sheets - sheets);
  if (kiosk.paper_sheets === 0) {
    kiosk.state = 'no_paper';
  }
  memoryKiosks.set(kiosk.code, kiosk);
  memoryKiosks.set(kiosk.id, kiosk);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('kiosks')
      .update({
        paper_sheets: kiosk.paper_sheets,
        state: kiosk.state,
      })
      .eq('id', kiosk.id)
      .then(() => {}, () => {});
  }
}

export function refillKioskPaper(kioskIdOrCode: string): KioskRecord | null {
  const kiosk = memoryKiosks.get(kioskIdOrCode);
  if (!kiosk) return null;

  kiosk.paper_sheets = kiosk.paper_capacity;
  kiosk.state = 'ok';
  memoryKiosks.set(kiosk.code, kiosk);
  memoryKiosks.set(kiosk.id, kiosk);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('kiosks')
      .update({
        paper_sheets: kiosk.paper_capacity,
        state: 'ok',
      })
      .eq('id', kiosk.id)
      .then(() => {}, () => {});
  }

  return kiosk;
}

export function replaceKioskToner(kioskIdOrCode: string): KioskRecord | null {
  const kiosk = memoryKiosks.get(kioskIdOrCode);
  if (!kiosk) return null;

  kiosk.toner_pct = 100.0;
  kiosk.state = 'ok';
  memoryKiosks.set(kiosk.code, kiosk);
  memoryKiosks.set(kiosk.id, kiosk);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('kiosks')
      .update({
        toner_pct: 100.0,
        state: 'ok',
      })
      .eq('id', kiosk.id)
      .then(() => {}, () => {});
  }

  return kiosk;
}
