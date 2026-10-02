import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kioskCode = searchParams.get('kioskCode') || 'VISHNU01';

    // Fetch kiosk info
    const { data: kiosk } = await supabaseAdmin
      .from('kiosks')
      .select('id, code, name, state, paper_sheets, toner_pct')
      .eq('code', kioskCode)
      .single();

    const currentKiosk = kiosk || {
      id: '22222222-2222-2222-2222-222222222221',
      code: kioskCode,
      name: 'Vishnu College Library',
      state: 'ok',
      paper_sheets: 450,
      toner_pct: 88.5,
    };

    // Count queued jobs
    const { count: queueCount } = await supabaseAdmin
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('kiosk_id', currentKiosk.id)
      .eq('status', 'queued');

    // Fetch active printing job if any
    const { data: activeJob } = await supabaseAdmin
      .from('jobs')
      .select('id, token, file_name, sheets, printed_sheets, status')
      .eq('kiosk_id', currentKiosk.id)
      .eq('status', 'printing')
      .limit(1)
      .single();

    return NextResponse.json({
      kiosk: currentKiosk,
      queueCount: queueCount || 0,
      activeJob: activeJob || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
