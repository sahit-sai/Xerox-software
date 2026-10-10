import { NextRequest, NextResponse } from 'next/server';
import { getJobById, getJobFileBuffer } from '@/lib/job';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const job = getJobById(jobId);

    // 1. Check in-memory buffer first
    const memoryBuffer = getJobFileBuffer(jobId);
    if (memoryBuffer) {
      const fileName = job?.file_name || 'document.pdf';
      return new NextResponse(new Uint8Array(memoryBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': memoryBuffer.length.toString(),
        },
      });
    }

    // 2. Check Supabase storage if configured
    if (job?.file_path && isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.storage
        .from('print-files')
        .download(job.file_path);

      if (data && !error) {
        const arrayBuffer = await data.arrayBuffer();
        return new NextResponse(new Uint8Array(arrayBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${job.file_name}"`,
          },
        });
      }
    }

    // 3. Fallback: generate a lightweight valid blank PDF so agent never crashes
    const minimalPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF`;
    const pdfBuf = Buffer.from(minimalPdf);

    return new NextResponse(new Uint8Array(pdfBuf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${job?.file_name || 'print.pdf'}"`,
        'Content-Length': pdfBuf.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('File stream error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
