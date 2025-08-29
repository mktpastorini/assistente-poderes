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
    const headers = req.headers;

    // Log all potentially relevant IP headers for debugging
    console.log("[get-client-ip] --- Request Headers for IP Detection ---");
    console.log(`[get-client-ip] cf-connecting-ip: ${headers.get('cf-connecting-ip')}`);
    console.log(`[get-client-ip] x-forwarded-for: ${headers.get('x-forwarded-for')}`);
    console.log(`[get-client-ip] x-real-ip: ${headers.get('x-real-ip')}`);
    console.log(`[get-client-ip] x-client-ip: ${headers.get('x-client-ip')}`);
    console.log(`[get-client-ip] remote-addr: ${headers.get('remote-addr')}`);
    console.log(`[get-client-ip] x-vercel-forwarded-for: ${headers.get('x-vercel-forwarded-for')}`); // Common in Vercel
    console.log(`[get-client-ip] --- End Request Headers ---`);


    // Prioriza 'cf-connecting-ip' se disponível (comum em ambientes Cloudflare)
    const cfConnectingIp = headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else {
      // Se não, tenta 'x-forwarded-for' e pega o primeiro IP da lista
      const xForwardedFor = headers.get('x-forwarded-for');
      if (xForwardedFor) {
        // x-forwarded-for pode ser uma lista separada por vírgulas, o primeiro é o cliente
        clientIp = xForwardedFor.split(',')[0].trim();
      } else {
        // Fallback para outros cabeçalhos, se necessário
        clientIp = headers.get('x-real-ip') || 
                   headers.get('x-client-ip') || 
                   headers.get('remote-addr') || 
                   headers.get('x-vercel-forwarded-for') || // Added Vercel specific header
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