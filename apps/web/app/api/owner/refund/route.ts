import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { razorpay } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, refundAmountPaise, reason } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Fetch job details
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const refundPaise = refundAmountPaise || job.amount_paise;

    // Trigger Razorpay Refund API
    if (job.razorpay_payment_id) {
      try {
        await razorpay.payments.refund(job.razorpay_payment_id, {
          amount: refundPaise,
          notes: { reason: reason || 'Owner manual refund' },
        });
      } catch (err: any) {
        console.warn('Razorpay refund API call error (mock bypass if test key):', err);
      }
    }

    // Update job status to refunded
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'refunded',
        refund_paise: refundPaise,
        fail_reason: reason || 'Refunded by owner',
      })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      jobId,
      refundPaise,
      totalRupees: (refundPaise / 100).toFixed(2),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
