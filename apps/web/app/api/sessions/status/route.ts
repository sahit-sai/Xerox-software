import { NextRequest, NextResponse } from 'next/server';
import { getSessionStatus } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const statusResult = getSessionStatus(token);
    return NextResponse.json(statusResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
