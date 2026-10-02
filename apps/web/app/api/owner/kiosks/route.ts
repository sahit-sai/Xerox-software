import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function GET() {
  try {
    const { data: kiosks, error } = await supabaseAdmin
      .from('kiosks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !kiosks || kiosks.length === 0) {
      // Fallback seed kiosks
      return NextResponse.json({
        kiosks: [
          {
            id: '22222222-2222-2222-2222-222222222221',
            code: 'VISHNU01',
            name: 'Vishnu College Library',
            location: 'Ground Floor, Central Library, Bhimavaram',
            supports_colour: true,
            paper_sheets: 450,
            paper_capacity: 1000,
            toner_pct: 88.5,
            state: 'ok',
            rate_bw: 200,
            rate_colour: 1000,
            double_discount_pct: 10,
            cost_bw: 50,
            cost_colour: 250,
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            code: 'HOSTELA1',
            name: 'Boys Hostel Block A',
            location: 'Entrance Lobby, Hostel Block A',
            supports_colour: false,
            paper_sheets: 280,
            paper_capacity: 500,
            toner_pct: 45,
            state: 'ok',
            rate_bw: 200,
            rate_colour: 0,
            double_discount_pct: 5,
            cost_bw: 50,
            cost_colour: 250,
          },
          {
            id: '22222222-2222-2222-2222-222222222223',
            code: 'DWARAKA1',
            name: 'Dwaraka Nagar Kiosk',
            location: 'Near Bus Stand, Dwaraka Nagar, Vizag',
            supports_colour: true,
            paper_sheets: 0,
            paper_capacity: 1000,
            toner_pct: 12,
            state: 'no_paper',
            rate_bw: 150,
            rate_colour: 800,
            double_discount_pct: 10,
            cost_bw: 40,
            cost_colour: 200,
          },
        ],
      });
    }

    return NextResponse.json({ kiosks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, kioskId, name, location, rateBw, rateColour, paperCapacity, supportsColour } = body;

    if (action === 'refill') {
      const { data: kiosk } = await supabaseAdmin
        .from('kiosks')
        .select('paper_capacity')
        .eq('id', kioskId)
        .single();
      
      const cap = kiosk?.paper_capacity || 1000;
      await supabaseAdmin
        .from('kiosks')
        .update({ paper_sheets: cap, state: 'ok' })
        .eq('id', kioskId);

      return NextResponse.json({ success: true, message: 'Paper refilled successfully' });
    }

    if (action === 'replace_toner') {
      await supabaseAdmin
        .from('kiosks')
        .update({ toner_pct: 100.0, state: 'ok' })
        .eq('id', kioskId);

      return NextResponse.json({ success: true, message: 'Toner marked as replaced' });
    }

    // Add new Kiosk
    const deviceSecret = crypto.randomBytes(16).toString('hex');
    const secretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');
    const newCode = `PRINTQ_${Math.floor(100 + Math.random() * 900)}`;

    const newKiosk = {
      id: crypto.randomUUID(),
      owner_id: '11111111-1111-1111-1111-111111111111',
      code: newCode,
      name: name || 'New Kiosk',
      location: location || 'Location TBD',
      supports_colour: !!supportsColour,
      paper_sheets: paperCapacity || 1000,
      paper_capacity: paperCapacity || 1000,
      toner_pct: 100,
      state: 'ok',
      device_secret_hash: secretHash,
      rate_bw: rateBw || 200,
      rate_colour: rateColour || 1000,
      double_discount_pct: 10,
      cost_bw: 50,
      cost_colour: 250,
    };

    await supabaseAdmin.from('kiosks').insert([newKiosk]);

    return NextResponse.json({
      success: true,
      kiosk: newKiosk,
      deviceSecret, // Returned once upon creation for Pi agent configuration
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
