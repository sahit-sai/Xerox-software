import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { countDocumentPages } from '@/lib/pdf';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const token = formData.get('token') as string | null || req.cookies.get('printq_session_token')?.value;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25 MB limit' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const totalPages = await countDocumentPages(buffer, file.type || 'application/pdf');

    // Save file to storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      await supabaseAdmin.storage.from('print-files').upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    } catch (e) {
      console.warn('Storage upload warning:', e);
    }

    // Update session state to file_uploaded & file_ready
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await supabaseAdmin
        .from('sessions')
        .update({
          state: 'file_ready',
          updated_at: new Date().toISOString(),
        })
        .or(`token_hash.eq.${tokenHash},id.eq.${token}`);
    }

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        path: filePath,
        pages: totalPages,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error('Session upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
