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
    const { jobId, printedSheets } = payload;

    if (!jobId || printedSheets === undefined) {
      return NextResponse.json({ error: 'Missing jobId or printedSheets' }, { status: 400 });
    }

    await supabaseAdmin
      .from('jobs')
      .update({ printed_sheets: printedSheets })
      .eq('id', jobId);

    return NextResponse.json({ success: true, jobId, printedSheets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
