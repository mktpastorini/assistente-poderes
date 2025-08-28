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
    // Diretamente processa o corpo como JSON. Isso irá falhar se o corpo estiver vazio ou não for um JSON válido.
    const requestBody = await req.json();
    const { url, method, headers, body } = requestBody;

    if (!url || !method) {
      return new Response(JSON.stringify({ error: 'URL e método são obrigatórios no payload JSON.' }), {
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
    // Captura erros de parsing ou outros erros inesperados.
    const isJsonError = error instanceof SyntaxError && error.message.includes('JSON');
    const errorMessage = isJsonError ? "O corpo da requisição está vazio ou não é um JSON válido." : error.message;
    
    console.error('Erro na Edge Function:', errorMessage, error.stack);

    return new Response(JSON.stringify({ error: errorMessage, stack: error.stack }), {
      status: isJsonError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});