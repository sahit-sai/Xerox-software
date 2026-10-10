import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getJobById } from '@/lib/job';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // 1. In-memory job check
    const memoryJob = getJobById(jobId);
    if (memoryJob) {
      return NextResponse.json({
        job: {
          ...memoryJob,
          queue_ahead: 0,
          kiosk_name: 'Vishnu College Library',
        },
      });
    }

    // 2. Supabase DB check
    if (isSupabaseConfigured) {
      const { data: job, error } = await supabaseAdmin
        .from('jobs')
        .select('*, kiosks(code, name, location)')
        .eq('id', jobId)
        .single();

      if (!error && job) {
        let queueAhead = 0;
        if (job.status === 'queued') {
          const { count } = await supabaseAdmin
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('kiosk_id', job.kiosk_id)
            .in('status', ['queued', 'printing'])
            .lt('created_at', job.created_at);
          queueAhead = count || 0;
        }

        return NextResponse.json({
          job: {
            ...job,
            queue_ahead: queueAhead,
          },
        });
      }
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
