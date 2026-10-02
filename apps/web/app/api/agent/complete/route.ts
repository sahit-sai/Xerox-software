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
    const { jobId } = payload;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Fetch job details to get file path
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('id, file_path, sheets, kiosk_id')
      .eq('id', jobId)
      .single();

    // Mark job done
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'done',
        done_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Immediately delete file from storage for privacy compliance
    if (job?.file_path) {
      try {
        await supabaseAdmin.storage.from('print-files').remove([job.file_path]);
      } catch (err) {
        console.warn('Storage file deletion error:', err);
      }
    }

    // Decrement kiosk paper count
    if (job?.sheets) {
      await supabaseAdmin.rpc('decrement_paper_sheets', {
        k_id: job.kiosk_id,
        count: job.sheets,
      });
    }

    return NextResponse.json({ success: true, jobId, status: 'done' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
