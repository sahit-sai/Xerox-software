import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getNextQueuedJob } from '@/lib/job';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAgentHmac(req, '');

    if (!authResult.success || !authResult.kiosk) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const kioskId = authResult.kiosk.id;

    // 1. Check in-memory store first
    let job: any = getNextQueuedJob(kioskId);

    // 2. Fall back to Supabase if configured and no memory job found
    if (!job && isSupabaseConfigured) {
      try {
        const { data: dbJob, error } = await supabaseAdmin
          .from('jobs')
          .select('*')
          .eq('kiosk_id', kioskId)
          .eq('status', 'queued')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!error && dbJob) {
          job = dbJob;
          await supabaseAdmin
            .from('jobs')
            .update({ status: 'printing' })
            .eq('id', job.id);
        }
      } catch (err) {
        console.warn('Supabase next-job query error:', err);
      }
    }

    if (!job) {
      return NextResponse.json({ job: null });
    }

    // Determine download URL (must be absolute for Python requests)
    const origin = req.nextUrl.origin || 'http://localhost:3000';
    let downloadUrl = `${origin}/api/jobs/file-stream/${job.id}`;

    if (isSupabaseConfigured && job.file_path) {
      try {
        const { data: signedData } = await supabaseAdmin.storage
          .from('print-files')
          .createSignedUrl(job.file_path, 300);
        if (signedData?.signedUrl) {
          downloadUrl = signedData.signedUrl;
        }
      } catch (e) {
        // Fall back to local file-stream URL
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        token: job.token_no || job.token || 1,
        fileName: job.file_name,
        filePath: job.file_path,
        downloadUrl,
        pages: job.total_pages || job.pages || 1,
        copies: job.copies || 1,
        colour: Boolean(job.colour),
        doubleSided: Boolean(job.double_sided),
        sheets: job.sheets || 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
