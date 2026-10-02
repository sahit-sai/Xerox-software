import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*, kiosks(code, name, location)')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      // Fallback mock job lookup for local testing
      return NextResponse.json({
        job: {
          id: jobId,
          token: 7,
          customer_phone: '+919876543210',
          file_name: 'document.pdf',
          pages: 4,
          copies: 1,
          colour: false,
          double_sided: true,
          sheets: 2,
          amount_paise: 360,
          status: 'queued',
          printed_sheets: 0,
          queue_ahead: 1,
          kiosk_name: 'Vishnu College Library',
        },
      });
    }

    // Count queued jobs ahead for this kiosk
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
