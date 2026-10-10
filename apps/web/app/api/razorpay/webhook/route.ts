import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { updateSessionState, getSessionStatus } from '@/lib/session';
import { queueJobById, createJobFromSession } from '@/lib/job';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    // Verify webhook signature (or bypass in test mode)
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const event = payload.event;

    // Handle payment.captured event
    if (event === 'payment.captured' || payload.mock_payment === true) {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id || payload.order_id;
      const sessionToken = paymentEntity.notes?.token || payload.notes?.token || payload.token;
      const paymentId = paymentEntity.id || payload.payment_id || `pay_${Date.now()}`;

      if (sessionToken) {
        updateSessionState(sessionToken, 'paid');
        const sessionStatus = getSessionStatus(sessionToken);
        if (sessionStatus?.session?.file) {
          createJobFromSession(sessionToken, {
            kioskId: sessionStatus.session.kiosk_id || 'VISHNU01',
            amountPaise: paymentEntity.amount || 200,
          });
        }
      }

      if (orderId && isSupabaseConfigured) {
        // Fetch job associated with orderId in Supabase
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .select('id, kiosk_id, status, token')
          .eq('razorpay_order_id', orderId)
          .single();

        if (job && job.status === 'awaiting_payment') {
          // Assign daily token number for kiosk
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const { count } = await supabaseAdmin
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('kiosk_id', job.kiosk_id)
            .gte('created_at', todayStart.toISOString())
            .not('token', 'is', null);

          const nextToken = (count || 0) + 1;

          await supabaseAdmin
            .from('jobs')
            .update({
              status: 'queued',
              token: nextToken,
              paid_at: new Date().toISOString(),
              razorpay_payment_id: paymentId,
            })
            .eq('id', job.id);

          console.log(`Payment confirmed for Job ${job.id}! Assigned Token #${nextToken}`);
        }
      }

      return NextResponse.json({ status: 'ok', received: true });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
