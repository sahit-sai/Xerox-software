import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const authResult = await verifyAgentHmac(req, rawBody);

    if (!authResult.success || !authResult.kiosk) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const { paper_sheets, toner_pct, state } = payload;

    const kioskId = authResult.kiosk.id;

    // Update kiosk heartbeat and stats
    await supabaseAdmin
      .from('kiosks')
      .update({
        paper_sheets: paper_sheets ?? authResult.kiosk.paper_sheets,
        toner_pct: toner_pct ?? 100,
        state: state || 'ok',
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', kioskId);

    // Record heartbeat event
    await supabaseAdmin.from('kiosk_events').insert([
      {
        kiosk_id: kioskId,
        type: 'heartbeat',
        payload: { paper_sheets, toner_pct, state },
      },
    ]);

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('API /api/agent/heartbeat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
