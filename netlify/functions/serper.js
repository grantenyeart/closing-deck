/*  Audit proxy, same site as the deck.
    The browser never sees the Serper key: it calls this function,
    which holds the key in the SERPER_KEY environment variable set
    in the Netlify dashboard. Same origin, so no CORS to configure.  */

const ALLOWED_ENDPOINTS = ['search', 'places', 'maps'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const key = process.env.SERPER_KEY;
  if (!key) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'SERPER_KEY is not set on this site.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: 'Bad JSON' }; }

  const endpoint = String(payload.endpoint || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return { statusCode: 400, body: 'Unsupported endpoint' };
  }

  let r;
  try {
    r = await fetch('https://google.serper.dev/' + endpoint, {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.body || {})
    });
  } catch (e) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not reach Google results.' }) };
  }

  return {
    statusCode: r.status,
    headers: { 'Content-Type': 'application/json' },
    body: await r.text()
  };
};
