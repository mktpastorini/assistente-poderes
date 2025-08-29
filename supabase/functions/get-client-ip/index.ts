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
    let clientIp = "Unknown";

    // Prioriza 'cf-connecting-ip' se disponível (comum em ambientes Cloudflare)
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else {
      // Se não, tenta 'x-forwarded-for' e pega o primeiro IP da lista
      const xForwardedFor = req.headers.get('x-forwarded-for');
      if (xForwardedFor) {
        // x-forwarded-for pode ser uma lista separada por vírgulas, o primeiro é o cliente
        clientIp = xForwardedFor.split(',')[0].trim();
      } else {
        // Fallback para outros cabeçalhos, se necessário
        clientIp = req.headers.get('x-real-ip') || 
                   req.headers.get('x-client-ip') || 
                   req.headers.get('remote-addr') || 
                   "Unknown";
      }
    }

    console.log(`[get-client-ip] Detected Client IP: ${clientIp}`);

    return new Response(
      JSON.stringify({ ip: clientIp }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function Error (get-client-ip):', error);
    return new Response(
      JSON.stringify({ error: error.message, ip: "Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});