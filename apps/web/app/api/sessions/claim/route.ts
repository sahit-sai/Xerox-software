import { NextRequest, NextResponse } from 'next/server';
import { claimSessionByToken } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
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
    const body = await req.json();
    const { token, shortCode, deviceId } = body;

    let targetToken = token;

    // If backup 6-char short code was typed, lookup raw token or hash
    if (!targetToken && shortCode) {
      const normalizedCode = shortCode.trim().toUpperCase();
      const { data: sessionData } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('short_code', normalizedCode)
        .eq('state', 'qr_shown')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!sessionData) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired 6-character backup code' },
          { status: 400, headers: corsHeaders }
        );
      }
      targetToken = sessionData.token_hash;
    }

    if (!targetToken) {
      return NextResponse.json({ success: false, error: 'Missing token or shortCode' }, { status: 400, headers: corsHeaders });
    }

    const deviceIdentifier = deviceId || req.headers.get('user-agent') || 'phone_device_' + Date.now();
    const claimResult = await claimSessionByToken(targetToken, deviceIdentifier);

    if (!claimResult.success) {
      if (claimResult.reason === 'already_claimed') {
        return NextResponse.json(
          { success: false, error: 'This QR is already in use — scan the new code on the machine.' },
          { status: 409, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: false, error: 'This QR has expired. Touch the kiosk screen to get a new one.' },
        { status: 410, headers: corsHeaders }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        session: claimResult.session,
      },
      { headers: corsHeaders }
    );

    // Bind session via httpOnly cookie
    response.cookies.set('printq_session_token', targetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Session claim error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
