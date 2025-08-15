import { NextResponse } from 'next/server';
import { authUrl } from '../../../../lib/withings';
export async function GET(){ return NextResponse.redirect(authUrl()); }
