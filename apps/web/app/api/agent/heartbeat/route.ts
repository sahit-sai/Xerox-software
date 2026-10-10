import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { updateKioskHeartbeat } from '@/lib/kiosk';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const authResult = await verifyAgentHmac(req, rawBody);

    if (!authResult.success || !authResult.kiosk) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const paperSheets = payload.paperSheets ?? payload.paper_sheets ?? authResult.kiosk.paper_sheets;
    const tonerPct = payload.tonerPct ?? payload.toner_pct ?? 90;
    const state = payload.state || 'ok';

    const kioskId = authResult.kiosk.id;
    const kioskCode = authResult.kiosk.code;

    // 1. Update in-memory real-time kiosk store
    updateKioskHeartbeat(kioskCode, { paperSheets, tonerPct, state });
    updateKioskHeartbeat(kioskId, { paperSheets, tonerPct, state });

    // 2. Update Supabase if configured
    if (isSupabaseConfigured) {
      supabaseAdmin
        .from('kiosks')
        .update({
          paper_sheets: paperSheets,
          toner_pct: tonerPct,
          state,
          last_heartbeat: new Date().toISOString(),
        })
        .eq('id', kioskId)
        .then(() => {}, () => {});

      supabaseAdmin
        .from('kiosk_events')
        .insert([
          {
            kiosk_id: kioskId,
            type: 'heartbeat',
            payload: { paperSheets, tonerPct, state },
          },
        ])
        .then(() => {}, () => {});
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('API /api/agent/heartbeat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
