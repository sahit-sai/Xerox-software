import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getOrCreateActiveSession } from '@/lib/session';
import { getKioskByCode } from '@/lib/kiosk';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const kioskCode = params.code || 'VISHNU01';
    let currentKiosk: any = getKioskByCode(kioskCode);

    if (isSupabaseConfigured) {
      try {
        const { data: kiosk } = await supabaseAdmin
          .from('kiosks')
          .select('id, code, name, location, state, paper_sheets, toner_pct, rate_bw, rate_colour, supports_colour')
          .eq('code', kioskCode)
          .single();
        if (kiosk) {
          currentKiosk = {
            ...currentKiosk,
            ...kiosk,
            rate_bw_paise: kiosk.rate_bw || currentKiosk?.rate_bw || 200,
            rate_colour_paise: kiosk.rate_colour || currentKiosk?.rate_colour || 1000,
          };
        }
      } catch (e) {}
    }

    if (!currentKiosk) {
      currentKiosk = {
        id: '22222222-2222-2222-2222-222222222221',
        code: kioskCode,
        name: 'Vishnu College Library',
        location: 'Ground Floor, Central Library',
        state: 'ok',
        paper_sheets: 450,
        toner_pct: 90,
        rate_bw_paise: 200,
        rate_colour_paise: 1000,
        supports_colour: true,
      };
    } else {
      if (!currentKiosk.rate_bw_paise) currentKiosk.rate_bw_paise = currentKiosk.rate_bw || 200;
      if (!currentKiosk.rate_colour_paise) currentKiosk.rate_colour_paise = currentKiosk.rate_colour || 1000;
    }

    // If kiosk is offline/out of paper/jammed, return state
    if (currentKiosk.state !== 'ok' || currentKiosk.paper_sheets <= 0) {
      return NextResponse.json({
        kiosk: currentKiosk,
        activeSession: null,
      });
    }

    // Get or create active session
    const sessionResult = await getOrCreateActiveSession(currentKiosk.id, kioskCode);

    return NextResponse.json({
      kiosk: currentKiosk,
      session: sessionResult.session,
      rawToken: sessionResult.rawToken,
      shortCode: sessionResult.shortCode,
      expiresAt: sessionResult.expiresAt,
    });
  } catch (error: any) {
    console.error('Error fetching kiosk session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
