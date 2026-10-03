import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { countDocumentPages } from '@/lib/pdf';
import { updateSessionFile } from '@/lib/session';
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const token = formData.get('token') as string | null || req.cookies.get('printq_session_token')?.value;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25 MB limit' }, { status: 400, headers: corsHeaders });
    }

    let totalPages = 1;
    let buffer: Buffer | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      totalPages = await countDocumentPages(buffer, file.type || 'application/pdf');
    } catch (parseErr) {
      console.warn('Document page count parse warning, defaulting to 1:', parseErr);
    }

    // Save file to storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    if (buffer) {
      try {
        await supabaseAdmin.storage.from('print-files').upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      } catch (e) {
        console.warn('Storage upload bypass warning:', e);
      }
    }

    const fileDetails = {
      name: file.name,
      path: filePath,
      pages: totalPages,
      size: file.size,
    };

    // Update session state with real file details
    if (token) {
      updateSessionFile(token, fileDetails);

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      try {
        await supabaseAdmin
          .from('sessions')
          .update({
            state: 'file_ready',
            updated_at: new Date().toISOString(),
          })
          .or(`token_hash.eq.${tokenHash},id.eq.${token}`);
      } catch (err) {}
    }

    return NextResponse.json(
      {
        success: true,
        file: fileDetails,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Session upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500, headers: corsHeaders });
  }
}
