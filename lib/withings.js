export const WITHINGS_AUTHORIZE = 'https://account.withings.com/oauth2_user/authorize2';
export const WITHINGS_TOKEN = 'https://wbsapi.withings.net/v2/oauth2';
export const WITHINGS_MEASURE = 'https://wbsapi.withings.net/measure';

export function authUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WITHINGS_CLIENT_ID,
    state: 'xyz',
    scope: 'user.metrics',
    redirect_uri: process.env.WITHINGS_REDIRECT_URI,
  });
  return `${WITHINGS_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: process.env.WITHINGS_CLIENT_ID,
    client_secret: process.env.WITHINGS_CLIENT_SECRET,
    code,
    redirect_uri: process.env.WITHINGS_REDIRECT_URI,
  });
  const res = await fetch(WITHINGS_TOKEN, { method: 'POST', body: params });
  const json = await res.json();
  if (json.status !== 0) throw new Error('Token exchange failed');
  return json.body; // { access_token, refresh_token, expires_in, userid }
}

export async function getMeasures(access_token, meastypes) {
  const params = new URLSearchParams({
    action: 'getmeas',
    access_token,
    category: '1',
    meastypes: meastypes.join(','),
  });
  const res = await fetch(WITHINGS_MEASURE, { method: 'POST', body: params });
  return res.json();
}
