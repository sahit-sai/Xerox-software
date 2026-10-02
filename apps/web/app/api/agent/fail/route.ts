import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentHmac } from '@/lib/agent-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { razorpay } from '@/lib/razorpay';

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

    // Fetch failing job details
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (job) {
      const totalSheets = job.sheets || 1;
      const unprintedSheets = Math.max(0, totalSheets - printedSheets);
      const refundPaise = Math.round((unprintedSheets / totalSheets) * job.amount_paise);

      // Trigger Razorpay refund if payment ID exists
      if (job.razorpay_payment_id && refundPaise > 0) {
        try {
          await razorpay.payments.refund(job.razorpay_payment_id, {
            amount: refundPaise,
            notes: { reason: failReason || 'Kiosk print failure' },
          });
        } catch (err) {
          console.warn('Razorpay auto-refund API warning:', err);
        }
      }

      // Mark current job failed
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

    // Fail remaining queued jobs for this kiosk with full refunds
    const { data: queuedJobs } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('kiosk_id', kioskId)
      .eq('status', 'queued');

    if (queuedJobs && queuedJobs.length > 0) {
      for (const qJob of queuedJobs) {
        if (qJob.razorpay_payment_id) {
          try {
            await razorpay.payments.refund(qJob.razorpay_payment_id, {
              amount: qJob.amount_paise,
              notes: { reason: 'Kiosk printer out of service' },
            });
          } catch (e) {
            console.warn(`Refund error for queued job ${qJob.id}:`, e);
          }
        }

        await supabaseAdmin
          .from('jobs')
          .update({
            status: 'failed',
            fail_reason: 'Kiosk printer out of service',
            refund_paise: qJob.amount_paise,
          })
          .eq('id', qJob.id);
      }
    }

    // Set kiosk state to jam/offline
    await supabaseAdmin
      .from('kiosks')
      .update({ state: 'jam' })
      .eq('id', kioskId);

    return NextResponse.json({ success: true, jobId, status: 'failed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
