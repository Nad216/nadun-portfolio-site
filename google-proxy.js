// netlify/functions/google-proxy.js
// Proxies all Google Generative Language API calls server-side to avoid CORS.
// Deployed automatically by Netlify — no extra config needed.

export async function handler(event) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-google-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    const { path, apiKey, body: reqBody, method = 'POST' } = JSON.parse(event.body || '{}');

    if (!path) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing path' }) };
    if (!apiKey) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing apiKey' }) };

    // Only allow Google Generative Language API calls
    const allowedBase = 'https://generativelanguage.googleapis.com';
    const url = `${allowedBase}${path}${path.includes('?') ? '&' : '?'}key=${apiKey}`;

    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (reqBody && method !== 'GET') {
      fetchOptions.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
    }

    const resp = await fetch(url, fetchOptions);
    const contentType = resp.headers.get('content-type') || '';

    let responseBody;
    if (contentType.includes('application/json')) {
      responseBody = await resp.text(); // pass through as-is
    } else {
      // Binary (video/image bytes) — base64 encode
      const buffer = await resp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      responseBody = JSON.stringify({ _binary: true, _base64: base64, _contentType: contentType });
    }

    return {
      statusCode: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: responseBody,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
