import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'super-secret-cron-token';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // 1. Detect Offline Kiosks (No heartbeat for > 2 min)
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: offlineKiosks } = await supabaseAdmin
      .from('kiosks')
      .update({ state: 'offline' })
      .lt('last_heartbeat', twoMinAgo)
      .neq('state', 'offline')
      .select('id, code');

    // 2. Clean files older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: oldJobs } = await supabaseAdmin
      .from('jobs')
      .select('id, file_path')
      .lt('created_at', twentyFourHoursAgo);

    let deletedFilesCount = 0;
    if (oldJobs && oldJobs.length > 0) {
      const filePaths = oldJobs.map((j) => j.file_path).filter(Boolean);
      if (filePaths.length > 0) {
        try {
          await supabaseAdmin.storage.from('print-files').remove(filePaths);
          deletedFilesCount = filePaths.length;
        } catch (e) {
          console.warn('Storage cleanup warning:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      offlineKiosksMarked: offlineKiosks?.length || 0,
      oldFilesDeleted: deletedFilesCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
