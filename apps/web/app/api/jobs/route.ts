import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { razorpay } from '@/lib/razorpay';
import { countDocumentPages, parsePageRange } from '@/lib/pdf';
import { calculateJobPrice, calculateSheets } from '@printq/shared';
import { createOrQueueJob, createJobFromSession } from '@/lib/job';
import { getSessionStatus, updateSessionState } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // A. Handle JSON submission (from Kiosk Screen or Session Payment)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const {
        kioskCode = 'VISHNU01',
        token, // session token
        fileName,
        filePath,
        pages,
        copies = 1,
        colour = false,
        doubleSided = false,
        orientation = 'portrait',
        pageRange,
        amountPaise,
        status = 'queued',
        paymentStatus,
        customerPhone = '+917842410691',
        razorpayPaymentId,
      } = body;

      // Fetch kiosk details
      let kioskId = '22222222-2222-2222-2222-222222222221';
      if (isSupabaseConfigured) {
        const { data: kiosk } = await supabaseAdmin
          .from('kiosks')
          .select('id')
          .eq('code', kioskCode)
          .single();
        if (kiosk?.id) kioskId = kiosk.id;
      }

      // Check if session has file buffer and metadata
      let sessionFileBuffer: Buffer | null = null;
      let effectiveFileName = fileName;
      let effectivePages = pages || 1;
      let effectiveFilePath = filePath;
      let sessionId: string | null = null;

      if (token) {
        const { session } = getSessionStatus(token);
        if (session) {
          sessionId = session.id;
          if (session.file) {
            effectiveFileName = effectiveFileName || session.file.name;
            effectivePages = pages || session.file.pages || 1;
            effectiveFilePath = effectiveFilePath || session.file.path;
            if (session.file.buffer) {
              sessionFileBuffer = session.file.buffer;
            }
          }
          if (status === 'queued') {
            updateSessionState(token, 'paid');
          }
        }
      }

      const totalEffectivePages = parsePageRange(pageRange || undefined, effectivePages);
      const sheets = calculateSheets(totalEffectivePages, copies, doubleSided);

      const job = createOrQueueJob({
        sessionId,
        kioskId,
        customerPhone,
        fileName: effectiveFileName || 'document.pdf',
        filePath: effectiveFilePath,
        totalPages: totalEffectivePages,
        copies,
        colour,
        doubleSided,
        orientation,
        pageRange,
        sheets,
        amountPaise: amountPaise || (sheets * 200),
        status: status as any,
        paymentStatus: paymentStatus || (status === 'queued' ? 'paid' : 'unpaid'),
        razorpayPaymentId,
        fileBuffer: sessionFileBuffer,
      });

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          token: job.token_no,
          tokenNo: job.token_no,
          kioskCode,
          fileName: job.file_name,
          pages: job.total_pages,
          copies: job.copies,
          colour: job.colour,
          doubleSided: job.double_sided,
          sheets: job.sheets,
          amountPaise: job.amount_paise,
          amount_paise: job.amount_paise,
          status: job.status,
          paymentStatus: job.payment_status,
        },
      });
    }

    // B. Handle Multipart FormData submission (Direct file upload)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kioskCode = (formData.get('kioskCode') as string | null) || 'VISHNU01';
    const customerPhone = (formData.get('customerPhone') as string | null) || '+917842410691';
    const copies = Math.min(50, Math.max(1, parseInt((formData.get('copies') as string) || '1', 10)));
    const colour = formData.get('colour') === 'true';
    const doubleSided = formData.get('doubleSided') === 'true';
    const pageRange = formData.get('pageRange') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required parameter: file' },
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

    let kioskId = '22222222-2222-2222-2222-222222222221';
    let currentKiosk: any = {
      id: kioskId,
      code: kioskCode,
      name: 'Vishnu College Library',
      supports_colour: true,
      paper_sheets: 450,
      state: 'ok',
      rate_bw: 200,
      rate_colour: 1000,
      double_discount_pct: 10,
    };

    if (isSupabaseConfigured) {
      const { data: kiosk } = await supabaseAdmin
        .from('kiosks')
        .select('*')
        .eq('code', kioskCode)
        .single();
      if (kiosk) {
        currentKiosk = kiosk;
        kioskId = kiosk.id;
      }
    }

    const requiredSheets = calculateSheets(effectivePages, copies, doubleSided);
    const pricing = calculateJobPrice(currentKiosk, {
      pages: effectivePages,
      copies,
      colour,
      double_sided: doubleSided,
    });

    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `jobs/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.storage.from('print-files').upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      } catch (e) {
        console.warn('Supabase storage upload error:', e);
      }
    }

    const job = createOrQueueJob({
      kioskId,
      customerPhone,
      fileName: file.name,
      filePath,
      totalPages: effectivePages,
      copies,
      colour,
      doubleSided,
      pageRange: pageRange || undefined,
      sheets: requiredSheets,
      amountPaise: pricing.totalPaise,
      status: 'awaiting_payment',
      paymentStatus: 'unpaid',
      fileBuffer: buffer,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        kioskCode,
        fileName: file.name,
        pages: effectivePages,
        copies,
        colour,
        doubleSided,
        sheets: requiredSheets,
        amountPaise: pricing.totalPaise,
        totalRupees: pricing.totalRupees,
        status: job.status,
      },
    });
  } catch (error: any) {
    console.error('API /api/jobs Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create print job' }, { status: 500 });
  }
}
