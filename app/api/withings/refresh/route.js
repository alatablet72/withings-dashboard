import { NextResponse } from 'next/server';
import { refreshAccessToken } from '../../../../lib/withings';

export async function POST(req) {
  try {
    const { refresh_token } = await req.json();
    if (!refresh_token) {
      return NextResponse.json({ status: 400, error: 'missing refresh_token' });
    }
    const body = await refreshAccessToken(refresh_token);
    return NextResponse.json({ status: 0, ...body });
  } catch (e) {
    return NextResponse.json({ status: 500, error: 'refresh_failed' });
  }
}
