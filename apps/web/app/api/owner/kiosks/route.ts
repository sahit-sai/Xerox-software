import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getAllKiosks, refillKioskPaper, replaceKioskToner, KioskRecord } from '@/lib/kiosk';
import { getAllJobs } from '@/lib/job';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memoryKiosks = getAllKiosks();
    const allJobs = getAllJobs();
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate real earnings today per kiosk
    const earningsMap = new Map<string, number>();
    for (const job of allJobs) {
      if ((job.status === 'done' || job.status === 'queued' || job.status === 'printing') && job.created_at.startsWith(todayStr)) {
        const current = earningsMap.get(job.kiosk_id) || 0;
        earningsMap.set(job.kiosk_id, current + job.amount_paise);
      }
    }

    if (isSupabaseConfigured) {
      const { data: kiosks, error } = await supabaseAdmin
        .from('kiosks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && kiosks && kiosks.length > 0) {
        const mapped = kiosks.map((k: any) => {
          const mem = memoryKiosks.find((m) => m.id === k.id || m.code === k.code);
          const earnedPaise = earningsMap.get(k.id) || earningsMap.get(k.code) || 0;
          return {
            ...k,
            paper_sheets: mem ? mem.paper_sheets : k.paper_sheets,
            toner_pct: mem ? mem.toner_pct : k.toner_pct,
            state: mem ? mem.state : k.state,
            last_heartbeat: mem?.last_heartbeat || k.last_heartbeat,
            earnings_today: earnedPaise,
          };
        });
        return NextResponse.json({ kiosks: mapped });
      }
    }

    const result = memoryKiosks.map((k) => {
      const earnedPaise = earningsMap.get(k.id) || earningsMap.get(k.code) || 0;
      return {
        ...k,
        earnings_today: earnedPaise,
      };
    });

    return NextResponse.json({ kiosks: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, kioskId, name, location, rateBw, rateColour, paperCapacity, supportsColour } = body;

    if (action === 'refill') {
      const updated = refillKioskPaper(kioskId);
      return NextResponse.json({ success: true, message: 'Paper refilled successfully', kiosk: updated });
    }

    if (action === 'replace_toner') {
      const updated = replaceKioskToner(kioskId);
      return NextResponse.json({ success: true, message: 'Toner marked as replaced', kiosk: updated });
    }

    // Add new Kiosk
    const deviceSecret = crypto.randomBytes(16).toString('hex');
    const secretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');
    const newCode = `PRINTQ_${Math.floor(100 + Math.random() * 900)}`;

    const newKiosk: KioskRecord = {
      id: crypto.randomUUID(),
      code: newCode,
      name: name || 'New Kiosk',
      location: location || 'Location TBD',
      supports_colour: !!supportsColour,
      paper_sheets: paperCapacity || 1000,
      paper_capacity: paperCapacity || 1000,
      toner_pct: 100,
      state: 'ok',
      rate_bw: rateBw || 200,
      rate_colour: rateColour || 1000,
      double_discount_pct: 10,
      cost_bw: 50,
      cost_colour: 250,
      last_heartbeat: new Date().toISOString(),
      earnings_today: 0,
    };

    if (isSupabaseConfigured) {
      await supabaseAdmin.from('kiosks').insert([{
        id: newKiosk.id,
        owner_id: '11111111-1111-1111-1111-111111111111',
        code: newKiosk.code,
        name: newKiosk.name,
        location: newKiosk.location,
        supports_colour: newKiosk.supports_colour,
        paper_sheets: newKiosk.paper_sheets,
        paper_capacity: newKiosk.paper_capacity,
        toner_pct: newKiosk.toner_pct,
        state: newKiosk.state,
        device_secret_hash: secretHash,
        rate_bw: newKiosk.rate_bw,
        rate_colour: newKiosk.rate_colour,
        double_discount_pct: newKiosk.double_discount_pct,
        cost_bw: newKiosk.cost_bw,
        cost_colour: newKiosk.cost_colour,
      }]);
    }

    return NextResponse.json({
      success: true,
      kiosk: newKiosk,
      deviceSecret,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
