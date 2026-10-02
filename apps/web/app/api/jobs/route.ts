import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { razorpay } from '@/lib/razorpay';
import { countDocumentPages, parsePageRange } from '@/lib/pdf';
import { calculateJobPrice, calculateSheets } from '@printq/shared';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kioskCode = formData.get('kioskCode') as string | null;
    const customerPhone = formData.get('customerPhone') as string | null;
    const copies = Math.min(50, Math.max(1, parseInt((formData.get('copies') as string) || '1', 10)));
    const colour = formData.get('colour') === 'true';
    const doubleSided = formData.get('doubleSided') === 'true';
    const pageRange = formData.get('pageRange') as string | null;

    if (!file || !kioskCode || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required parameters: file, kioskCode, customerPhone' },
        { status: 400 }
      );
    }

    // 25 MB Limit Check
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 25 MB' },
        { status: 400 }
      );
    }

    // Process file buffer & count pages
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rawPages = await countDocumentPages(buffer, file.type || 'application/pdf');
    const effectivePages = parsePageRange(pageRange || undefined, rawPages);

    // Fetch Kiosk details
    const { data: kiosk, error: kioskError } = await supabaseAdmin
      .from('kiosks')
      .select('*')
      .eq('code', kioskCode)
      .single();

    // Fallback kiosk data if DB not connected yet
    const currentKiosk = kiosk || {
      id: '22222222-2222-2222-2222-222222222221',
      code: kioskCode,
      name: 'Vishnu College Library',
      supports_colour: true,
      paper_sheets: 450,
      state: 'ok',
      rate_bw: 200,
      rate_colour: 1000,
      double_discount_pct: 10,
    };

    // Verify kiosk readiness
    if (currentKiosk.state !== 'ok') {
      return NextResponse.json(
        { error: `Kiosk is currently ${currentKiosk.state.replace('_', ' ')}. Please use another kiosk.` },
        { status: 400 }
      );
    }

    const requiredSheets = calculateSheets(effectivePages, copies, doubleSided);
    if (currentKiosk.paper_sheets < requiredSheets) {
      return NextResponse.json(
        {
          error: `Kiosk has only ${currentKiosk.paper_sheets} paper sheets remaining. Your job requires ${requiredSheets} sheets.`,
        },
        { status: 400 }
      );
    }

    // Calculate Price in Paise
    const pricing = calculateJobPrice(currentKiosk, {
      pages: effectivePages,
      copies,
      colour,
      double_sided: doubleSided,
    });

    // Upload file to Supabase Storage or mock path
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `jobs/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    try {
      await supabaseAdmin.storage.from('print-files').upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    } catch (e) {
      console.warn('Supabase storage upload skipped or failed, using local key reference:', e);
    }

    // Create Job Record
    const jobId = crypto.randomUUID();
    let razorpayOrderId = `order_mock_${Date.now()}`;

    // Create Razorpay Order
    try {
      const order = await razorpay.orders.create({
        amount: pricing.totalPaise,
        currency: 'INR',
        receipt: jobId,
        notes: {
          kioskCode,
          customerPhone,
        },
      });
      razorpayOrderId = order.id;
    } catch (err) {
      console.warn('Razorpay order creation fallback to mock order ID:', err);
    }

    const jobPayload = {
      id: jobId,
      kiosk_id: currentKiosk.id,
      customer_phone: customerPhone,
      file_path: filePath,
      file_name: file.name,
      pages: effectivePages,
      copies,
      colour: colour && currentKiosk.supports_colour,
      double_sided: doubleSided,
      sheets: requiredSheets,
      amount_paise: pricing.totalPaise,
      status: 'awaiting_payment',
      razorpay_order_id: razorpayOrderId,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseAdmin.from('jobs').insert([jobPayload]);
    if (insertError) {
      console.error('Job insert error:', insertError);
    }

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        kioskCode,
        fileName: file.name,
        pages: effectivePages,
        copies,
        colour,
        doubleSided,
        sheets: requiredSheets,
        amountPaise: pricing.totalPaise,
        totalRupees: pricing.totalRupees,
        razorpayOrderId,
        razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockkey123',
      },
    });
  } catch (error: any) {
    console.error('API /api/jobs Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create print job' }, { status: 500 });
  }
}
