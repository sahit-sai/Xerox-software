import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/job';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memoryJobs = getAllJobs();

    if (isSupabaseConfigured) {
      const { data: dbJobs, error } = await supabaseAdmin
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && dbJobs && dbJobs.length > 0) {
        // Merge dbJobs with memoryJobs, prioritizing in-memory for active progress
        const memMap = new Map(memoryJobs.map((j) => [j.id, j]));
        const merged = dbJobs.map((dj) => memMap.get(dj.id) || dj);
        // Include any memory-only jobs
        for (const mj of memoryJobs) {
          if (!merged.some((j) => j.id === mj.id)) {
            merged.push(mj);
          }
        }
        return NextResponse.json({
          jobs: merged.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        });
      }
    }

    return NextResponse.json({ jobs: memoryJobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
