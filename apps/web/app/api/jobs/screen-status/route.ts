import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getKioskJobStats } from '@/lib/job';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kioskCode = searchParams.get('kioskCode') || 'VISHNU01';

    let currentKiosk = {
      id: '22222222-2222-2222-2222-222222222221',
      code: kioskCode,
      name: 'Vishnu College Library',
      state: 'ok',
      paper_sheets: 450,
      toner_pct: 88.5,
    };

    if (isSupabaseConfigured) {
      const { data: kiosk } = await supabaseAdmin
        .from('kiosks')
        .select('id, code, name, state, paper_sheets, toner_pct')
        .eq('code', kioskCode)
        .single();
      if (kiosk) currentKiosk = kiosk;
    }

    // 1. Check in-memory job stats first
    const memStats = getKioskJobStats(currentKiosk.id);
    let queueCount = memStats.queueCount;
    let activeJob = memStats.activeJob;

    // 2. Supplement from Supabase if activeJob is null
    if (!activeJob && isSupabaseConfigured) {
      const { count } = await supabaseAdmin
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('kiosk_id', currentKiosk.id)
        .eq('status', 'queued');
      if (count !== null) queueCount = count;

      const { data: dbActiveJob } = await supabaseAdmin
        .from('jobs')
        .select('id, token_no, token, file_name, sheets, printed_sheets, status')
        .eq('kiosk_id', currentKiosk.id)
        .eq('status', 'printing')
        .limit(1)
        .single();

      if (dbActiveJob) activeJob = dbActiveJob as any;
    }

    return NextResponse.json({
      kiosk: currentKiosk,
      queueCount: queueCount || 0,
      activeJob: activeJob ? {
        id: activeJob.id,
        token: activeJob.token_no || activeJob.token || 1,
        fileName: activeJob.file_name,
        sheets: activeJob.sheets,
        printedSheets: activeJob.printed_sheets,
        status: activeJob.status,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
