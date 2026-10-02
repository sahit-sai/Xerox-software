import crypto from 'crypto';
import { supabaseAdmin } from './supabase';
import { KioskSession, SessionState } from '@printq/shared';

// In-Memory Session Store for instant local dev & offline testing
const memorySessions = new Map<string, any>();
const memoryShortCodes = new Map<string, string>(); // short_code -> token_hash

export function generateTokenAndHash(): { rawToken: string; tokenHash: string; shortCode: string } {
  const rawBytes = crypto.randomBytes(32);
  const rawToken = rawBytes.toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Generate 6-char uppercase alphanumeric code e.g. K7P-2QX
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

  // Try DB first
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
    // DB offline fallback
  }

  // Check memory store
  const allSessions = Array.from(memorySessions.values());
  for (const sess of allSessions) {
    if (sess.kiosk_id === kioskId && sess.state === 'qr_shown' && new Date(sess.expires_at) > now) {
      return { session: sess, rawToken: sess.rawToken, shortCode: sess.short_code, isNew: false };
    }
  }

  // Create new active session (90 second lifetime)
  const { rawToken, tokenHash, shortCode } = generateTokenAndHash();
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
  } catch (err) {
    // DB write bypass
  }

  // Store in memory
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

  // Try memory map with calculated hash or direct tokenOrHash key
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
      code: 'VISHNU01',
    };

    memorySessions.set(calculatedHash, memSession);
    if (memSession.token_hash) memorySessions.set(memSession.token_hash, memSession);

    // Trigger pre-creation of next session
    getOrCreateActiveSession(memSession.kiosk_id).catch(() => {});

    return { success: true, session: memSession };
  }

  // Fallback to DB update
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
