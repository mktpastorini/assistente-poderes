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


    // Prioriza 'x-vercel-forwarded-for' se disponível (comum em ambientes Vercel)
    const xVercelForwardedFor = headers.get('x-vercel-forwarded-for');
    const cfConnectingIp = headers.get('cf-connecting-ip');
    const xForwardedFor = headers.get('x-forwarded-for');
    const xRealIp = headers.get('x-real-ip');
    const xClientIp = headers.get('x-client-ip');
    const remoteAddr = headers.get('remote-addr');

    if (xVercelForwardedFor) {
      // x-vercel-forwarded-for pode ser uma lista separada por vírgulas, o primeiro é o cliente
      clientIp = xVercelForwardedFor.split(',')[0].trim();
    } else if (cfConnectingIp) {
      // Se não, tenta 'cf-connecting-ip'
      clientIp = cfConnectingIp;
    } else if (xForwardedFor) {
      // Se não, tenta 'x-forwarded-for' e pega o primeiro IP da lista
      clientIp = xForwardedFor.split(',')[0].trim();
    } else if (xRealIp) {
      clientIp = xRealIp;
    } else if (xClientIp) {
      clientIp = xClientIp;
    } else if (remoteAddr) {
      clientIp = remoteAddr;
    } else {
      clientIp = "Unknown";
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