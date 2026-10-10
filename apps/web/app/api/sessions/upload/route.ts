import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
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
    const contentType = req.headers.get('content-type') || '';
    let fileName = 'Document.pdf';
    let fileSize = 1024;
    let fileType = 'application/pdf';
    let token: string | null = req.cookies.get('printq_session_token')?.value || null;
    let totalPages = 1;
    let buffer: Buffer | null = null;

    let previewUrl: string | undefined = undefined;

    if (contentType.includes('application/json')) {
      const json = await req.json();
      token = json.token || token;
      fileName = json.fileName || json.name || fileName;
      fileSize = json.fileSize || json.size || fileSize;
      fileType = json.fileType || json.type || fileType;
      totalPages = json.clientPages || json.pages || 1;
      previewUrl = json.previewUrl;
      if (json.base64) {
        try {
          const rawBase64 = json.base64.includes(',') ? json.base64.split(',')[1] : json.base64;
          buffer = Buffer.from(rawBase64, 'base64');
        } catch (e) {}
      }
    } else {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch (fdErr) {
        console.warn('FormData parse error, attempting JSON fallback parse:', fdErr);
        return NextResponse.json({ error: 'Invalid form payload' }, { status: 400, headers: corsHeaders });
      }

      const file = formData.get('file') as File | null;
      token = (formData.get('token') as string | null) || token;
      const clientPagesStr = formData.get('clientPages') as string | null;
      const previewUrlStr = formData.get('previewUrl') as string | null;
      if (previewUrlStr) previewUrl = previewUrlStr;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
      }

      fileName = file.name;
      fileSize = file.size;
      fileType = file.type || 'application/pdf';

      if (clientPagesStr) {
        const parsed = parseInt(clientPagesStr, 10);
        if (!isNaN(parsed) && parsed >= 1) totalPages = parsed;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        if (!clientPagesStr) {
          totalPages = await countDocumentPages(buffer, fileType);
        }
      } catch (parseErr) {
        console.warn('Document page count parse warning, defaulting to 1:', parseErr);
      }
    }

    if (fileSize > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25 MB limit' }, { status: 400, headers: corsHeaders });
    }

    // Save file path identifier
    const fileExt = fileName.split('.').pop() || 'pdf';
    const filePath = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Non-blocking background upload to Supabase storage (0ms latency for mobile client)
    if (buffer && isSupabaseConfigured) {
      supabaseAdmin.storage.from('print-files').upload(filePath, buffer, {
        contentType: fileType,
        upsert: true,
      }).then(() => {}, (e) => console.warn('Storage upload background notice:', e));
    }

    const fileDetails = {
      name: fileName,
      path: filePath,
      pages: Math.max(1, totalPages),
      size: fileSize,
      type: fileType,
      previewUrl,
      buffer: buffer || undefined,
    };

    // Update session state with real file details
    if (token) {
      updateSessionFile(token, fileDetails);

      if (isSupabaseConfigured) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        try {
          const dbPromise = supabaseAdmin
            .from('sessions')
            .update({
              state: 'file_ready',
              updated_at: new Date().toISOString(),
            })
            .or(`token_hash.eq.${tokenHash},id.eq.${token}`);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DB update timeout')), 2000)
          );
          await Promise.race([dbPromise, timeoutPromise]);
        } catch (err) {}
      }
    }

    return NextResponse.json(
      {
        success: true,
        file: {
          name: fileDetails.name,
          path: fileDetails.path,
          pages: fileDetails.pages,
          size: fileDetails.size,
          type: fileDetails.type,
          previewUrl: fileDetails.previewUrl,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Session upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500, headers: corsHeaders }
    );
  }
}
