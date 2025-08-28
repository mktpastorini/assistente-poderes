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

    const fetchOptions = {
      method,
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, fetchOptions);
    
    // Tenta processar como JSON, mas se falhar, retorna o texto bruto.
    const responseData = await response.json().catch(async () => await response.text());

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
    console.error('Edge Function Error:', error);
    const isJsonError = error instanceof SyntaxError;
    const status = isJsonError ? 400 : 500;
    const message = isJsonError ? "Invalid JSON payload received." : error.message;

    return new Response(
      JSON.stringify({ error: message, stack: error.stack }),
      {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});