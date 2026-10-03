import crypto from 'crypto';
import { supabaseAdmin } from './supabase';
import { KioskSession, SessionState } from '@printq/shared';

// Secret key for HMAC signature verification across serverless lambda instances
const SESSION_SECRET = process.env.RAZORPAY_KEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'printq-cmyk-secret-key-2026';

// Memory fallback store for local dev & offline testing
const memorySessions = new Map<string, any>();
const memoryShortCodes = new Map<string, string>(); // short_code -> token_hash

export function signSessionToken(kioskId: string, timestamp: number, nonce: string): string {
  const payloadStr = `${kioskId}.${timestamp}.${nonce}`;
  const hmacSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex').substring(0, 16);
  return `${Buffer.from(payloadStr).toString('base64url')}.${hmacSig}`;
}

export function verifyAndParseSessionToken(rawToken: string): { valid: boolean; expired?: boolean; kioskId?: string; timestamp?: number } {
  try {
    const parts = rawToken.split('.');
    if (parts.length !== 2) return { valid: false };
    const payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
    const hmacSig = parts[1];

    const [kioskId, timestampStr, nonce] = payloadStr.split('.');
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return { valid: false };

    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex').substring(0, 16);
    if (hmacSig !== expectedHmac) return { valid: false };

    const now = Date.now();
    // 90 seconds lifetime check for unclaimed QR code
    if (now - timestamp > 90 * 1000 || timestamp > now + 15 * 1000) {
      return { valid: false, expired: true, kioskId, timestamp };
    }

    return { valid: true, expired: false, kioskId, timestamp };
  } catch (err) {
    return { valid: false };
  }
}

export function generateTokenAndHash(kioskId: string = 'VISHNU01'): { rawToken: string; tokenHash: string; shortCode: string } {
  const now = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');
  const rawToken = signSessionToken(kioskId, now, nonce);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Generate 6-char uppercase alphanumeric backup code e.g. K7P-2QX
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c1 = '', c2 = '';
  for (let i = 0; i < 3; i++) {
    c1 += chars.charAt(Math.floor(Math.random() * chars.length));
    c2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const shortCode = `${c1}-${c2}`;

  return { rawToken, tokenHash, shortCode };
}

export async function getOrCreateActiveSession(kioskId: string) {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Check memory store
  const allSessions = Array.from(memorySessions.values());
  for (const sess of allSessions) {
    if (sess.kiosk_id === kioskId && sess.state === 'qr_shown' && new Date(sess.expires_at) > now) {
      return { session: sess, rawToken: sess.rawToken, shortCode: sess.short_code, isNew: false };
    }
  }

  // 2. Try DB lookup
  try {
    await supabaseAdmin
      .from('sessions')
      .update({ state: 'expired', updated_at: nowIso })
      .eq('kiosk_id', kioskId)
      .in('state', ['qr_shown', 'phone_connected'])
      .lt('expires_at', nowIso);

    const { data: existingSession } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('kiosk_id', kioskId)
      .eq('state', 'qr_shown')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      return { session: existingSession, isNew: false };
    }
  } catch (e) {
    // DB bypass
  }

  // 3. Create new signed active session (90 second lifetime)
  const { rawToken, tokenHash, shortCode } = generateTokenAndHash(kioskId);
  const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();

  const newSessionData: any = {
    id: crypto.randomUUID(),
    kiosk_id: kioskId,
    token_hash: tokenHash,
    short_code: shortCode,
    state: 'qr_shown' as SessionState,
    phone_device_id: null,
    created_at: nowIso,
    expires_at: expiresAt,
    claimed_at: null,
    job_id: null,
    updated_at: nowIso,
    rawToken,
  };

  try {
    const { data: createdSession } = await supabaseAdmin
      .from('sessions')
      .insert([{
        kiosk_id: kioskId,
        token_hash: tokenHash,
        short_code: shortCode,
        state: 'qr_shown',
        created_at: nowIso,
        expires_at: expiresAt,
        updated_at: nowIso,
      }])
      .select('*')
      .single();

    if (createdSession) {
      memorySessions.set(tokenHash, createdSession);
      memoryShortCodes.set(shortCode, tokenHash);
      return { session: createdSession, rawToken, shortCode, isNew: true };
    }
  } catch (err) {}

  // Save to in-memory maps
  memorySessions.set(tokenHash, newSessionData);
  if (rawToken) memorySessions.set(rawToken, newSessionData);
  memoryShortCodes.set(shortCode, tokenHash);

  return { session: newSessionData, rawToken, shortCode, isNew: true };
}

export async function claimSessionByToken(tokenOrHash: string, deviceId: string) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  const now = new Date();
  const nowIso = now.toISOString();
  const tenMinLaterIso = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 1. Check memory map first
  const memSession = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);
  if (memSession) {
    if (memSession.state !== 'qr_shown') {
      return { success: false, reason: 'already_claimed' };
    }
    if (new Date(memSession.expires_at) <= now) {
      return { success: false, reason: 'expired' };
    }

    memSession.state = 'phone_connected';
    memSession.claimed_at = nowIso;
    memSession.expires_at = tenMinLaterIso;
    memSession.phone_device_id = deviceId;
    memSession.updated_at = nowIso;
    memSession.kiosks = {
      name: 'Vishnu College Library',
      code: memSession.kiosk_id || 'VISHNU01',
    };

    memorySessions.set(calculatedHash, memSession);
    memorySessions.set(tokenOrHash, memSession);

    return { success: true, session: memSession };
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

export function updateSessionFile(tokenOrHash: string, fileInfo: { name: string; pages: number; path: string; size: number; type?: string; previewUrl?: string }) {
  const calculatedHash = crypto.createHash('sha256').update(tokenOrHash).digest('hex');
  let sess = memorySessions.get(calculatedHash) || memorySessions.get(tokenOrHash);

  if (!sess) {
    sess = {
      id: crypto.randomUUID(),
      kiosk_id: 'VISHNU01',
      token_hash: calculatedHash,
      state: 'file_ready',
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
  }
  return sess;
}

