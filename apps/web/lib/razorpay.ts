import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TjLMtfv6HSwaOE';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'X3EZgXLKgwQe1PwN7QYmteXk';

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (keyId === 'rzp_test_mockkey123') return true; // Mock mode verification
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret || webhookSecret === 'your_razorpay_webhook_secret') return true; // Mock mode
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}
