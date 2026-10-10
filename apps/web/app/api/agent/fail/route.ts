import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { razorpay } from '@/lib/razorpay';
import { failJob, getJobById } from '@/lib/job';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const authResult = await verifyAgentHmac(req, rawBody);

    if (!authResult.success || !authResult.kiosk) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const { jobId, failReason, printedSheets = 0 } = payload;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const kioskId = authResult.kiosk.id;

    // Fail job in memory
    const memoryJob = failJob(jobId, failReason || 'Hardware error', printedSheets);

    // If Supabase is configured, process refund and sync
    if (isSupabaseConfigured) {
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      const targetJob = job || memoryJob;

      if (targetJob) {
        const totalSheets = targetJob.sheets || 1;
        const unprintedSheets = Math.max(0, totalSheets - printedSheets);
        const refundPaise = Math.round((unprintedSheets / totalSheets) * targetJob.amount_paise);

        if (targetJob.razorpay_payment_id && refundPaise > 0) {
          try {
            await razorpay.payments.refund(targetJob.razorpay_payment_id, {
              amount: refundPaise,
              notes: { reason: failReason || 'Kiosk print failure' },
            });
          } catch (err) {
            console.warn('Razorpay auto-refund API warning:', err);
          }
        }

        await supabaseAdmin
          .from('jobs')
          .update({
            status: 'failed',
            fail_reason: failReason || 'Hardware error',
            refund_paise: refundPaise,
            printed_sheets: printedSheets,
          })
          .eq('id', jobId);
      }

      await supabaseAdmin
        .from('kiosks')
        .update({ state: 'jam' })
        .eq('id', kioskId);
    }

    return NextResponse.json({ success: true, jobId, status: 'failed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
