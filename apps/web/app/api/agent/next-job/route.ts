import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAgentHmac(req, '');

    if (!authResult.success || !authResult.kiosk) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const kioskId = authResult.kiosk.id;

    // Fetch oldest queued job for kiosk
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('kiosk_id', kioskId)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !job) {
      return NextResponse.json({ job: null });
    }

    // Update job status to 'printing'
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'printing' })
      .eq('id', job.id);

    // Create 5-minute signed file download URL
    let downloadUrl = '';
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from('print-files')
        .createSignedUrl(job.file_path, 300);
      downloadUrl = signedData?.signedUrl || '';
    } catch (e) {
      downloadUrl = `/api/jobs/file-stream/${job.id}`;
    }

    return NextResponse.json({
      job: {
        id: job.id,
        token: job.token,
        fileName: job.file_name,
        filePath: job.file_path,
        downloadUrl,
        pages: job.pages,
        copies: job.copies,
        colour: job.colour,
        doubleSided: job.double_sided,
        sheets: job.sheets,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
