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
    // Lê o corpo da requisição como texto primeiro para evitar erros de JSON.
    const rawBody = await req.text();
    
    // Se o corpo estiver vazio, a requisição é inválida para esta função.
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Request body is empty. Expected a JSON payload." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body.", details: e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url, method, headers, body } = requestBody;

    if (!url || !method) {
      return new Response(JSON.stringify({ error: 'URL and method are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const outgoingHeaders = new Headers(headers || {});
    outgoingHeaders.delete('Content-Length');

    const fetchOptions: RequestInit = {
      method: method,
      headers: outgoingHeaders,
    };

    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    if (methodsWithBody.includes(method.toUpperCase()) && body && Object.keys(body).length > 0) {
      fetchOptions.body = JSON.stringify(body);
      if (!outgoingHeaders.has('Content-Type')) {
        outgoingHeaders.set('Content-Type', 'application/json');
      }
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());

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
    console.error('Edge Function: Uncaught error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});