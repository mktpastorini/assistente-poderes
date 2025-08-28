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
    console.log('Edge Function: Incoming request received.');
    const requestBody = await req.json();
    console.log('Edge Function: Parsed request body:', requestBody);

    const { url, method, headers, body } = requestBody;

    if (!url || !method) {
      return new Response(JSON.stringify({ error: 'URL and method are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Headers constructor for safety and standard compliance
    const outgoingHeaders = new Headers(headers || {});

    // Let the fetch implementation handle content-length
    outgoingHeaders.delete('Content-Length');

    const fetchOptions: RequestInit = {
      method: method,
      headers: outgoingHeaders,
    };

    // Only include a body for methods that support it
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    if (methodsWithBody.includes(method.toUpperCase()) && body) {
      fetchOptions.body = JSON.stringify(body);
      // Ensure Content-Type is set if not already present
      if (!outgoingHeaders.has('Content-Type')) {
        outgoingHeaders.set('Content-Type', 'application/json');
      }
    }

    console.log(`Edge Function: Preparing to fetch URL: ${url} with method: ${method}`);
    console.log('Edge Function: Final fetch options:', {
      ...fetchOptions,
      headers: Object.fromEntries(outgoingHeaders.entries()), // Log headers as a plain object
    });

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());

    console.log(`Edge Function: Received response from target. Status: ${response.status}`);

    return new Response(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: responseData,
      headers: responseHeaders,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function: Uncaught error during execution:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});