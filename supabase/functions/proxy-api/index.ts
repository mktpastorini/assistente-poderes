import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { url, method, headers, body } = payload;

    if (!url || !method) {
      throw new Error('URL and method are required in the payload.');
    }

    const outgoingHeaders = new Headers(headers || {});

    // Add a standard User-Agent header to appear as a browser
    if (!outgoingHeaders.has('User-Agent')) {
      outgoingHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    // For GET requests, some servers reject a Content-Type header. Let's remove it.
    if (method.toUpperCase() === 'GET') {
      outgoingHeaders.delete('Content-Type');
    }

    const fetchOptions = {
      method,
      headers: outgoingHeaders,
      // Ensure body is only sent for appropriate methods
      body: (method.toUpperCase() !== 'GET' && body) ? JSON.stringify(body) : undefined,
    };

    console.log(`[Proxy-API] Fetching URL: ${url} with method: ${method}`); // Novo log
    const response = await fetch(url, fetchOptions);
    
    const responseText = await response.text();
    console.log(`[Proxy-API] Raw responseText from ${url}:`, responseText); // Novo log

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.warn(`[Proxy-API] Could not parse response as JSON for ${url}. Treating as plain text. Error: ${e.message}`); // Novo log
      responseData = responseText;
    }

    return new Response(
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Proxy-API] Edge Function Error:', error);
    const isJsonError = error instanceof SyntaxError;
    const status = isJsonError ? 400 : 500;
    const message = isJsonError ? "Invalid JSON payload received from client." : error.message;

    return new Response(
      JSON.stringify({ error: message, stack: error.stack }),
      {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});