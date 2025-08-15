import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '../../../../lib/withings';
export async function GET(req){
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if(!code) return NextResponse.redirect(new URL('/', req.url));
  try{
    const body = await exchangeCodeForToken(code);
    const redirect = new URL('/', req.url);
    redirect.searchParams.set('at', body.access_token);
    redirect.searchParams.set('rt', body.refresh_token);
    return NextResponse.redirect(redirect.toString());
  }catch{
    const err = new URL('/', req.url); err.searchParams.set('error','oauth');
    return NextResponse.redirect(err.toString());
  }
}
