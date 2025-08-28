import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody;
  try {
    console.log('Edge Function: Incoming request method:', req.method);
    console.log('Edge Function: Incoming request headers:', req.headers);

    // Tenta ler o corpo como JSON. Se falhar, tenta como texto para depuração.
    try {
      requestBody = await req.json();
      console.log('Edge Function: Successfully parsed request body as JSON:', requestBody);
    } catch (jsonError) {
      const rawBody = await req.text(); // Tenta ler como texto para depuração
      console.error('Edge Function: Error parsing request body as JSON. Raw body:', rawBody, 'Error:', jsonError);
      // Se o corpo estiver vazio, pode ser um GET sem corpo, o que é normal.
      // Se não estiver vazio e não for JSON, é um erro.
      if (rawBody.trim() !== '') {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body', details: jsonError.message, rawBody }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Se o corpo estiver vazio, assume que não há corpo para processar
      requestBody = {};
    }

    const { url, method, headers, body } = requestBody;

    if (!url || !method) {
      console.error('Edge Function: URL or method missing in request body.');
      return new Response(JSON.stringify({ error: 'URL and method are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers || {},
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log('Edge Function: Making request to target URL:', url);
    console.log('Edge Function: Fetch options:', fetchOptions);

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text(); // Get raw text first

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText; // If not JSON, keep as text
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());

    console.log('Edge Function: Response from target API status:', response.status);
    console.log('Edge Function: Response from target API headers:', responseHeaders);
    console.log('Edge Function: Response from target API data:', responseData);

    return new Response(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: responseData,
      headers: responseHeaders,
    }), {
      status: 200, // Always return 200 for the proxy itself, actual API status is in 'status' field
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function: Uncaught error during execution:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});