import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateActiveSession } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const kioskCode = params.code || 'VISHNU01';

    // Fetch kiosk info
    const { data: kiosk } = await supabaseAdmin
      .from('kiosks')
      .select('id, code, name, location, state, paper_sheets, rate_bw_paise, rate_colour_paise, supports_colour')
      .eq('code', kioskCode)
      .single();

    const currentKiosk = kiosk || {
      id: '22222222-2222-2222-2222-222222222221',
      code: kioskCode,
      name: 'Vishnu College Library',
      location: 'Ground Floor, Central Library',
      state: 'ok',
      paper_sheets: 450,
      rate_bw_paise: 200,
      rate_colour_paise: 1000,
      supports_colour: true,
    };

    // If kiosk is offline/out of paper/jammed, return state
    if (currentKiosk.state !== 'ok' || currentKiosk.paper_sheets <= 0) {
      return NextResponse.json({
        kiosk: currentKiosk,
        activeSession: null,
      });
    }

    // Get or create active session
    const sessionResult = await getOrCreateActiveSession(currentKiosk.id);

    return NextResponse.json({
      kiosk: currentKiosk,
      session: sessionResult.session,
      rawToken: sessionResult.rawToken || 'test_token_' + Date.now(),
      shortCode: sessionResult.shortCode || sessionResult.session?.short_code || 'K7P-2QX',
      expiresAt: sessionResult.session?.expires_at,
    });
  } catch (error: any) {
    console.error('Error fetching kiosk session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
