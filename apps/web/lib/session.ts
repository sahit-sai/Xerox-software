import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';

export type SessionState = 'qr_shown' | 'phone_connected' | 'file_ready' | 'paid' | 'expired';

export interface KioskSession {
  id: string;
  kiosk_id: string;
  token_hash: string;
  short_code: string;
  state: SessionState;
  claimed_at?: string;
  expires_at: string;
  phone_device_id?: string;
  created_at: string;
  updated_at: string;
  kiosks?: {
    name: string;
    code: string;
  };
  file?: {
    name: string;
    path: string;
    pages: number;
    size: number;
    type?: string;
    previewUrl?: string;
    buffer?: Buffer;
  };
}

// In-memory fallback map for environments without configured Supabase or local testing
const memorySessions = new Map<string, KioskSession>();

const SESSION_SIGNING_SECRET = process.env.SESSION_SIGNING_SECRET || 'printq-production-secret-session-salt-2026';

/**
 * Creates a stateless signed session token containing kioskCode, timestamp, and salt.
 * Allows instant verification on any serverless lambda without shared in-memory state.
 */
export function generateSignedSessionToken(kioskId: string, kioskCode: string): string {
  const ts = Date.now().toString(36);
  const salt = crypto.randomBytes(6).toString('hex');
  const payload = `${kioskId}.${kioskCode}.${ts}.${salt}`;
  const sig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(payload).digest('hex').substring(0, 16);
  return `${payload}.${sig}`;
}

/**
 * Verifies if a session token was signed by our system and hasn't expired (max 15 mins).
 */
export function verifyAndParseSessionToken(token: string): { valid: boolean; kioskId?: string; kioskCode?: string; expired?: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 5) return { valid: false };

    const [kioskId, kioskCode, tsStr, salt, sig] = parts;
    const payload = `${kioskId}.${kioskCode}.${tsStr}.${salt}`;
    const expectedSig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(payload).digest('hex').substring(0, 16);

    if (sig !== expectedSig) {
      return { valid: false };
    }

    const createdTime = parseInt(tsStr, 36);
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - createdTime > fifteenMinutes) {
      return { valid: false, expired: true };
    }

    return { valid: true, kioskId, kioskCode };
  } catch (e) {
    return { valid: false };
  }
}

/**
 * Generates an ambiguous-free 6-character backup code (e.g. 7K4M2P)
 */
export function generateShortCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createKioskSession(kioskId: string, kioskCode: string) {
  const rawToken = generateSignedSessionToken(kioskId, kioskCode);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const shortCode = generateShortCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Primary: Always seed in-memory session for instant zero-latency local lookups
  const localSession: KioskSession = {
    id: crypto.randomUUID(),
    kiosk_id: kioskId,
    token_hash: tokenHash,
    short_code: shortCode,
    state: 'qr_shown',
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    kiosks: {
      name: 'Vishnu College Library',
      code: kioskCode,
    },
  };
  memorySessions.set(tokenHash, localSession);
  memorySessions.set(rawToken, localSession);

  // Non-blocking async background store in Supabase if configured (0ms latency for UI)
  if (isSupabaseConfigured) {
    supabaseAdmin.from('sessions').insert({
      id: localSession.id,
      kiosk_id: kioskId,
      token_hash: tokenHash,
      short_code: shortCode,
      state: 'qr_shown',
      expires_at: expiresAt,
    }).then(() => {}, (e) => console.warn('Supabase session insert notice:', e));
  }

  return {
    rawToken,
    shortCode,
    expiresAt,
    session: localSession,
  };
}

export async function getOrCreateActiveSession(kioskId: string, kioskCode: string = 'VISHNU01') {
  return createKioskSession(kioskId, kioskCode);
}

export async function claimSessionByToken(tokenOrHash: string, deviceId: string) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  const nowIso = new Date().toISOString();
  const tenMinLaterIso = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 1. Direct In-Memory lookup
  let existing = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);
  if (existing) {
    if (existing.state !== 'qr_shown') {
      return { success: false, reason: 'already_claimed' };
    }
    if (new Date(existing.expires_at) < new Date()) {
      return { success: false, reason: 'expired' };
    }

    existing.state = 'phone_connected';
    existing.claimed_at = nowIso;
    existing.expires_at = tenMinLaterIso;
    existing.phone_device_id = deviceId;
    existing.updated_at = nowIso;

    memorySessions.set(calculatedHash, existing);
    memorySessions.set(tokenOrHash, existing);

    // Sync to Supabase in background
    if (isSupabaseConfigured) {
      supabaseAdmin
        .from('sessions')
        .update({
          state: 'phone_connected',
          claimed_at: nowIso,
          expires_at: tenMinLaterIso,
          phone_device_id: deviceId,
          updated_at: nowIso,
        })
        .or(`token_hash.eq.${calculatedHash},token_hash.eq.${tokenOrHash}`)
        .then(() => {}, () => {});
    }

    return { success: true, session: existing };
  }

  // 2. Stateless HMAC Signature Verification across Vercel Lambda instances
  const tokenParse = verifyAndParseSessionToken(tokenOrHash);
  if (tokenParse.valid) {
    const statelessSession: any = {
      id: crypto.randomUUID(),
      kiosk_id: tokenParse.kioskId || 'VISHNU01',
      token_hash: calculatedHash,
      short_code: 'STAT-01',
      state: 'phone_connected' as SessionState,
      claimed_at: nowIso,
      expires_at: tenMinLaterIso,
      phone_device_id: deviceId,
      created_at: nowIso,
      updated_at: nowIso,
      kiosks: {
        name: 'Vishnu College Library',
        code: tokenParse.kioskId || 'VISHNU01',
      },
    };

    memorySessions.set(calculatedHash, statelessSession);
    memorySessions.set(tokenOrHash, statelessSession);

    return { success: true, session: statelessSession };
  }

  if (tokenParse.expired) {
    return { success: false, reason: 'expired' };
  }

  // 3. Fallback DB update
  try {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .update({
        state: 'phone_connected',
        claimed_at: nowIso,
        expires_at: tenMinLaterIso,
        phone_device_id: deviceId,
        updated_at: nowIso,
      })
      .or(`token_hash.eq.${calculatedHash},token_hash.eq.${tokenOrHash}`)
      .eq('state', 'qr_shown')
      .gt('expires_at', nowIso)
      .select('*, kiosks(*)')
      .single();

    if (session) {
      memorySessions.set(calculatedHash, session);
      return { success: true, session };
    }
  } catch (e) {}

  return { success: false, reason: 'expired' };
}

export function getSessionStatus(tokenOrHash: string) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  const sess = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);
  if (sess) {
    return { success: true, session: sess };
  }
  return { success: false, session: null };
}

export function updateSessionFile(tokenOrHash: string, fileInfo: { name: string; pages: number; path: string; size: number; type?: string; previewUrl?: string; buffer?: Buffer }) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  let sess = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);

  if (!sess) {
    sess = {
      id: crypto.randomUUID(),
      kiosk_id: 'VISHNU01',
      token_hash: calculatedHash,
      short_code: 'STAT-01',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      state: 'file_ready',
      updated_at: new Date().toISOString(),
    };
  }

  sess.state = 'file_ready';
  sess.file = fileInfo;
  sess.updated_at = new Date().toISOString();

  memorySessions.set(calculatedHash, sess);
  memorySessions.set(tokenOrHash, sess);
  return sess;
}

export function updateSessionState(tokenOrHash: string, newState: SessionState) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  let sess = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);

  if (sess) {
    sess.state = newState;
    sess.updated_at = new Date().toISOString();
    memorySessions.set(calculatedHash, sess);
    memorySessions.set(tokenOrHash, sess);
    return sess;
  }
  return null;
}
